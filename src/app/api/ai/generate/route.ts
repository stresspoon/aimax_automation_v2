import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkUsageLimit, incrementUsage } from '@/lib/usage'

const BodySchema = z.object({
  apiKey: z.string().optional(),
  keyword: z.string().min(1),
  contentType: z.enum(['blog', 'thread']),
  instructions: z.string().min(1),
  generateImages: z.boolean().optional(),
})

function buildPrompt({ keyword, contentType, instructions }: { keyword: string; contentType: 'blog' | 'thread'; instructions: string }) {
  const base = `당신은 한국어 마케팅 카피라이터입니다. 아래 지침을 충실히 따르되, 지나친 과장은 피하고 명확하고 실용적인 톤으로 작성하세요.`
  const task = contentType === 'blog'
    ? `- 형태: 블로그 글(서론/본문/결론, 소제목 포함)
- 분량: 1,000~1,500자
- 키워드: "${keyword}"를 자연스럽게 3~5회 포함
- 마지막에 명확한 CTA 2개 포함`
    : `- 형태: 소셜 스레드(각 항목 1~2문장), 8~12개 항목으로 번호 매기기(1/, 2/, ...)
- 키워드: "${keyword}"를 1~2회 자연스럽게 포함
- 각 항목에 실행 가능한 팁 포함`
  return `${base}

[작성 지침]
${instructions}

[작업 규격]
${task}

[출력 형식]
<title>제목</title>
<body>본문(마크다운 허용)</body>`
}

async function generateImages(apiKey: string, keyword: string, contentType: 'blog' | 'thread', count: number = 2) {
  const imagePrompts = contentType === 'blog' 
    ? [
        `Professional blog header image for "${keyword}", modern minimal design, clean aesthetic`,
        `Infographic or visual explanation about "${keyword}", simple and clear design`
      ]
    : [
        `Social media thread cover image for "${keyword}", eye-catching and trendy`,
        `Visual data or statistics about "${keyword}", modern flat design`
      ]

  const images: string[] = []
  
  for (let i = 0; i < Math.min(count, imagePrompts.length); i++) {
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + encodeURIComponent(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ 
            role: 'user', 
            parts: [{ text: imagePrompts[i] }] 
          }],
          generationConfig: {
            responseMimeType: "image/png"
          }
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        const imageData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
        if (imageData) {
          images.push(`data:image/png;base64,${imageData}`)
        }
      }
    } catch (err) {
      console.error('Image generation error:', err)
    }
  }
  
  return images
}

export async function POST(req: Request) {
  try {
    // 사용 제한 확인
    const usage = await checkUsageLimit('content_generation')
    if (usage.limit !== -1 && usage.remaining <= 0) {
      return NextResponse.json({ 
        error: '무료 체험 횟수를 모두 사용했습니다',
        usage,
        needsUpgrade: true 
      }, { status: 429 })
    }
    
    const json = await req.json()
    const body = BodySchema.parse(json)

    const apiKey = body.apiKey || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI API KEY가 필요합니다.' }, { status: 400 })
    }

    const prompt = buildPrompt({ keyword: body.keyword, contentType: body.contentType, instructions: body.instructions })

    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    })

    if (!res.ok) {
      const t = await res.text().catch(() => '')
      return NextResponse.json({ error: `Gemini error: ${res.status} ${t}` }, { status: 400 })
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') || ''
    if (!text) {
      return NextResponse.json({ error: '응답이 비어 있습니다.' }, { status: 400 })
    }

    // 간단 파서: <title>, <body>
    const titleMatch = text.match(/<title>([\s\S]*?)<\/title>/i)
    const bodyMatch = text.match(/<body>([\s\S]*?)<\/body>/i)
    const title = titleMatch ? titleMatch[1].trim() : '제목'
    const bodyOut = bodyMatch ? bodyMatch[1].trim() : text

    const combined = `제목: ${title}\n\n${bodyOut}`
    
    // Generate images if requested and API key is provided
    let images: string[] = []
    if (body.generateImages && body.apiKey) {
      images = await generateImages(body.apiKey, body.keyword, body.contentType)
    }
    
    // 사용 횟수 증가
    await incrementUsage('content_generation')
    
    // 남은 사용 횟수 확인
    const updatedUsage = await checkUsageLimit('content_generation')
    
    return NextResponse.json({ 
      content: combined, 
      images,
      usage: updatedUsage 
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}



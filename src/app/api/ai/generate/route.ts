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

async function generateImages(keyword: string, contentType: 'blog' | 'thread', count: number = 2) {
  const images: string[] = []
  
  const imagePrompts = contentType === 'blog' 
    ? [
        `Professional blog header image about ${keyword}, clean modern design, high quality, 4K`,
        `Infographic illustration about ${keyword}, minimal flat design, professional`
      ]
    : [
        `Social media cover image about ${keyword}, eye-catching, trending design`,
        `Data visualization about ${keyword}, modern chart design, colorful`
      ]

  // Gemini API 키 확인
  const geminiApiKey = process.env.GEMINI_API_KEY
  
  if (!geminiApiKey) {
    console.log('Gemini API 키가 없어서 플레이스홀더 이미지를 사용합니다')
    // 플레이스홀더 이미지 사용
    for (let i = 0; i < Math.min(count, imagePrompts.length); i++) {
      const width = 800
      const height = 600
      const seed = encodeURIComponent(keyword + i)
      const imageUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`
      images.push(imageUrl)
    }
    return images
  }

  // Gemini 2.0 Flash의 실제 이미지 생성 능력 테스트
  console.log('이미지 생성 시작...')
  
  for (let i = 0; i < Math.min(count, imagePrompts.length); i++) {
    try {
      console.log(`이미지 ${i+1} 생성 중: ${imagePrompts[i]}`)
      
      // Gemini 2.0 Flash 이미지 생성 API 호출
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `Create a detailed image based on this description: ${imagePrompts[i]}. Make it visually appealing and professional.`
            }]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 40,
            topP: 0.95,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      })

      console.log(`이미지 ${i+1} API 응답 상태:`, response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`이미지 ${i+1} 응답 데이터:`, JSON.stringify(data, null, 2))
        
        // Gemini 2.0 Flash 응답 구조 확인
        const candidate = data?.candidates?.[0]
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              // Base64 이미지 데이터를 Data URL로 변환
              const mimeType = part.inlineData.mimeType || 'image/png'
              const imageUrl = `data:${mimeType};base64,${part.inlineData.data}`
              images.push(imageUrl)
              console.log(`이미지 ${i+1} 생성 성공 (${mimeType})`)
              break
            } else if (part.text && part.text.includes('image')) {
              console.log(`이미지 ${i+1} 텍스트 응답:`, part.text)
            }
          }
        }
        
        // 이미지가 생성되지 않았다면 플레이스홀더 사용
        if (images.length <= i) {
          console.log(`이미지 ${i+1} 생성 실패, 플레이스홀더 사용`)
          const width = 800
          const height = 600
          const seed = encodeURIComponent(keyword + i)
          const fallbackUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`
          images.push(fallbackUrl)
        }
      } else {
        const errorText = await response.text()
        console.error(`이미지 ${i+1} API 오류 (${response.status}):`, errorText)
        
        // 실패 시 플레이스홀더 사용
        const width = 800
        const height = 600
        const seed = encodeURIComponent(keyword + i)
        const fallbackUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`
        images.push(fallbackUrl)
      }
    } catch (err) {
      console.error(`이미지 ${i+1} 생성 오류:`, err)
      // 실패 시 플레이스홀더 사용
      const width = 800
      const height = 600
      const seed = encodeURIComponent(keyword + i)
      const fallbackUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`
      images.push(fallbackUrl)
    }
  }
  
  console.log(`이미지 생성 완료. 총 ${images.length}개 이미지 생성됨`)
  
  return images
}

export async function POST(req: Request) {
  try {
    // 사용 제한 확인
    let usage = { limit: 3, used: 0, remaining: 3, feature: 'content_generation' }
    try {
      usage = await checkUsageLimit('content_generation')
      if (usage.limit !== -1 && usage.remaining <= 0) {
        return NextResponse.json({ 
          error: '무료 체험 횟수를 모두 사용했습니다',
          usage,
          needsUpgrade: true 
        }, { status: 429 })
      }
    } catch (usageError) {
      console.error('사용량 확인 오류:', usageError)
      // 사용량 확인 실패 시에도 계속 진행 (기본 제한 적용)
    }
    
    const json = await req.json()
    const body = BodySchema.parse(json)

    const apiKey = body.apiKey || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI API KEY가 필요합니다.' }, { status: 400 })
    }

    const prompt = buildPrompt({ keyword: body.keyword, contentType: body.contentType, instructions: body.instructions })

    // Gemini-2.5-pro 모델을 텍스트 생성에 사용
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192,
        }
      }),
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
    
    // Generate images if requested
    let images: string[] = []
    if (body.generateImages) {
      images = await generateImages(body.keyword, body.contentType)
    }
    
    // 사용 횟수 증가
    try {
      await incrementUsage('content_generation')
    } catch (incError) {
      console.error('사용 횟수 증가 오류:', incError)
    }
    
    // 남은 사용 횟수 확인
    let updatedUsage = usage
    try {
      updatedUsage = await checkUsageLimit('content_generation')
    } catch (checkError) {
      console.error('사용량 재확인 오류:', checkError)
    }
    
    // 활동 로그 기록
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase
          .from('activity_logs')
          .insert({
            user_id: user.id,
            action: '콘텐츠 생성',
            details: {
              keyword: body.keyword,
              contentType: body.contentType,
              hasImages: body.generateImages || false,
              usage: updatedUsage
            }
          })
      }
    } catch (logError) {
      console.error('활동 로그 기록 실패:', logError)
    }
    
    return NextResponse.json({ 
      content: combined, 
      images,
      usage: updatedUsage 
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}



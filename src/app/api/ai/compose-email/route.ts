import { NextResponse } from 'next/server'
import { z } from 'zod'

const BodySchema = z.object({
  apiKey: z.string().optional(),
  candidateInfo: z.object({
    name: z.string(),
    email: z.string(),
    threads: z.number().optional(),
    blog: z.number().optional(),
    instagram: z.number().optional(),
    status: z.enum(['selected', 'notSelected']),
  }),
  emailType: z.enum(['selected', 'notSelected', 'custom']),
  customInstructions: z.string().optional(),
  productInfo: z.string().optional(),
})

function buildEmailPrompt({ 
  candidateInfo, 
  emailType, 
  customInstructions,
  productInfo 
}: { 
  candidateInfo: any
  emailType: 'selected' | 'notSelected' | 'custom'
  customInstructions?: string
  productInfo?: string
}) {
  const basePrompt = `당신은 전문 마케팅 이메일 작성자입니다. 
다음 정보를 바탕으로 개인화된 이메일을 작성해주세요.

[수신자 정보]
- 이름: ${candidateInfo.name}
- 이메일: ${candidateInfo.email}
${candidateInfo.threads ? `- Threads 팔로워: ${candidateInfo.threads}명` : ''}
${candidateInfo.blog ? `- 네이버 블로그 이웃: ${candidateInfo.blog}명` : ''}
${candidateInfo.instagram ? `- Instagram 팔로워: ${candidateInfo.instagram}명` : ''}
- 선정 상태: ${candidateInfo.status === 'selected' ? '선정됨' : '미선정'}

${productInfo ? `[제품/서비스 정보]\n${productInfo}\n` : ''}

[이메일 작성 지침]`

  let instructions = ''
  
  if (emailType === 'selected') {
    instructions = `
- 선정을 축하하는 메시지로 시작
- 리뷰 작성 프로세스 안내
- 제품 발송 정보 요청 (주소, 연락처)
- 예상 일정 안내
- 협력에 대한 감사 표현
- 친근하고 전문적인 톤 유지`
  } else if (emailType === 'notSelected') {
    instructions = `
- 지원에 대한 감사 표현
- 아쉬움을 정중하게 전달
- 향후 기회 가능성 언급
- 다른 혜택이나 프로모션 안내 (있다면)
- 긍정적이고 격려하는 톤 유지`
  } else if (customInstructions) {
    instructions = customInstructions
  }

  return `${basePrompt}
${instructions}

[출력 형식]
<subject>이메일 제목</subject>
<body>
이메일 본문 (HTML 포맷)
- <p> 태그로 단락 구분
- 중요한 부분은 <strong> 태그 사용
- 리스트는 <ul>, <li> 태그 사용
- 개인화 요소 포함 (수신자 이름 사용)
- 서명 포함
</body>`
}

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const body = BodySchema.parse(json)

    const apiKey = body.apiKey || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI API KEY가 필요합니다.' }, { status: 400 })
    }

    const prompt = buildEmailPrompt({
      candidateInfo: body.candidateInfo,
      emailType: body.emailType,
      customInstructions: body.customInstructions,
      productInfo: body.productInfo,
    })

    // Use Gemini 2.5 Pro for better quality
    const model = 'gemini-2.0-flash-exp' // Using 2.0 Flash as 2.5 Pro may not be available yet
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ 
          role: 'user', 
          parts: [{ text: prompt }] 
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
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

    // Parse response
    const subjectMatch = text.match(/<subject>([\s\S]*?)<\/subject>/i)
    const bodyMatch = text.match(/<body>([\s\S]*?)<\/body>/i)
    
    const subject = subjectMatch ? subjectMatch[1].trim() : '안녕하세요, {이름}님'
    const emailBody = bodyMatch ? bodyMatch[1].trim() : text

    // Add template variables for personalization
    const finalSubject = subject.includes('{이름}') ? subject : subject.replace(body.candidateInfo.name, '{이름}')
    const finalBody = emailBody.includes('{이름}') ? emailBody : emailBody.replace(new RegExp(body.candidateInfo.name, 'g'), '{이름}')
    
    return NextResponse.json({ 
      subject: finalSubject,
      body: finalBody,
      preview: {
        subject: subject,
        body: emailBody
      }
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
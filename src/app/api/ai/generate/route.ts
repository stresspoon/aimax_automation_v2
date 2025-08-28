import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkUsageLimit, incrementUsage } from '@/lib/usage'
import { contentGuidelines } from '@/lib/contentGuidelines'
import OpenAI from 'openai'

const BodySchema = z.object({
  keyword: z.string().min(1),
  contentType: z.enum(['blog', 'thread']),
  instructions: z.string().min(1),
  generateImages: z.boolean().optional(),
})

function buildPrompt({ keyword, contentType, instructions }: { keyword: string; contentType: 'blog' | 'thread'; instructions: string }) {
  // instructions에서 정보성/판매성 구분
  const isInformative = instructions.includes('정보') || instructions.includes('가이드') || instructions.includes('설명')
  const guidanceType = isInformative ? 'informative' : 'sales'
  
  // contentGuidelines에서 적절한 가이드라인 선택
  const baseGuideline = contentGuidelines[contentType][guidanceType]
  
  return `${baseGuideline}

[핵심 키워드]
${keyword}

[작성 지침]
${instructions}

[출력 형식]
제목: [여기에 제목 작성]

[본문 시작]
여기에 일반 텍스트 형식으로 본문을 작성하세요.
소제목은 줄바꿈 후 명확히 구분해주세요.
마크다운 기호(#, *, -, \`\`\` 등)는 사용하지 마세요.
불릿포인트는 • 또는 - 기호를 사용하세요.
[본문 끝]

중요: 마크다운 형식이 아닌 일반 텍스트로 작성하세요.`
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

// OpenAI Chat Completions 응답에서 텍스트를 안전하게 추출
function extractTextFromMessage(message: any): string {
  if (!message) return ''
  const content = (message as any).content
  if (typeof content === 'string') {
    return content.trim()
  }
  if (Array.isArray(content)) {
    try {
      const joined = content
        .map((part: any) => {
          if (!part) return ''
          if (typeof part === 'string') return part
          if (typeof part.text === 'string') return part.text
          return ''
        })
        .filter(Boolean)
        .join('\n')
        .trim()
      return joined
    } catch {
      return ''
    }
  }
  return ''
}

export async function POST(req: Request) {
  const startTime = Date.now()
  console.log('[Generate API] 요청 시작:', new Date().toISOString())
  
  try {
    // 사용 제한 확인
    let usage = { limit: 3, used: 0, remaining: 3, feature: 'content_generation' }
    try {
      const usageStartTime = Date.now()
      usage = await checkUsageLimit('content_generation')
      console.log('[Generate API] 사용량 확인 소요 시간:', Date.now() - usageStartTime, 'ms')
      
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
    console.log('[Generate API] 요청 파라미터:', {
      keyword: body.keyword,
      contentType: body.contentType,
      generateImages: body.generateImages,
      instructionsLength: body.instructions?.length
    })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API KEY가 설정되지 않았습니다.' }, { status: 400 })
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    })

    const prompt = buildPrompt({ keyword: body.keyword, contentType: body.contentType, instructions: body.instructions })

    // 데이터베이스에서 모델 설정 확인, 없으면 환경 변수 사용
    let model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: setting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'openai_model')
        .single()
      
      if (setting?.value) {
        model = setting.value
      }
    } catch (error) {
      // 설정을 가져오지 못하면 기본값 사용
      console.log('모델 설정 로드 실패, 기본값 사용:', model)
    }
    
    let text = ''
    
    try {
      console.log('[Generate API] OpenAI API 호출 시작 (모델: ' + model + ')')
      const openaiStartTime = Date.now()
      
      // OpenAI Chat Completions API 사용 (타임아웃 설정)
      const controller = new AbortController()
      // 블로그는 60초, 기타는 30초 타임아웃
      const timeoutMs = body.contentType === 'blog' ? 60000 : 30000
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      
      const tokensParam = body.contentType === 'blog' ? 3000 : body.contentType === 'thread' ? 800 : 500

      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: '당신은 한국어 마케팅 카피라이터입니다. 주어진 지침에 따라 고품질의 마케팅 콘텐츠를 작성해주세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        // gpt-5 계열은 temperature 커스텀 미지원 → 생략(기본값 1)
        ...(model.startsWith('gpt-5') ? {} : { temperature: 0.7 }),
        // gpt-5 계열: max_tokens 대신 max_completion_tokens 사용
        // thread는 800 토큰으로 증가
        ...(model.startsWith('gpt-5') ? 
          { max_completion_tokens: tokensParam } : 
          { max_tokens: tokensParam }),
      }, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log('[Generate API] OpenAI API 응답 소요 시간:', Date.now() - openaiStartTime, 'ms')

      const primaryMessage = response.choices?.[0]?.message
      text = extractTextFromMessage(primaryMessage)
    } catch (error: any) {
      // gpt-5-mini 모델 오류 또는 타임아웃 시 폴백
      console.error('[Generate API] 1차 시도 실패:', error.message)
      
      if (error.message?.includes('timeout') || error.message?.includes('abort')) {
        return NextResponse.json({ error: '요청 시간이 초과되었습니다. 더 짧은 콘텐츠로 다시 시도해주세요.' }, { status: 408 })
      }
      
      // 모델 오류 시 gpt-4o-mini로 재시도
      if (model.includes('gpt-5')) {
        try {
          console.log('[Generate API] gpt-4o-mini로 폴백 시도')
          const fallbackModel = 'gpt-4o-mini'
          const tokensParam = body.contentType === 'blog' ? 3000 : body.contentType === 'thread' ? 800 : 500
          
          const retryResponse = await openai.chat.completions.create({
            model: fallbackModel,
            messages: [
              { role: 'system', content: '당신은 한국어 마케팅 카피라이터입니다. 주어진 지침에 따라 고품질의 마케팅 콘텐츠를 작성해주세요.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: tokensParam,
          })
          
          const retryMessage = retryResponse.choices?.[0]?.message
          text = extractTextFromMessage(retryMessage)
        } catch (fallbackError) {
          console.error('[Generate API] 폴백도 실패:', fallbackError)
          throw fallbackError
        }
      } else {
        throw error
      }
    }
    
    // 텍스트가 여전히 비어있는 경우 추가 폴백
    if (!text) {
        try {
          const fallbackModel = 'gpt-4o-mini'
          const fallbackTokens = body.contentType === 'blog' ? 3000 : body.contentType === 'thread' ? 800 : 500
          console.warn('[Generate API] 빈 응답 감지, 폴백 모델로 재시도:', fallbackModel)
          const retry = await openai.chat.completions.create({
            model: fallbackModel,
            messages: [
              { role: 'system', content: '당신은 한국어 마케팅 카피라이터입니다. 주어진 지침에 따라 고품질의 마케팅 콘텐츠를 작성해주세요.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: fallbackTokens,
          })
          const retryMessage = retry.choices?.[0]?.message
          text = extractTextFromMessage(retryMessage)
        } catch (fallbackErr) {
          console.error('[Generate API] 폴백 모델 재시도 실패:', fallbackErr)
        }
      }

      if (!text) {
        return NextResponse.json({ error: '응답이 비어 있습니다. 잠시 후 다시 시도해주세요.' }, { status: 400 })
      }

    // 일반 텍스트 형식 파싱
    let title = ''
    let bodyContent = ''

    // "제목:" 으로 시작하는 부분 찾기
    const titleMatch = text.match(/제목:\s*(.+?)(?:\n|$)/i)
    if (titleMatch) {
      title = titleMatch[1].trim()
    }

    // [본문 시작]과 [본문 끝] 사이의 내용 추출
    const bodyStartMatch = text.match(/\[본문 시작\]([\s\S]*?)\[본문 끝\]/i)
    if (bodyStartMatch) {
      bodyContent = bodyStartMatch[1].trim()
    } else {
      // 본문 태그가 없는 경우, 제목 이후 전체를 본문으로 처리
      const titleEndIndex = text.indexOf('\n', text.indexOf('제목:'))
      if (titleEndIndex > -1) {
        bodyContent = text.substring(titleEndIndex).trim()
      } else {
        // 구형 형식(<title>, <body>) 처리
        const oldTitleMatch = text.match(/<title>([\s\S]*?)<\/title>/i)
        const oldBodyMatch = text.match(/<body>([\s\S]*?)<\/body>/i)
        if (oldTitleMatch && oldBodyMatch) {
          title = oldTitleMatch[1].trim()
          bodyContent = oldBodyMatch[1].trim()
        } else {
          bodyContent = text
        }
      }
    }

    // 불필요한 마크다운 기호 제거 (혹시 남아있을 경우를 대비)
    bodyContent = bodyContent
      .replace(/#{1,6}\s/g, '')  // 마크다운 헤더 제거
      .replace(/\*\*(.+?)\*\*/g, '$1')  // 굵은 글씨 마크다운 제거
      .replace(/\*(.+?)\*/g, '$1')  // 이탤릭 마크다운 제거
      .replace(/```[\s\S]*?```/g, '')  // 코드 블록 제거

    // 최종 콘텐츠 조합
    const combined = title ? `제목: ${title}\n\n${bodyContent}` : bodyContent
    
    // Generate images if requested
    let images: string[] = []
    if (body.generateImages) {
      console.log('[Generate API] 이미지 생성 시작')
      const imageStartTime = Date.now()
      images = await generateImages(body.keyword, body.contentType)
      console.log('[Generate API] 이미지 생성 소요 시간:', Date.now() - imageStartTime, 'ms')
    } else {
      console.log('[Generate API] 이미지 생성 건너뜀 (generateImages: false)')
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
    
    const totalTime = Date.now() - startTime
    console.log('[Generate API] 전체 처리 시간:', totalTime, 'ms')
    console.log('[Generate API] 응답 완료:', new Date().toISOString())
    
    return NextResponse.json({ 
      content: combined, 
      images,
      usage: updatedUsage 
    })
    } catch (openaiError) {
      console.error('OpenAI API 오류:', openaiError)
      return NextResponse.json({ 
        error: openaiError instanceof Error ? openaiError.message : 'OpenAI API 오류가 발생했습니다.' 
      }, { status: 400 })
    }
  } catch (err) {
    console.error('요청 처리 오류:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}



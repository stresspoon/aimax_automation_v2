import { NextResponse } from 'next/server'
import OpenAI from 'openai'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const SYSTEM_PROMPT = `당신은 AIMAX의 제품 상담 챗봇입니다.
- 한국어로 간결하고 정확하게 답변합니다.
- 오직 AIMAX 관련 질문(제품 기능, 가격, 고객모집 자동화 흐름, 자체 폼, Gmail 연동, 결제(토스), 보안/정책, 문제 해결)에만 답변합니다.
- AIMAX와 무관한 주제(프로그래밍 일반, 시사/상식 등)에는 답하지 말고 "AIMAX 관련 질문에만 답변드립니다"라고 안내합니다.
- 단계형 안내는 1) 2) 3) 또는 • 불릿으로 짧게 정리합니다.
- 계정 확인이나 개인 정보가 필요한 요청은 support@aimax.com 또는 카카오 채널로 연결하도록 제안합니다.
- 답변은 최대 6줄로 제한합니다.`

export async function POST(req: Request) {
  try {
    const { message, history }: { message?: string; history?: ChatMessage[] } = await req.json()
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: '챗봇 설정이 완료되지 않았습니다.' }, { status: 503 })
    }

    const openai = new OpenAI({ apiKey })
    // 챗봇은 gpt-5-nano 사용
    const model = 'gpt-5-nano'

    const lastTurns: ChatMessage[] = Array.isArray(history)
      ? history.slice(-10)
      : []

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...lastTurns.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message.trim() },
    ]

    try {
      const resp = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 400,
      })
      const text = resp.choices?.[0]?.message?.content?.trim() || '도움을 드릴 수 있도록 조금만 더 구체적으로 알려주세요.'
      return NextResponse.json({ reply: text })
    } catch (err: any) {
      // 모델 오류 시 폴백 시도
      try {
        const fallbackModel = 'gpt-4o-mini'
        if (model !== fallbackModel) {
          const resp = await openai.chat.completions.create({
            model: fallbackModel,
            messages,
            temperature: 0.4,
            max_tokens: 400,
          })
          const text = resp.choices?.[0]?.message?.content?.trim() || '도움을 드릴 수 있도록 조금만 더 구체적으로 알려주세요.'
          return NextResponse.json({ reply: text })
        }
        throw err
      } catch (finalErr: any) {
        console.error('[Chat API] OpenAI error:', finalErr?.message || finalErr)
        return NextResponse.json({
          reply: '잠시 문제가 발생했습니다. support@aimax.com으로 문의 주시면 빠르게 도와드릴게요.'
        })
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: '요청을 처리할 수 없습니다.' }, { status: 400 })
  }
}

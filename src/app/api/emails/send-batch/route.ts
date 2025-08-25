import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/sender'

const CandidateSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  threads: z.number().optional(),
  blog: z.number().optional(),
  instagram: z.number().optional(),
  status: z.enum(['selected', 'notSelected']),
})

const BodySchema = z.object({
  candidates: z.array(CandidateSchema),
  subject: z.string().min(1),
  body: z.string().min(1),
  targetType: z.enum(['selected', 'notSelected', 'all']),
  projectId: z.string().optional(),
})

// 템플릿 변수 치환
function personalizeContent(template: string, data: Record<string, any>): string {
  let result = template
  
  // {변수명} 형식을 실제 값으로 치환 - 대소문자 구분 없이 처리
  Object.keys(data).forEach(key => {
    // {key} 형식과 (key) 형식 모두 지원
    const regex1 = new RegExp(`\\{${key}\\}`, 'gi')
    const regex2 = new RegExp(`\\(${key}\\)`, 'gi')
    result = result.replace(regex1, String(data[key] || ''))
    result = result.replace(regex2, String(data[key] || ''))
  })
  
  return result
}

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const body = BodySchema.parse(json)
    
    // 대상 필터링
    let targets = body.candidates
    if (body.targetType === 'selected') {
      targets = targets.filter(c => c.status === 'selected')
    } else if (body.targetType === 'notSelected') {
      targets = targets.filter(c => c.status === 'notSelected')
    }
    
    if (targets.length === 0) {
      return NextResponse.json({ 
        error: '발송 대상이 없습니다',
        sent: 0,
      }, { status: 400 })
    }
    
    // 발송 로그 준비
    const sentLogs: Array<{
      email: string
      name: string
      status: 'success' | 'failed'
      error?: string
      sentAt: string
    }> = []
    
    // 개별 발송 (레이트 리밋 고려)
    const BATCH_SIZE = 5 // 한 번에 5개씩
    const DELAY_MS = 1000 // 1초 대기
    
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE)
      
      await Promise.all(
        batch.map(async (candidate) => {
          try {
            // 개인화 변수 준비
            const variables = {
              이름: candidate.name,
              name: candidate.name,
              이메일: candidate.email,
              email: candidate.email,
              전화번호: candidate.phone || '',
              phone: candidate.phone || '',
              threads: String(candidate.threads || 0),
              blog: String(candidate.blog || 0),
              instagram: String(candidate.instagram || 0),
              상태: candidate.status === 'selected' ? '선정' : '미달',
              status: candidate.status,
            }
            
            // 제목과 본문 개인화
            const personalizedSubject = personalizeContent(body.subject, variables)
            const personalizedBody = personalizeContent(body.body, variables)
            
            // HTML 포맷팅: 줄바꿈을 <br>로 변환하고 연속된 공백 보존
            const htmlBody = personalizedBody
              .split('\n')
              .map(line => line || '&nbsp;') // 빈 줄도 보존
              .join('<br>')
              .replace(/  /g, '&nbsp;&nbsp;') // 연속된 공백도 보존
            
            // 이메일 발송
            const result = await sendEmail({
              to: candidate.email,
              templateId: 'generic',
              payload: {
                subject: personalizedSubject,
                html: `<div style="white-space: pre-wrap;">${htmlBody}</div>`,
                text: personalizedBody,
              },
            })
            
            sentLogs.push({
              email: candidate.email,
              name: candidate.name,
              status: result.ok ? 'success' : 'failed',
              error: result.error,
              sentAt: new Date().toISOString(),
            })
          } catch (err) {
            sentLogs.push({
              email: candidate.email,
              name: candidate.name,
              status: 'failed',
              error: (err as Error).message,
              sentAt: new Date().toISOString(),
            })
          }
        })
      )
      
      // 다음 배치 전 대기 (마지막 배치 제외)
      if (i + BATCH_SIZE < targets.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS))
      }
    }
    
    // 프로젝트에 발송 로그 저장
    if (body.projectId) {
      try {
        const supabase = await createClient()
        const { data: project } = await supabase
          .from('projects')
          .select('data')
          .eq('id', body.projectId)
          .single()
        
        const currentData = project?.data || {}
        const emailLogs = currentData.emailLogs || []
        emailLogs.push({
          sentAt: new Date().toISOString(),
          targetType: body.targetType,
          subject: body.subject,
          logs: sentLogs,
        })
        
        await supabase
          .from('projects')
          .update({ 
            data: { 
              ...currentData, 
              emailLogs,
              lastEmailSentAt: new Date().toISOString(),
            } 
          })
          .eq('id', body.projectId)
      } catch (err) {
        console.error('Failed to save email logs:', err)
      }
    }
    
    const successCount = sentLogs.filter(l => l.status === 'success').length
    const failedCount = sentLogs.filter(l => l.status === 'failed').length
    
    return NextResponse.json({
      message: `발송 완료: 성공 ${successCount}명, 실패 ${failedCount}명`,
      sent: successCount,
      failed: failedCount,
      logs: sentLogs,
    })
  } catch (err) {
    return NextResponse.json({ 
      error: (err as Error).message 
    }, { status: 400 })
  }
}
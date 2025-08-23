import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 프로젝트 생성 시 자동으로 Make.com 웹훅 정보 저장
export async function POST(req: Request) {
  try {
    const { projectId, sheetUrl, formUrl } = await req.json()
    
    const supabase = await createClient()
    
    // 프로젝트에 웹훅 설정 정보 저장
    const { data: project } = await supabase
      .from('projects')
      .select('data')
      .eq('id', projectId)
      .single()
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // 웹훅 URL 생성 (프로젝트별 고유)
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/make/${projectId}`
    
    // Make.com 시나리오 자동 생성을 위한 템플릿
    const makeScenarioTemplate = {
      name: `AIMAX 자동화 - ${projectId}`,
      trigger: {
        type: 'google_sheets',
        action: 'watch_new_rows',
        spreadsheet_url: sheetUrl
      },
      webhook: {
        url: webhookUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    }
    
    // 프로젝트 업데이트
    await supabase
      .from('projects')
      .update({
        data: {
          ...project.data,
          step2: {
            ...project.data.step2,
            sheetUrl,
            formUrl,
            webhookUrl,
            webhookEnabled: false, // Make.com 설정 후 true로 변경
            makeTemplate: makeScenarioTemplate,
            setupInstructions: {
              step1: 'Make.com에 로그인',
              step2: '새 시나리오 생성',
              step3: `웹훅 URL: ${webhookUrl}`,
              step4: 'Google Sheets 연결',
              step5: '활성화'
            }
          }
        }
      })
      .eq('id', projectId)
    
    return NextResponse.json({
      success: true,
      webhookUrl,
      makeTemplate: makeScenarioTemplate,
      message: 'Make.com 설정 정보가 생성되었습니다'
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}

// GET: 웹훅 설정 상태 확인
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }
  
  try {
    const supabase = await createClient()
    const { data: project } = await supabase
      .from('projects')
      .select('data')
      .eq('id', projectId)
      .single()
    
    if (!project?.data?.step2?.webhookUrl) {
      return NextResponse.json({ 
        configured: false,
        message: 'Webhook not configured' 
      })
    }
    
    return NextResponse.json({
      configured: true,
      webhookUrl: project.data.step2.webhookUrl,
      enabled: project.data.step2.webhookEnabled || false,
      lastWebhookAt: project.data.step2.lastWebhookAt,
      formUrl: project.data.step2.formUrl
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUsageLimit, assertWriteQuota, logUsage } from '@/lib/usage'
import { ok, created, badRequest, unauthorized, notFound, serverError, forbidden } from '@/lib/http'
import { ProjectCreateSchema, ProjectListQuerySchema } from './schema'


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const parsed = ProjectListQuerySchema.safeParse({
      campaign_id: searchParams.get('campaign_id') || undefined,
      type: (searchParams.get('type') as any) || undefined
    })
    if (!parsed.success) {
      return badRequest('Invalid query', parsed.error.flatten())
    }
    const { campaign_id, type } = parsed.data
    
    let query = supabase
      .from('projects')
      .select('*, campaigns(name, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data: projects, error } = await query
    if (error) {
      return badRequest(error.message)
    }
    return ok(projects)
  } catch {
    return serverError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return unauthorized()
    }

    const body = await request.json()
    const parsed = ProjectCreateSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid payload', parsed.error.flatten())
    }
    const { campaign_id, type, step, data } = parsed.data

    // Verify campaign belongs to user
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single()

    if (!campaign) {
      return notFound('Campaign not found or unauthorized')
    }

    // 무료 플랜이면 기존 동일 type/campaign 조합 프로젝트가 있으면 재사용 (200)
    try {
      const usage = await checkUsageLimit('project_create')
      if (usage.limit !== -1 && usage.remaining <= 0) {
        const { data: existing } = await supabase
          .from('projects')
          .select('id')
          .eq('campaign_id', campaign_id)
          .eq('user_id', user.id)
          .eq('type', type)
          .single()
        if (existing?.id) {
          return ok({ reusedProjectId: existing.id })
        }
        // 사용 불가 + 기존 없음이면 한도 초과 응답
        return forbidden('프로젝트 생성 한도를 초과했습니다. 플랜을 업그레이드 해주세요.')
      }
    } catch (limitErr) {
      // 한도 확인 실패 시 계속 진행 (보수적)
    }

    // 기존 프로젝트 있는지 확인
    const { data: existing } = await supabase
      .from('projects')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('user_id', user.id)
      .eq('type', type)
      .single()

    let project
    if (existing) {
      // Update existing project (세션 RLS로 user_id 스코프 유지)
      const { data: updated, error } = await supabase
        .from('projects')
        .update({
          step,
          data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) {
        return badRequest(error.message)
      }
      project = updated
    } else {
      // 새 프로젝트 생성 (반드시 세션 기반 클라이언트로 user_id=user.id 지정)
      await assertWriteQuota('project_create')

      const { data: created, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          campaign_id,
          type,
          step,
          data
        })
        .select()
        .single()
      
      if (error) {
        return badRequest(error.message)
      }
      project = created

      // usage_logs 기록 (성공 직후)
      await logUsage('project_create', { campaign_id, type })
    }

    return existing ? ok(project) : created(project)
  } catch {
    return serverError()
  }
}

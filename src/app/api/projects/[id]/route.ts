import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ok, badRequest, unauthorized, notFound, serverError } from '@/lib/http'
import { ProjectUpdateSchema } from '../schema'


export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return unauthorized()
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('id, campaign_id, type, step, status, campaign_name, leads_count, emails_sent, content_count, data, created_at, updated_at, campaigns(name, status)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !project) {
      return notFound('Project not found')
    }

    return ok(project)
  } catch {
    return serverError()
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return unauthorized()
    }

    const body = await request.json()
    const parsed = ProjectUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid payload', parsed.error.flatten())
    }

    const { data: project, error } = await supabase
      .from('projects')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return badRequest(error.message)
    }

    if (!project) {
      return notFound('Project not found')
    }

    return ok(project)
  } catch {
    return serverError()
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return unauthorized()
    }

    // 0. 프로젝트 정보 먼저 가져오기 (캠페인 ID 확인용)
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('campaign_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !project) {
      return notFound('Project not found')
    }

    // 1. Service Role Client 생성 (RLS 우회용)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()

    // 2. 관련된 emails_sent 기록들을 삭제
    // project_id가 NOT NULL 제약조건이 있으므로 삭제해야 함
    const { error: unlinkError } = await adminSupabase
      .from('emails_sent')
      .delete()
      .eq('project_id', id)

    if (unlinkError) {
      console.error('Failed to delete related emails:', unlinkError)
      return badRequest('Failed to cleanup related constraints: ' + unlinkError.message)
    }

    // 3. 프로젝트 삭제
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return badRequest(error.message)
    }

    // 4. 캠페인이 비었는지 확인하고 비었으면 삭제
    if (project.campaign_id) {
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', project.campaign_id)

      if (count === 0) {
        await supabase
          .from('campaigns')
          .delete()
          .eq('id', project.campaign_id)
      }
    }

    // 삭제 후에도 무료 플랜 재생성은 금지되도록 플래그는 유지
    return ok({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Project delete error:', error)
    return serverError()
  }
}

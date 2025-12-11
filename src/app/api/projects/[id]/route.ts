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
      .select('*, campaigns(name, status)')
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

    // 1. Service Role Client 생성 (RLS 우회용)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()

    // 2. 관련된 emails_sent 기록들의 project_id를 NULL로 업데이트
    // 사용자는 자신의 emails_sent를 수정할 권한(RLS)이 없을 수 있으므로 admin 권한으로 처리
    const { error: unlinkError } = await adminSupabase
      .from('emails_sent')
      .update({ project_id: null })
      .eq('project_id', id)

    if (unlinkError) {
      // 로그만 남기고 진행할지, 에러를 리턴할지 결정. 
      // 데이터 무결성을 위해 일단 에러가 나면 중단하지 않고 진행하거나, 
      // 만약 FK 제약조건 때문에 삭제가 안되는 것이 확실하다면 여기서 에러를 내는게 맞음.
      // 하지만 "삭제가 안되는" 상황을 해결하는 것이므로, 여기서 실패하면 뒤의 delete도 실패할 확률 100%.
      console.error('Failed to unlink emails:', unlinkError)
      return badRequest('Failed to cleanup related constraints: ' + unlinkError.message)
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return badRequest(error.message)
    }

    // 삭제 후에도 무료 플랜 재생성은 금지되도록 플래그는 유지
    return ok({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Project delete error:', error)
    return serverError()
  }
}

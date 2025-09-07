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
  } catch {
    return serverError()
  }
}

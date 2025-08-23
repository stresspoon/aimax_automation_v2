import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get all forms for user
  const { data: forms } = await supabase
    .from('forms')
    .select('*')
    .eq('user_id', user.id)
  
  // Get all responses
  const { data: responses } = await supabase
    .from('form_responses_temp')
    .select('*')
  
  // Get responses grouped by form_id
  const responsesByForm: Record<string, any[]> = {}
  responses?.forEach(r => {
    if (!responsesByForm[r.form_id]) {
      responsesByForm[r.form_id] = []
    }
    responsesByForm[r.form_id].push({
      id: r.id,
      name: r.name,
      email: r.email,
      created_at: r.created_at
    })
  })
  
  return NextResponse.json({
    projectId,
    forms: forms?.map(f => ({
      id: f.id,
      project_id: f.project_id,
      title: f.title,
      slug: f.slug,
      responseCount: responsesByForm[f.id]?.length || 0
    })),
    responsesByForm,
    totalResponses: responses?.length || 0
  })
}
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { projectId, slug } = await req.json()
    if (!projectId || !slug) {
      return NextResponse.json({ error: 'projectId and slug are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find form by slug
    const { data: form, error: findErr } = await supabase
      .from('forms')
      .select('*')
      .eq('slug', slug)
      .single()
    if (findErr || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Ownership check
    if (form.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: not owner of form' }, { status: 403 })
    }

    // Update form.project_id
    const { data: updated, error: updErr } = await supabase
      .from('forms')
      .update({ project_id: projectId })
      .eq('id', form.id)
      .select()
      .single()
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Update project data.step2.formUrl if missing
    const { data: project } = await supabase
      .from('projects')
      .select('data')
      .eq('id', projectId)
      .single()

    if (project?.data) {
      const hasUrl = !!project.data?.step2?.formUrl
      if (!hasUrl) {
        const mergedData = {
          ...project.data,
          step2: {
            ...(project.data.step2 || {}),
            formId: updated.id,
            formUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/form/${updated.slug}`,
          },
        }
        await supabase
          .from('projects')
          .update({ data: mergedData })
          .eq('id', projectId)
      }
    }

    return NextResponse.json({ success: true, form: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'link attach failed' }, { status: 500 })
  }
}

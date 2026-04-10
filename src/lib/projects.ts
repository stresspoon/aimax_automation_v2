import { createClient } from '@/lib/supabase/client'
import { fetchJSON } from '@/lib/httpClient'

export interface ProjectData {
  step1: {
    keyword: string
    productDescription: string
    contentType: 'blog' | 'thread'
    contentPurpose: 'informative' | 'sales'
    instructions: string
    generatedContent: string
    generatedImages: string[]
  }
  step2: {
    formId?: string | null
    formUrl?: string | null
    sheetUrl: string
    isRunning: boolean
    usingFormData?: boolean
    candidates: Array<{
      name: string
      email: string
      phone: string
      threads: number
      blog: number
      instagram: number
      status: 'selected' | 'notSelected'
    }>
    selectionCriteria?: {
      threads: number
      blog: number
      instagram: number
    }
  }
  step3: {
    targetType: 'selected' | 'notSelected'
    emailSubject: string
    emailBody: string
    senderEmail: string
    emailsSent?: number
  }
}

export async function saveProjectData(
  campaignId: string,
  data: ProjectData,
  step: number = 1
) {
  const supabase = createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('인증이 필요합니다')
  }

  // Save to projects table
  return fetchJSON('/api/projects', {
    method: 'POST',
    body: {
      campaign_id: campaignId,
      type: 'customer_acquisition',
      step,
      data,
    },
  })
}

export async function loadProjectData(campaignId: string) {
  const supabase = createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('인증이 필요합니다')
  }

  // Load from projects table
  const projects = await fetchJSON<any[]>(`/api/projects?campaign_id=${campaignId}&type=customer_acquisition`)
  if (projects && projects.length > 0) {
    return projects[0] // Return the first (and should be only) project
  }
  
  return null
}

export async function loadProjectById(projectId: string) {
  const supabase = createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('인증이 필요합니다')
  }

  // Load project by ID directly
  const { data: project, error } = await supabase
    .from('projects')
    .select('*, campaigns(id, name)')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  
  if (error || !project) {
    throw new Error('프로젝트를 찾을 수 없습니다')
  }
  
  return {
    ...project,
    campaign_id: project.campaigns?.id,
    campaign_name: project.campaigns?.name
  }
}

export async function getCampaignIdByName(campaignName: string) {
  const supabase = createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('인증이 필요합니다')
  }

  // Find or create campaign
  const campaignsResponse = await fetchJSON<any>('/api/campaigns')
  const campaigns = campaignsResponse.data || campaignsResponse
  const existing = (Array.isArray(campaigns) ? campaigns : []).find((c: any) => c.name === campaignName)
  
  if (existing) {
    return existing.id
  }

  // Create new campaign if not exists
  const newCampaign = await fetchJSON<any>('/api/campaigns', {
    method: 'POST',
    body: {
      name: campaignName,
      status: 'active',
    },
  })
  return newCampaign.id
}

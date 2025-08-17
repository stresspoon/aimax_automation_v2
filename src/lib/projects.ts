import { createClient } from '@/lib/supabase/client'

export interface ProjectData {
  step1: {
    keyword: string
    contentType: 'blog' | 'thread'
    apiKey: string
    instructions: string
    generateImages: boolean
    generatedContent: string
    generatedImages: string[]
  }
  step2: {
    sheetUrl: string
    isRunning: boolean
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
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaign_id: campaignId,
      type: 'customer_acquisition',
      step,
      data,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '프로젝트 저장에 실패했습니다')
  }

  return response.json()
}

export async function loadProjectData(campaignId: string) {
  const supabase = createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('인증이 필요합니다')
  }

  // Load from projects table
  const response = await fetch(`/api/projects?campaign_id=${campaignId}&type=customer_acquisition`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '프로젝트 불러오기에 실패했습니다')
  }

  const projects = await response.json()
  if (projects && projects.length > 0) {
    return projects[0] // Return the first (and should be only) project
  }
  
  return null
}

export async function getCampaignIdByName(campaignName: string) {
  const supabase = createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('인증이 필요합니다')
  }

  // Find or create campaign
  const response = await fetch('/api/campaigns')
  if (!response.ok) {
    throw new Error('캠페인 조회에 실패했습니다')
  }

  const campaigns = await response.json()
  const existing = campaigns.find((c: any) => c.name === campaignName)
  
  if (existing) {
    return existing.id
  }

  // Create new campaign if not exists
  const createResponse = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: campaignName,
      status: 'active',
    }),
  })

  if (!createResponse.ok) {
    throw new Error('캠페인 생성에 실패했습니다')
  }

  const newCampaign = await createResponse.json()
  return newCampaign.id
}
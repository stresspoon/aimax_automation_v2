import { NextResponse } from 'next/server'
import { z } from 'zod'
import Papa from 'papaparse'
import { parseMetrics } from '@/lib/sns/scrape'
import { createClient } from '@/lib/supabase/server'

const BodySchema = z.object({
  sheetUrl: z.string().url(),
  projectId: z.string().optional(),
})

function toCsvUrl(sheetUrl: string): string {
  try {
    const u = new URL(sheetUrl)
    if (u.hostname.includes('docs.google.com') && u.pathname.includes('/spreadsheets/')) {
      // Convert to CSV export URL
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
      if (match) {
        const sheetId = match[1]
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
      }
    }
    return sheetUrl
  } catch {
    return sheetUrl
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const body = BodySchema.parse(json)

    // Convert Google Sheets URL to CSV export URL
    const csvUrl = toCsvUrl(body.sheetUrl)
    
    // Fetch CSV data
    const res = await fetch(csvUrl, { 
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!res.ok) {
      return NextResponse.json({ 
        error: `시트를 읽을 수 없습니다. 시트가 '링크가 있는 모든 사용자'에게 공개되어 있는지 확인해주세요.` 
      }, { status: 400 })
    }
    
    const csv = await res.text()
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true })
    
    if (parsed.errors?.length) {
      return NextResponse.json({ 
        error: `CSV 파싱 오류: ${parsed.errors[0].message}` 
      }, { status: 400 })
    }

    type Row = Record<string, string>
    const rows = (parsed.data as Row[]).filter(Boolean)
    
    if (rows.length === 0) {
      return NextResponse.json({ 
        error: '시트에 데이터가 없습니다.' 
      }, { status: 400 })
    }

    // Process each row and calculate metrics
    const candidates = await Promise.all(rows.map(async (row) => {
      // Common column names
      const name = row['성함'] || row['이름'] || row['name'] || row['Name'] || ''
      const email = row['메일주소'] || row['이메일'] || row['email'] || row['Email'] || ''
      const phone = row['연락처'] || row['전화번호'] || row['phone'] || row['Phone'] || ''
      
      // Channel URLs
      const threadsUrl = row['후기 작성할 스레드 URL'] || row['스레드 URL'] || row['threads'] || row['Threads'] || ''
      const instagramUrl = row['후기 작성할 인스타그램 URL'] || row['인스타그램 URL'] || row['instagram'] || row['Instagram'] || ''
      const blogUrl = row['후기 작성할 블로그 URL'] || row['블로그 URL'] || row['blog'] || row['Blog'] || ''
      
      // If metrics are directly provided in the sheet
      let threads = parseInt(row['threads_followers'] || row['스레드 팔로워'] || '0')
      let instagram = parseInt(row['instagram_followers'] || row['인스타그램 팔로워'] || '0')
      let blog = parseInt(row['blog_neighbors'] || row['블로그 이웃'] || '0')
      
      // If URLs are provided but not metrics, try to scrape
      if (!threads && threadsUrl) {
        try {
          const metrics = await parseMetrics(threadsUrl)
          threads = metrics.followers || 0
        } catch {}
      }
      
      if (!instagram && instagramUrl) {
        try {
          const metrics = await parseMetrics(instagramUrl)
          instagram = metrics.followers || 0
        } catch {}
      }
      
      if (!blog && blogUrl) {
        try {
          const metrics = await parseMetrics(blogUrl)
          blog = metrics.neighbors || 0
        } catch {}
      }
      
      // Apply selection criteria
      const selected = (threads >= 500) || (blog >= 300) || (instagram >= 1000)
      
      return {
        name,
        email,
        phone,
        threads,
        blog,
        instagram,
        status: selected ? 'selected' as const : 'notSelected' as const,
      }
    }))

    // Calculate statistics
    const stats = {
      total: candidates.length,
      selected: candidates.filter(c => c.status === 'selected').length,
      notSelected: candidates.filter(c => c.status === 'notSelected').length,
      lastSync: new Date().toISOString(),
    }

    // Save to project if projectId is provided
    if (body.projectId) {
      try {
        const supabase = await createClient()
        await supabase
          .from('projects')
          .update({ 
            data: { 
              step2: { 
                candidates,
                stats,
                sheetUrl: body.sheetUrl,
                lastSyncedAt: new Date().toISOString() 
              } 
            } 
          })
          .eq('id', body.projectId)
      } catch (err) {
        console.error('Failed to save to project:', err)
      }
    }

    return NextResponse.json({ 
      success: true,
      candidates,
      stats,
      message: `${stats.total}명의 후보자를 처리했습니다. (선정: ${stats.selected}명, 미달: ${stats.notSelected}명)`
    })
  } catch (err) {
    console.error('Sheet sync error:', err)
    return NextResponse.json({ 
      error: `오류가 발생했습니다: ${(err as Error).message}` 
    }, { status: 400 })
  }
}
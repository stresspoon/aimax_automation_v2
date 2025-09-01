import { NextResponse } from 'next/server'
import { z } from 'zod'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/server'

// 전역 진행상황 스토어
declare global {
  var progressStore: Record<string, {
    total: number
    current: number
    currentName: string
    status: 'loading' | 'processing' | 'completed' | 'error'
    phase: 'sheet_loading' | 'sns_checking' | 'completed'
    currentSns?: 'threads' | 'blog' | 'instagram'
    lastUpdate: number
  }> | undefined
}

const progressStore = globalThis.progressStore || {}
globalThis.progressStore = progressStore

function updateProgress(
  projectId: string, 
  total: number, 
  current: number, 
  currentName: string, 
  status: 'loading' | 'processing' | 'completed' | 'error' = 'processing',
  phase: 'sheet_loading' | 'sns_checking' | 'completed' = 'sns_checking',
  currentSns?: 'threads' | 'blog' | 'instagram'
) {
  if (!projectId) return
  
  try {
    progressStore[projectId] = {
      total,
      current,
      currentName,
      status,
      phase,
      currentSns,
      lastUpdate: Date.now()
    }
    console.log(`[진행상황] ${projectId}: ${current}/${total} - ${currentName} (${status}) - Phase: ${phase}${currentSns ? ` - SNS: ${currentSns}` : ''}`)
  } catch (err) {
    console.error('Failed to update progress:', err)
  }
}

// 실시간으로 후보자 개별 업데이트
async function updateCandidateRealtime(projectId: string, candidateIndex: number, updates: any) {
  try {
    const supabase = await createClient()
    
    // 현재 프로젝트 데이터 가져오기
    const { data: project } = await supabase
      .from('projects')
      .select('data')
      .eq('id', projectId)
      .single()
    
    if (project?.data?.step2?.candidates) {
      const candidates = [...project.data.step2.candidates]
      if (candidates[candidateIndex]) {
        // 기존 checkStatus와 병합
        candidates[candidateIndex] = {
          ...candidates[candidateIndex],
          ...updates,
          checkStatus: {
            ...candidates[candidateIndex].checkStatus,
            ...updates.checkStatus
          }
        }
        
        // 업데이트
        await supabase
          .from('projects')
          .update({ 
            data: {
              ...project.data,
              step2: {
                ...project.data.step2,
                candidates
              }
            }
          })
          .eq('id', projectId)
      }
    }
  } catch (err) {
    console.error('Failed to update candidate realtime:', err)
  }
}

const BodySchema = z.object({
  sheetUrl: z.string().url(),
  projectId: z.string().optional(),
  selectionCriteria: z.object({
    threads: z.number().default(500),
    blog: z.number().default(300),
    instagram: z.number().default(1000),
  }).optional(),
  checkNewOnly: z.boolean().optional(), // 새로운 응답만 체크하는 옵션
  lastRowCount: z.number().optional(), // 마지막으로 체크한 행 수
  skipSnsCheck: z.boolean().optional(), // SNS 체크 건너뛰기
  projectData: z.any().optional(), // 프로젝트 데이터
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
    
    // Use provided criteria or defaults
    const criteria = body.selectionCriteria || {
      threads: 500,
      blog: 300,
      instagram: 1000
    }

    // 구글 시트 불러오기 시작 알림
    if (body.projectId) {
      updateProgress(body.projectId, 100, 10, '구글 시트 연결 중...', 'loading', 'sheet_loading')
    }
    
    // Convert Google Sheets URL to CSV export URL
    const csvUrl = toCsvUrl(body.sheetUrl)
    
    // 구글 시트 다운로드 시작
    if (body.projectId) {
      updateProgress(body.projectId, 100, 30, '구글 시트 데이터 다운로드 중...', 'loading', 'sheet_loading')
    }
    
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
    
    // CSV 파싱 중
    if (body.projectId) {
      updateProgress(body.projectId, 100, 60, 'CSV 데이터 분석 중...', 'loading', 'sheet_loading')
    }
    
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true })
    
    if (parsed.errors?.length) {
      return NextResponse.json({ 
        error: `CSV 파싱 오류: ${parsed.errors[0].message}` 
      }, { status: 400 })
    }

    type Row = Record<string, string>
    let rows = (parsed.data as Row[]).filter(Boolean)
    
    // 빈 시트도 허용 (초기 연결 시)
    if (rows.length === 0) {
      console.log('Empty sheet detected - initial connection')
      
      // 프로젝트 초기 설정 저장
      if (body.projectId) {
        const supabase = await createClient()
        const { data: existingProject } = await supabase
          .from('projects')
          .select('data')
          .eq('id', body.projectId)
          .single()
        
        await supabase
          .from('projects')
          .update({ 
            data: { 
              ...existingProject?.data,
              step2: { 
                ...existingProject?.data?.step2,
                candidates: [],
                stats: { total: 0, selected: 0, notSelected: 0 },
                sheetUrl: body.sheetUrl,
                selectionCriteria: body.selectionCriteria,
                lastRowCount: 0,
                lastSyncedAt: new Date().toISOString(),
                isRunning: true
              } 
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', body.projectId)
      }
      
      return NextResponse.json({ 
        success: true,
        candidates: [],
        stats: { total: 0, selected: 0, notSelected: 0 },
        message: '시트가 연결되었습니다. 새로운 응답을 기다리는 중...'
      })
    }

    // 새로운 응답만 체크하는 경우
    let isNewCheck = false
    let originalRowCount = rows.length
    if (body.checkNewOnly) {
      try {
        // body.lastRowCount 우선 사용, 없으면 DB에서 가져오기
        let lastRowCount = body.lastRowCount
        
        if (lastRowCount === undefined && body.projectId) {
          const supabase = await createClient()
          const { data: project } = await supabase
            .from('projects')
            .select('data')
            .eq('id', body.projectId)
            .single()
          
          lastRowCount = project?.data?.step2?.lastRowCount || 0
        }
        
        lastRowCount = lastRowCount || 0
        const newRowCount = rows.length
        
        console.log(`Checking for new responses: total=${newRowCount}, last=${lastRowCount}`)
        
        if (newRowCount > lastRowCount) {
          // 새로운 행들만 처리
          rows = rows.slice(lastRowCount)
          isNewCheck = true
          console.log(`🆕 ${rows.length}명의 새로운 응답 발견! (행 ${lastRowCount + 1} ~ ${newRowCount})`)
          if (rows.length > 1) {
            console.log(`📌 동시에 여러 응답 처리 중...`)
          }
        } else {
          // 새로운 데이터가 없음
          console.log('No new responses found')
          return NextResponse.json({ 
            success: true,
            newCandidates: [],
            message: '새로운 응답이 없습니다'
          })
        }
      } catch (err) {
        console.error('Failed to check existing data:', err)
      }
    }

    // skipSnsCheck 옵션 확인
    const skipSnsCheck = body.skipSnsCheck === true
    
    // 구글 시트 불러오기 완료, SNS 체크 준비
    if (body.projectId && !isNewCheck && !skipSnsCheck) {
      updateProgress(body.projectId, 100, 100, '구글 시트 불러오기 완료!', 'completed', 'sheet_loading')
      // 잠시 대기 후 SNS 체크 시작
      await new Promise(resolve => setTimeout(resolve, 500))
      updateProgress(body.projectId, rows.length, 0, 'SNS 체크 준비 중...', 'processing', 'sns_checking')
    }
    
    // 헤더 탐색/도메인 스캔 유틸
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '')
    const getByHeaderHints = (row: Row, hints: string[]): string => {
      for (const key of Object.keys(row)) {
        const nk = normalize(key)
        if (hints.some(h => nk.includes(normalize(h)))) {
          const val = (row[key] || '').trim()
          if (val) return val
        }
      }
      return ''
    }
    const getByDomainScan = (row: Row, domains: string[]): string => {
      for (const val of Object.values(row)) {
        if (!val) continue
        const v = String(val).trim()
        if (v.startsWith('http') && domains.some(d => v.includes(d))) return v
      }
      return ''
    }
    const pickUrl = (row: Row, headerHints: string[], domains: string[]) => {
      return (
        getByHeaderHints(row, headerHints) ||
        getByDomainScan(row, domains)
      )
    }

    // Process each row and calculate metrics sequentially
    const candidates = []
    
    console.log(`순차적으로 ${rows.length}명의 후보자를 처리합니다...`)
    
    // 진행상황 초기화 (skipSnsCheck가 아닐 때만)
    if (body.projectId && !skipSnsCheck) {
      updateProgress(body.projectId, rows.length, 0, '처리 시작...', 'processing', 'sns_checking')
    }
    
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]
      
      // Common fields (more robust header detection)
      const name = getByHeaderHints(row, ['성함', '이름', '성명', '신청자명', '닉네임', 'Full Name', 'name', 'Name'])
      const email = getByHeaderHints(row, ['메일주소', '이메일', 'email', 'Email'])
      const phone = getByHeaderHints(row, ['연락처', '전화번호', '휴대폰', '휴대전화', '핸드폰', 'mobile', 'Mobile', 'phone', 'Phone'])
      
      // Channel URLs via header hints + domain scan
      const threadsUrl = pickUrl(row,
        ['후기 작성할 스레드', '스레드 url', '스레드 URL', '스레드주소', 'threads', 'Threads', 'threads url', 'Threads URL'],
        ['threads.net', 'threads.com']
      )
      const instagramUrl = pickUrl(row,
        ['후기 작성할 인스타그램', '인스타그램 url', '인스타그램 URL', '인스타', 'instagram', 'Instagram'],
        ['instagram.com']
      )
      const blogUrl = pickUrl(row,
        ['후기 작성할 블로그', '블로그 url', '블로그 URL', '블로그주소', 'naver', 'blog', 'Blog'],
        ['blog.naver.com', 'm.blog.naver.com']
      )
      
      // Source (application route)
      const source = getByHeaderHints(row, ['신청경로', '신청 경로', '유입경로', '유입 경로', '경로', '출처', 'source', 'referrer', 'origin'])
      
      // If metrics are directly provided in the sheet
      let threads = parseInt(row['threads_followers'] || row['스레드 팔로워'] || '0')
      let instagram = parseInt(row['instagram_followers'] || row['인스타그램 팔로워'] || '0')
      let blog = parseInt(row['blog_neighbors'] || row['블로그 이웃'] || '0')
      
      console.log(`\n=== ${name} 처리 중 (${index + 1}/${rows.length}) ===`)
      
      // 체크 상태를 미리 초기화
      let checkStatus: any = {}
      
      // 진행상황 업데이트 (skipSnsCheck가 아닐 때만)
      if (body.projectId && !skipSnsCheck) {
        updateProgress(body.projectId, rows.length * 3, index * 3, `${name} 체크 준비 중...`, 'processing', 'sns_checking')
      }
      
      // 순차적 SNS 메트릭 체크 (skipSnsCheck가 아닐 때만)
      if (threadsUrl && !skipSnsCheck) {
        checkStatus.threads = 'checking'
        if (body.projectId) {
          updateProgress(body.projectId, rows.length * 3, index * 3, `${name} - Threads 체크 중...`, 'processing', 'sns_checking', 'threads')
          // 실시간 업데이트: 체크 중 상태
          await updateCandidateRealtime(body.projectId, index, { checkStatus })
        }
        try {
          console.log(`[${name}] Threads 팔로워 수 체크 시작: ${threadsUrl}`)
          
          // 단일 포트 SNS 스크래핑 API 사용
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/sns/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: threadsUrl })
          })
          
          if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`)
          }
          
          const result = await response.json()
          console.log(`[${name}] API 응답:`, {
            platform: result.platform,
            followers: result.followers,
            debug: result.debug
          })
          
          if (result.followers > 0) {
            threads = result.followers
            checkStatus.threads = 'completed'
            console.log(`[${name}] ✅ Threads 팔로워: ${threads}`)
          } else {
            checkStatus.threads = 'error'
            checkStatus.threadsError = '팔로워 수를 가져올 수 없음'
            console.log(`[${name}] ❌ Threads 팔로워 수를 찾을 수 없음 (0 반환)`)
            console.log(`[${name}] HTML 샘플:`, result.html?.substring(0, 200))
          }
        } catch (error) {
          checkStatus.threads = 'error'
          checkStatus.threadsError = (error as Error).message
          console.error(`[${name}] ❌ Threads 스크래핑 실패:`, error)
        }
      } else if (!threadsUrl) {
        checkStatus.threads = 'no_url'
      }
      
      if (instagramUrl && !skipSnsCheck) {
        checkStatus.instagram = 'checking'
        if (body.projectId) {
          updateProgress(body.projectId, rows.length * 3, index * 3 + 2, `${name} - Instagram 체크 중...`, 'processing', 'sns_checking', 'instagram')
          // 실시간 업데이트: 체크 중 상태
          await updateCandidateRealtime(body.projectId, index, { checkStatus })
        }
        try {
          console.log(`[${name}] Instagram 팔로워 수 체크 시작: ${instagramUrl}`)
          
          // 단일 포트 SNS 스크래핑 API 사용
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/sns/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: instagramUrl })
          })
          
          if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`)
          }
          
          const result = await response.json()
          console.log(`[${name}] Instagram API 응답:`, {
            platform: result.platform,
            followers: result.followers,
            debug: result.debug
          })
          
          if (result.followers > 0) {
            instagram = result.followers
            checkStatus.instagram = 'completed'
            console.log(`[${name}] ✅ Instagram 팔로워: ${instagram}`)
          } else {
            checkStatus.instagram = 'error'
            checkStatus.instagramError = '팔로워 수를 가져올 수 없음'
            console.log(`[${name}] ❌ Instagram 팔로워 수를 찾을 수 없음 (0 반환)`)
            console.log(`[${name}] HTML 샘플:`, result.html?.substring(0, 200))
          }
        } catch (error) {
          checkStatus.instagram = 'error'
          checkStatus.instagramError = (error as Error).message
          console.error(`[${name}] ❌ Instagram 스크래핑 실패:`, error)
        }
      } else if (!instagramUrl) {
        checkStatus.instagram = 'no_url'
      }
      
      if (blogUrl && !skipSnsCheck) {
        checkStatus.blog = 'checking'
        if (body.projectId) {
          updateProgress(body.projectId, rows.length * 3, index * 3 + 1, `${name} - 블로그 체크 중...`, 'processing', 'sns_checking', 'blog')
          // 실시간 업데이트: 체크 중 상태
          await updateCandidateRealtime(body.projectId, index, { checkStatus })
        }
        try {
          console.log(`[${name}] 네이버 블로그 이웃 수 체크 시작: ${blogUrl}`)
          
          // 단일 포트 SNS 스크래핑 API 사용
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/sns/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: blogUrl })
          })
          
          if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`)
          }
          
          const result = await response.json()
          console.log(`[${name}] 블로그 API 응답:`, {
            platform: result.platform,
            followers: result.followers,
            debug: result.debug
          })
          
          if (result.followers > 0) {
            blog = result.followers
            checkStatus.blog = 'completed'
            console.log(`[${name}] ✅ 블로그 이웃: ${blog}`)
          } else {
            checkStatus.blog = 'error'
            checkStatus.blogError = '이웃 수를 가져올 수 없음'
            console.log(`[${name}] ❌ 블로그 이웃 수를 찾을 수 없음 (0 반환)`)
            console.log(`[${name}] HTML 샘플:`, result.html?.substring(0, 200))
          }
        } catch (error) {
          checkStatus.blog = 'error'
          checkStatus.blogError = (error as Error).message
          console.error(`[${name}] ❌ 블로그 스크래핑 실패:`, error)
        }
      } else if (!blogUrl) {
        checkStatus.blog = 'no_url'
      }
      
      // Apply selection criteria
      const selected = (threads >= criteria.threads) || (blog >= criteria.blog) || (instagram >= criteria.instagram)
      
      const candidate = {
        name,
        email,
        phone,
        threads,
        blog,
        instagram,
        status: selected ? 'selected' as const : 'notSelected' as const,
        checkStatus,
        threadsUrl,
        instagramUrl,
        blogUrl,
        source,
      }
      
      candidates.push(candidate)
      
      const statusEmoji = selected ? '🎉' : '❌'
      console.log(`[${name}] ${statusEmoji} 최종 결과: Threads(${threads}), Instagram(${instagram}), Blog(${blog}) - ${selected ? '선정' : '미달'}`)
      
      // 진행상황 업데이트만 (DB 저장은 마지막에 한 번만)
      if (body.projectId && !skipSnsCheck) {
        updateProgress(body.projectId, rows.length * 3, (index + 1) * 3, `${name} 완료`, 'processing', 'sns_checking')
      }
      
      // 각 후보자 처리 완료 후 잠깐 대기 (서버 부하 방지)
      if (index < rows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1초 대기
      }
    }
    
    console.log(`\n🏁 전체 처리 완료: ${candidates.length}명 중 ${candidates.filter(c => c.status === 'selected').length}명 선정`)
    
    // 최종 완료 상태 업데이트
    if (body.projectId) {
      updateProgress(body.projectId, rows.length * 3, rows.length * 3, '모든 처리 완료', 'completed', 'completed')
    }

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
        
        if (isNewCheck) {
          // 새로운 데이터만 처리한 경우, 기존 데이터에 추가
          const { data: existingProject } = await supabase
            .from('projects')
            .select('data')
            .eq('id', body.projectId)
            .single()
          
          const existingCandidates = existingProject?.data?.step2?.candidates || []
          
          // 이름과 이메일 조합으로 중복 제거 (더 정확한 중복 체크)
          const existingKeys = new Set(
            existingCandidates.map((c: any) => `${c.name}_${c.email}`)
          )
          const newUniqueCandidates = candidates.filter((c: any) => 
            !existingKeys.has(`${c.name}_${c.email}`)
          )
          
          // 새로운 후보만 추가
          const allCandidates = [...existingCandidates, ...newUniqueCandidates]
          
          console.log(`[중복 제거] 기존: ${existingCandidates.length}명, 새로운 고유: ${newUniqueCandidates.length}명, 전체: ${allCandidates.length}명`)
          
          // 전체 통계 재계산
          const allStats = {
            total: allCandidates.length,
            selected: allCandidates.filter((c: any) => c.status === 'selected').length,
            notSelected: allCandidates.filter((c: any) => c.status === 'notSelected').length,
            lastSync: new Date().toISOString(),
          }
          
          await supabase
            .from('projects')
            .update({ 
              data: { 
                ...existingProject?.data,
                step2: { 
                  ...existingProject?.data?.step2,
                  candidates: allCandidates,
                  stats: allStats,
                  lastRowCount: originalRowCount, // 전체 행 수 저장
                  lastSyncedAt: new Date().toISOString() 
                } 
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', body.projectId)
          
          console.log(`✅ 프로젝트 업데이트 완료: ${newUniqueCandidates.length}명 추가됨`)
        } else {
          // 전체 데이터 처리한 경우 - 기존 프로젝트 데이터 가져오기
          const { data: existingProject } = await supabase
            .from('projects')
            .select('data')
            .eq('id', body.projectId)
            .single()
          
          await supabase
            .from('projects')
            .update({ 
              data: { 
                ...existingProject?.data,
                step2: { 
                  ...existingProject?.data?.step2,
                  candidates,
                  stats,
                  sheetUrl: body.sheetUrl,
                  selectionCriteria: body.selectionCriteria || existingProject?.data?.step2?.selectionCriteria,
                  lastRowCount: (parsed.data as Row[]).filter(Boolean).length, // 전체 행 수 저장
                  lastSyncedAt: new Date().toISOString() 
                } 
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', body.projectId)
          
          console.log(`Full sync completed. Total rows: ${(parsed.data as Row[]).filter(Boolean).length}`)
        }
      } catch (err) {
        console.error('Failed to save to project:', err)
      }
    }

    // 진행상황 완료 업데이트 (skipSnsCheck가 아닐 때만)
    if (body.projectId && !skipSnsCheck) {
      updateProgress(body.projectId, rows.length, rows.length, '완료', 'completed')
    }
    
    // 새로운 응답 체크인 경우와 전체 체크인 경우 다른 응답 형식
    if (isNewCheck) {
      return NextResponse.json({ 
        success: true,
        newCandidates: candidates,
        stats,
        message: `${candidates.length}명의 새로운 후보자를 처리했습니다.`
      })
    } else {
      return NextResponse.json({ 
        success: true,
        candidates,
        stats,
        message: `${stats.total}명의 후보자를 처리했습니다. (선정: ${stats.selected}명, 미달: ${stats.notSelected}명)`
      })
    }
  } catch (err) {
    console.error('Sheet sync error:', err)
    return NextResponse.json({ 
      error: `오류가 발생했습니다: ${(err as Error).message}` 
    }, { status: 400 })
  }
}

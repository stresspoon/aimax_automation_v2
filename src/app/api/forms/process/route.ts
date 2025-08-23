import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { appendToSheet, getSpreadsheetIdFromUrl } from '@/lib/google/sheets'

// SNS 병렬 체크 함수
async function checkSNSParallel(data: any) {
  const checks = []
  
  // Threads 체크
  if (data.threadsUrl) {
    checks.push(
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/check-threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.threadsUrl })
      }).then(res => res.json()).then(result => ({
        platform: 'threads',
        ...result
      })).catch(error => ({
        platform: 'threads',
        error: error.message,
        followers: 0
      }))
    )
  }
  
  // Instagram 체크
  if (data.instagramUrl) {
    checks.push(
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/check-instagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.instagramUrl })
      }).then(res => res.json()).then(result => ({
        platform: 'instagram',
        ...result
      })).catch(error => ({
        platform: 'instagram',
        error: error.message,
        followers: 0
      }))
    )
  }
  
  // Blog 체크
  if (data.blogUrl) {
    checks.push(
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/check-blog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.blogUrl })
      }).then(res => res.json()).then(result => ({
        platform: 'blog',
        ...result
      })).catch(error => ({
        platform: 'blog',
        error: error.message,
        neighbors: 0
      }))
    )
  }
  
  // 병렬 실행
  const results = await Promise.all(checks)
  
  // 결과 정리
  const snsResult: any = {
    threads: { url: data.threadsUrl, followers: 0, checked: false, error: null },
    instagram: { url: data.instagramUrl, followers: 0, checked: false, error: null },
    blog: { url: data.blogUrl, neighbors: 0, checked: false, error: null }
  }
  
  results.forEach(result => {
    if (result.platform === 'threads' && data.threadsUrl) {
      snsResult.threads = {
        url: data.threadsUrl,
        followers: result.followers || 0,
        checked: true,
        error: result.error || null
      }
    } else if (result.platform === 'instagram' && data.instagramUrl) {
      snsResult.instagram = {
        url: data.instagramUrl,
        followers: result.followers || 0,
        checked: true,
        error: result.error || null
      }
    } else if (result.platform === 'blog' && data.blogUrl) {
      snsResult.blog = {
        url: data.blogUrl,
        neighbors: result.neighbors || 0,
        checked: true,
        error: result.error || null
      }
    }
  })
  
  return snsResult
}

// Google Sheets에 데이터 추가 (OAuth 방식)
async function appendToGoogleSheet(userId: string, form: any, responseData: any, snsResult: any, isSelected: boolean) {
  if (!form.google_sheet_url) {
    console.log('Google Sheets URL이 없습니다');
    return false;
  }
  
  try {
    // Google Sheets URL에서 ID 추출
    const sheetId = getSpreadsheetIdFromUrl(form.google_sheet_url);
    if (!sheetId) {
      console.log('Invalid Google Sheets URL');
      return false;
    }
    
    // 데이터 행 준비
    const rowData = [[
      new Date().toLocaleString('ko-KR'),
      responseData.name,
      responseData.phone,
      responseData.email,
      responseData.source || '',
      responseData.threadsUrl || '',
      snsResult.threads?.followers || 0,
      responseData.instagramUrl || '',
      snsResult.instagram?.followers || 0,
      responseData.blogUrl || '',
      snsResult.blog?.neighbors || 0,
      isSelected ? '선정' : '탈락',
      isSelected ? '기준 충족' : '기준 미달'
    ]];
    
    // OAuth를 통한 Google Sheets API 호출
    await appendToSheet(userId, sheetId, rowData);
    
    console.log('✅ Google Sheets에 데이터 추가 완료');
    return true;
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    return false;
  }
}

// POST: 응답 처리
export async function POST(req: Request) {
  console.log('🔄 === Process API Called ===')
  try {
    const { responseId } = await req.json()
    console.log('📍 Processing response ID:', responseId)
    const supabase = await createClient()
    
    // 응답 조회
    const { data: response, error: responseError } = await supabase
      .from('form_responses_temp')
      .select('*')
      .eq('id', responseId)
      .single()
    
    if (responseError || !response) {
      return NextResponse.json({ error: '응답을 찾을 수 없습니다' }, { status: 404 })
    }
    
    // 폼 정보 조회
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', response.form_id)
      .single()
    
    if (formError || !form) {
      return NextResponse.json({ error: '폼을 찾을 수 없습니다' }, { status: 404 })
    }
    
    // 이미 처리됨
    if (response.status !== 'pending') {
      return NextResponse.json({ 
        message: '이미 처리된 응답입니다',
        status: response.status 
      })
    }
    
    // 상태 업데이트: processing
    await supabase
      .from('form_responses_temp')
      .update({ status: 'processing' })
      .eq('id', responseId)
    
    // SNS 병렬 체크
    console.log('Starting SNS check for data:', response.data)
    const snsResult = await checkSNSParallel(response.data)
    console.log('SNS check result:', snsResult)
    
    // 선정 기준 확인
    const criteria = form.settings?.selectionCriteria || {
      threads: 500,
      blog: 300,
      instagram: 1000
    }
    
    const isSelected = 
      (snsResult.threads.followers >= criteria.threads) ||
      (snsResult.instagram.followers >= criteria.instagram) ||
      (snsResult.blog.neighbors >= criteria.blog)
    
    // 결과 업데이트
    await supabase
      .from('form_responses_temp')
      .update({
        sns_check_result: snsResult,
        is_selected: isSelected,
        selection_reason: isSelected ? '기준 충족' : '기준 미달',
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', responseId)
    
    // Google Sheets 동기화
    if (form.google_sheet_url) {
      console.log('📊 Google Sheets 동기화 시도...');
      const synced = await appendToGoogleSheet(
        form.user_id,  // user_id 추가
        form,
        response.data,
        snsResult,
        isSelected
      )
      
      if (synced) {
        console.log('✅ Google Sheets 동기화 성공!');
        await supabase
          .from('form_responses_temp')
          .update({
            synced_to_sheets: true,
            status: 'archived' // 동기화 완료 후 archived로 변경
          })
          .eq('id', responseId)
      } else {
        console.log('❌ Google Sheets 동기화 실패 - Supabase에만 저장됨');
      }
    } else {
      console.log('ℹ️ Google Sheets URL이 없어서 동기화 건너뜀');
    }
    
    // 처리 큐에서 제거
    await supabase
      .from('processing_queue')
      .delete()
      .eq('response_id', responseId)
    
    return NextResponse.json({
      success: true,
      isSelected,
      snsResult,
      message: isSelected ? '선정되었습니다' : '아쉽게도 선정되지 않았습니다'
    })
    
  } catch (error) {
    console.error('Processing error:', error)
    
    // 에러 상태로 업데이트
    const { responseId } = await req.json()
    const supabase = await createClient()
    
    await supabase
      .from('form_responses_temp')
      .update({
        status: 'error',
        error_message: (error as Error).message
      })
      .eq('id', responseId)
    
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}
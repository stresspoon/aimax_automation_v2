import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseMetrics, normalizeUrl } from '@/lib/sns/scrape'

const CONCURRENCY = 3
const BATCH = 30

type QueueItem = {
  id: string
  response_id: string
  retry_count: number
  max_retries: number
}

export async function POST() {
  const admin = createAdminClient()

  try {
    // 1) 활성 대상 큐 로드
    const { data: jobs, error: jobsError } = await admin
      .from('processing_queue')
      .select('*')
      .lte('next_retry_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(BATCH)

    if (jobsError) throw jobsError

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 })
    }

    const limiter = Array(CONCURRENCY).fill(0)
    let processed = 0

    await Promise.all(jobs.map(async (job: QueueItem, idx) => {
      const slot = idx % CONCURRENCY
      // 간단한 동시성 제한: 순번 대기
      await new Promise(res => setTimeout(res, slot * 0))

      // 2) 락: pending/에러 상태에서만 집어올리기
      const { data: lock, error: lockError } = await admin
        .from('form_responses_temp')
        .update({ status: 'processing' })
        .eq('id', job.response_id)
        .in('status', ['pending', 'error'])
        .select('id, data, form_id')
        .single()

      if (lockError || !lock) {
        // 다른 워커가 집었거나 상태가 아님
        return
      }

      try {
        // 3) SNS 체크 실행 (기본 필드만 우선)
        const payload: any = lock.data || {}
        const result: any = {
          threads: { followers: 0, checked: false },
          instagram: { followers: 0, checked: false },
          blog: { neighbors: 0, checked: false }
        }

        const tryCheck = async (key: 'threadsUrl' | 'instagramUrl' | 'blogUrl') => {
          if (!payload[key]) return
          try {
            const platform = key === 'threadsUrl' ? 'threads' : key === 'instagramUrl' ? 'instagram' : 'blog'
            const url = normalizeUrl(payload[key], platform as any)
            const metrics = await parseMetrics(url)
            if (platform === 'threads') {
              result.threads = { url: payload[key], followers: metrics.followers || 0, checked: true }
            } else if (platform === 'instagram') {
              result.instagram = { url: payload[key], followers: metrics.followers || 0, checked: true }
            } else {
              result.blog = { url: payload[key], neighbors: metrics.neighbors || 0, checked: true }
            }
          } catch (e) {
            // 개별 채널 실패는 전체 실패로 간주하지 않음
          }
        }

        await Promise.all([
          tryCheck('threadsUrl'),
          tryCheck('instagramUrl'),
          tryCheck('blogUrl'),
        ])

        // 4) 선정 기준(기본값) 평가
        const isSelected = (result.threads.checked && result.threads.followers >= 500) ||
          (result.instagram.checked && result.instagram.followers >= 1000) ||
          (result.blog.checked && result.blog.neighbors >= 300)

        // 5) 결과 저장 & 큐 제거
        await admin
          .from('form_responses_temp')
          .update({
            sns_check_result: result,
            is_selected: isSelected,
            selection_reason: isSelected ? '기준 충족' : '기준 미달',
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', job.response_id)

        await admin
          .from('processing_queue')
          .delete()
          .eq('id', job.id)

        processed++
      } catch (e: any) {
        // 실패 시 재시도 스케줄링(지수 백오프)
        const nextSec = Math.min(900, Math.pow(2, job.retry_count || 0) * 30) // 30s → 60s → 120s ... cap 15m
        const next = new Date(Date.now() + nextSec * 1000).toISOString()

        const retry = (job.retry_count || 0) + 1
        if (retry >= (job.max_retries || 5)) {
          await admin
            .from('form_responses_temp')
            .update({ status: 'error', error_message: e?.message || 'processing failed' })
            .eq('id', job.response_id)
          await admin
            .from('processing_queue')
            .delete()
            .eq('id', job.id)
        } else {
          await admin
            .from('processing_queue')
            .update({ retry_count: retry, next_retry_at: next, error_message: e?.message || 'retry' })
            .eq('id', job.id)
          await admin
            .from('form_responses_temp')
            .update({ status: 'pending' })
            .eq('id', job.response_id)
        }
      }
    }))

    return NextResponse.json({ ok: true, processed })
  } catch (e) {
    console.error('worker error', e)
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}



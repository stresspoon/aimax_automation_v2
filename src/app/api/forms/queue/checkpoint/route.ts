import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 주기적 체크포인트: 누락/중단 건 복구 및 재큐잉
export async function POST() {
  const admin = createAdminClient()

  try {
    const summary = {
      enqueuedMissing: 0,
      recoveredStuck: 0,
    }

    // 1) pending인데 큐에 없는 건 큐에 upsert
    const { data: missing } = await admin
      .rpc('exec_sql', {
        sql: `
          with missing as (
            select r.id as response_id
            from public.form_responses_temp r
            where r.status = 'pending'
              and not exists (
                select 1 from public.processing_queue q 
                where q.response_id = r.id
              )
            limit 500
          )
          insert into public.processing_queue(response_id, priority)
          select response_id, 1 from missing
          on conflict (response_id) do nothing
          returning 1;
        `
      })

    summary.enqueuedMissing = Array.isArray(missing) ? missing.length : 0

    // 2) 오래된 processing을 pending으로 되돌리고 재시도 스케줄
    const STUCK_MINUTES = 10
    const { data: recovered } = await admin
      .rpc('exec_sql', {
        sql: `
          with stuck as (
            select id from public.form_responses_temp
            where status = 'processing'
              and updated_at < now() - interval '${STUCK_MINUTES} minutes'
            limit 500
          ), upd as (
            update public.form_responses_temp r
            set status = 'pending'
            where r.id in (select id from stuck)
            returning id
          )
          insert into public.processing_queue(response_id, priority, retry_count, next_retry_at)
          select id, 1, 1, now() + interval '30 seconds' from upd
          on conflict (response_id) do update
          set next_retry_at = excluded.next_retry_at,
              retry_count = public.processing_queue.retry_count + 1;
        `
      })

    summary.recoveredStuck = Array.isArray(recovered) ? recovered.length : 0

    return NextResponse.json({ ok: true, summary })
  } catch (e) {
    console.error('checkpoint error', e)
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}



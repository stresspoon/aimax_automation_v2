import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isSheetsIntegrationEnabled } from '@/lib/flags'
import Papa from 'papaparse'

const BodySchema = z.object({
  sheetUrl: z.string().url(),
})

function toCsvUrl(sheetUrl: string): string {
  try {
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (match) {
      return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`
    }
  } catch {}
  return sheetUrl
}

export async function POST(req: Request) {
  try {
    if (!isSheetsIntegrationEnabled()) {
      return NextResponse.json({ error: 'Sheets integration disabled' }, { status: 410 })
    }
    const json = await req.json()
    const body = BodySchema.parse(json)
    const csvUrl = toCsvUrl(body.sheetUrl)
    const res = await fetch(csvUrl, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json({ error: '시트를 읽을 수 없습니다. 공개 설정을 확인해주세요.' }, { status: 400 })
    }
    const csv = await res.text()
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true })
    if (parsed.errors?.length) {
      return NextResponse.json({ error: parsed.errors[0].message }, { status: 400 })
    }
    type Row = Record<string, string>
    const rows = (parsed.data as Row[]).filter(Boolean)

    // 빈 시트인 경우 빈 배열 반환하여 자동화 시작 가능하게 함
    if (rows.length === 0) {
      console.log('Empty sheet detected - allowing automation to start with empty data')
      return NextResponse.json({ candidates: [] })
    }

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
        const v = val.trim()
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

    const candidates = rows.map((row) => {
      // 이름/이메일/연락처는 다양한 라벨을 허용
      const name = getByHeaderHints(row, ['성함', '이름', '성명', '신청자명', '닉네임', 'Full Name', 'name', 'Name'])
      const email = getByHeaderHints(row, ['메일주소', '이메일', 'email', 'Email'])
      const phone = getByHeaderHints(row, ['연락처', '전화번호', '휴대폰', '휴대전화', '핸드폰', 'mobile', 'Mobile', 'phone', 'Phone'])

      // URL 후보는 헤더 힌트 + 도메인 스캔을 함께 사용
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

      // 신청 경로(유입 경로) 추정
      const source = getByHeaderHints(row, ['신청경로', '신청 경로', '유입경로', '유입 경로', '경로', '출처', 'source', 'referrer', 'origin'])

      return { name, email, phone, threadsUrl, instagramUrl, blogUrl, source }
    })
    return NextResponse.json({ candidates })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}

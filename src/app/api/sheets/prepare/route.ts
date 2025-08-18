import { NextResponse } from 'next/server'
import { z } from 'zod'
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
      const name = row['성함'] || row['이름'] || row['name'] || row['Name'] || ''
      const email = row['메일주소'] || row['이메일'] || row['email'] || row['Email'] || ''
      const phone = row['연락처'] || row['전화번호'] || row['phone'] || row['Phone'] || ''
      const threadsUrl = pickUrl(row, ['후기 작성할 스레드', '스레드 url', '스레드', 'threads'], ['threads.net', 'threads.com'])
      const instagramUrl = pickUrl(row, ['후기 작성할 인스타그램', '인스타그램 url', '인스타그램', 'instagram'], ['instagram.com'])
      const blogUrl = pickUrl(row, ['후기 작성할 블로그', '블로그 url', '블로그', 'naver', 'blog'], ['blog.naver.com', 'm.blog.naver.com'])
      return { name, email, phone, threadsUrl, instagramUrl, blogUrl }
    })
    return NextResponse.json({ candidates })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}



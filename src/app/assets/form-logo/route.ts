import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'image', 'Logo', 'main logo.png')
    const file = await fs.readFile(filePath)
    // Convert Buffer to Blob to satisfy BodyInit typings across runtimes
    const blob = new Blob([file], { type: 'image/png' })
    return new Response(blob, {
      headers: {
        'Content-Type': 'image/png',
        // Cache for 1 day; allow stale while revalidate
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 })
  }
}

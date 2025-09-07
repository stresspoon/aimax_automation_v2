import { describe, it, expect } from 'vitest'
import { normalizeUrl } from '@/lib/sns/scrape'

describe('normalizeUrl', () => {
  it('normalizes instagram username with platform hint', () => {
    expect(normalizeUrl('nike', 'instagram')).toBe('https://www.instagram.com/nike')
    expect(normalizeUrl('@nike', 'instagram')).toBe('https://www.instagram.com/nike')
  })

  it('keeps full URLs and trims trailing slashes', () => {
    expect(normalizeUrl('https://www.instagram.com/nike/', 'instagram')).toBe('https://www.instagram.com/nike')
    expect(normalizeUrl('http://blog.naver.com/foo/', 'blog')).toBe('http://blog.naver.com/foo')
  })

  it('normalizes threads username', () => {
    expect(normalizeUrl('jane', 'threads')).toBe('https://www.threads.com/@jane')
  })

  it('normalizes naver blog id', () => {
    expect(normalizeUrl('foo', 'blog')).toBe('https://blog.naver.com/foo')
    expect(normalizeUrl('blog.naver.com/foo', 'blog')).toBe('https://blog.naver.com/foo')
  })
})


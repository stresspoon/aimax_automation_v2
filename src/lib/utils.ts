import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normalize numbers like "1.2K", "3.4M", "12,345", "1만", "5천" to number
export function normalizeCompactNumber(value: string): number | null {
  if (!value || typeof value !== 'string') return null
  
  // 특수 문자 제거 및 정규화
  let v = value.trim()
    .replace(/[,\s]/g, '') // 쉼표와 공백 제거
    .replace(/[\uFF0C\u3000]/g, '') // 전각 쉼표와 전각 공백 제거
    .toLowerCase()
  
  if (!v) return null
  
  // 한국어 단위 처리
  const koreanUnits: Record<string, number> = {
    '천': 1e3,
    '만': 1e4,
    '십만': 1e5,
    '백만': 1e6,
    '천만': 1e7,
    '억': 1e8,
    '조': 1e12
  }
  
  // 한국어 단위 매칭
  for (const [unit, multiplier] of Object.entries(koreanUnits)) {
    if (v.includes(unit)) {
      const match = v.match(new RegExp(`([0-9]*\\.?[0-9]+)${unit}`))
      if (match) {
        const num = parseFloat(match[1])
        return Math.round(num * multiplier)
      }
    }
  }
  
  // 영어 단위 처리 (K, M, B)
  const englishUnits: Record<string, number> = { 
    k: 1e3, 
    m: 1e6, 
    b: 1e9,
    g: 1e9 // billion의 다른 표현
  }
  
  const englishMatch = v.match(/^([0-9]*\.?[0-9]+)([kmb])?$/i)
  if (englishMatch) {
    const num = parseFloat(englishMatch[1])
    const unit = englishMatch[2]?.toLowerCase()
    return unit ? Math.round(num * (englishUnits[unit] || 1)) : Math.round(num)
  }
  
  // 순수 숫자 추출 (콤마 포함)
  const numberMatch = v.match(/([0-9,]+)/)
  if (numberMatch) {
    const cleanNumber = numberMatch[1].replace(/,/g, '')
    const asInt = parseInt(cleanNumber, 10)
    return Number.isFinite(asInt) ? asInt : null
  }
  
  return null
}

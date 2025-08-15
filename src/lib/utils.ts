import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normalize numbers like "1.2K", "3.4M", "12,345" to number
export function normalizeCompactNumber(value: string): number | null {
  const v = value.trim().replace(/[,\s]/g, '')
  if (!v) return null
  const units: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 }
  const match = v.match(/^([0-9]*\.?[0-9]+)([kmb])?$/i)
  if (match) {
    const num = parseFloat(match[1])
    const unit = match[2]?.toLowerCase()
    return unit ? Math.round(num * (units[unit] || 1)) : Math.round(num)
  }
  const asInt = parseInt(v, 10)
  return Number.isFinite(asInt) ? asInt : null
}

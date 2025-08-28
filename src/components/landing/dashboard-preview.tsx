"use client"
import Image from "next/image"
import { useEffect, useState } from "react"

export function DashboardPreview() {
  const slides = [
    "/image/main/KakaoTalk_Photo_2025-08-28-16-47-32 001.png",
    "/image/main/KakaoTalk_Photo_2025-08-28-16-47-32 002.png",
    "/image/main/KakaoTalk_Photo_2025-08-28-16-47-32 003.png",
    "/image/main/KakaoTalk_Photo_2025-08-28-16-47-32 004.png",
    "/image/main/KakaoTalk_Photo_2025-08-28-16-47-32 005.png",
  ]
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-[calc(100vw-32px)] md:w-[1160px]">
      <div className="bg-primary-light/50 rounded-2xl p-2 shadow-2xl">
        <div className="relative w-full h-[300px] md:h-[700px] overflow-hidden rounded-xl">
          {slides.map((src, i) => (
            <Image
              key={src}
              src={src}
              alt={`Dashboard slide ${i + 1}`}
              fill
              sizes="(min-width: 768px) 1160px, 100vw"
              priority={i === idx}
              className={`absolute inset-0 object-contain rounded-xl shadow-lg transition-opacity duration-700 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

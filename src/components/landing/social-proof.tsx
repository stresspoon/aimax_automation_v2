import Image from "next/image"

export function SocialProof() {
  return (
    <section className="self-stretch py-16 flex flex-col justify-center items-center gap-6 overflow-hidden">
      <div className="text-center text-gray-300 text-sm font-medium leading-tight">
        이미 수많은 기업이 AIMAX로 성장하고 있습니다
      </div>
      <div className="self-stretch grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
        {[
          "/image/KakaoTalk_Photo_2025-08-28-08-40-40 001_cropped.png",
          "/image/KakaoTalk_Photo_2025-08-28-08-40-40 002_cropped.png",
          "/image/KakaoTalk_Photo_2025-08-28-08-40-40 003_cropped.png",
          "/image/KakaoTalk_Photo_2025-08-28-08-41-04 001_cropped.png",
          "/image/KakaoTalk_Photo_2025-08-28-08-41-04 003_cropped.png",
          "/image/KakaoTalk_Photo_2025-08-28-08-41-05 006_cropped.png",
          "/image/KakaoTalk_Photo_2025-08-28-08-41-05 007_cropped.png",
          "/image/KakaoTalk_Photo_2025-08-28-08-41-05 008_cropped.png",
        ].map((src, i) => (
          <Image
            key={i}
            src={src}
            alt={`Company Logo ${i + 1}`}
            width={400}
            height={120}
            className="w-full max-w-[400px] h-auto object-contain opacity-80"
          />
        ))}
      </div>
    </section>
  )
}

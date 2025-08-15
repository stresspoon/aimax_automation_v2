"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function HeroSection() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 4)
    }, 700) // 0.7초마다 전환
    
    return () => clearInterval(timer)
  }, [])

  const steps = [
    { 
      id: 1, 
      title: "콘텐츠 자동 발행", 
      description: "AI가 마케팅 콘텐츠 작성",
      animation: "type-animation"
    },
    { 
      id: 2, 
      title: "고객이 알아서 모임", 
      description: "구글폼으로 자동 수집",
      animation: "funnel-animation"
    },
    { 
      id: 3, 
      title: "DB 저장 → 메일 발송", 
      description: "타겟 고객 자동 필터링",
      animation: "mail-animation"
    },
    { 
      id: 4, 
      title: "콘텐츠가 차곡차곡", 
      description: "맞춤형 이메일 자동 발송",
      animation: "shelf-animation"
    }
  ]

  return (
    <section
      className="flex flex-col items-center text-center relative mx-auto rounded-2xl overflow-hidden my-6 py-0 px-4
         w-full h-[550px] md:w-[1220px] md:h-[750px] lg:h-[950px] md:px-0"
    >
      {/* SVG Background with reduced opacity */}
      <div className="absolute inset-0 z-0 opacity-70">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1220 810"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <g clipPath="url(#clip0_186_1134)">
            <mask
              id="mask0_186_1134"
              style={{ maskType: "alpha" }}
              maskUnits="userSpaceOnUse"
              x="10"
              y="-1"
              width="1200"
              height="812"
            >
              <rect x="10" y="-0.84668" width="1200" height="811.693" fill="url(#paint0_linear_186_1134)" />
            </mask>
            <g mask="url(#mask0_186_1134)">
              {/* Grid Rectangles */}
              {[...Array(35)].map((_, i) => (
                <React.Fragment key={`row1-${i}`}>
                  {[...Array(23)].map((_, j) => (
                    <rect
                      key={`rect-${i}-${j}`}
                      x={-20.0891 + i * 36}
                      y={9.2 + j * 36}
                      width="35.6"
                      height="35.6"
                      stroke="#131313"
                      strokeOpacity="0.08"
                      strokeWidth="0.4"
                      strokeDasharray="2 2"
                    />
                  ))}
                </React.Fragment>
              ))}
              {/* Specific Rectangles with fill */}
              <rect x="699.711" y="81" width="36" height="36" fill="#ff3d00" fillOpacity="0.1" />
              <rect x="195.711" y="153" width="36" height="36" fill="#ff3d00" fillOpacity="0.08" />
              <rect x="1023.71" y="153" width="36" height="36" fill="#ff3d00" fillOpacity="0.08" />
              <rect x="123.711" y="225" width="36" height="36" fill="#ff3d00" fillOpacity="0.08" />
              <rect x="1095.71" y="225" width="36" height="36" fill="#ff3d00" fillOpacity="0.08" />
              <rect x="951.711" y="297" width="36" height="36" fill="#ff3d00" fillOpacity="0.08" />
              <rect x="231.711" y="333" width="36" height="36" fill="#ff3d00" fillOpacity="0.06" />
              <rect x="303.711" y="405" width="36" height="36" fill="#ff3d00" fillOpacity="0.06" />
              <rect x="87.7109" y="405" width="36" height="36" fill="#ff3d00" fillOpacity="0.08" />
              <rect x="519.711" y="405" width="36" height="36" fill="#ff3d00" fillOpacity="0.07" />
              <rect x="771.711" y="405" width="36" height="36" fill="#ff3d00" fillOpacity="0.08" />
              <rect x="591.711" y="477" width="36" height="36" fill="#ff3d00" fillOpacity="0.06" />
            </g>

            <g filter="url(#filter0_f_186_1134)">
              <path
                d="M1447.45 -87.0203V-149.03H1770V1248.85H466.158V894.269C1008.11 894.269 1447.45 454.931 1447.45 -87.0203Z"
                fill="url(#paint1_linear_186_1134)"
              />
            </g>

            <g filter="url(#filter1_f_186_1134)">
              <path
                d="M1383.45 -151.02V-213.03H1706V1184.85H402.158V830.269C944.109 830.269 1383.45 390.931 1383.45 -151.02Z"
                fill="url(#paint2_linear_186_1134)"
                fillOpacity="0.69"
              />
            </g>

            <g style={{ mixBlendMode: "lighten" }} filter="url(#filter2_f_186_1134)">
              <path
                d="M1567.45 -231.02V-293.03H1890V1104.85H586.158V750.269C1128.11 750.269 1567.45 310.931 1567.45 -231.02Z"
                fill="url(#paint3_linear_186_1134)"
              />
            </g>

            <g style={{ mixBlendMode: "overlay" }} filter="url(#filter3_f_186_1134)">
              <path
                d="M65.625 750.269H284.007C860.205 750.269 1327.31 283.168 1327.31 -293.03H1650V1104.85H65.625V750.269Z"
                fill="url(#paint4_radial_186_1134)"
                fillOpacity="0.64"
              />
            </g>
          </g>

          <rect x="0.5" y="0.5" width="1219" height="809" rx="15.5" stroke="#131313" strokeOpacity="0.06" />

          <defs>
            <filter
              id="filter0_f_186_1134"
              x="147.369"
              y="-467.818"
              width="1941.42"
              height="2035.46"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur stdDeviation="159.394" result="effect1_foregroundBlur_186_1134" />
            </filter>
            <filter
              id="filter1_f_186_1134"
              x="-554.207"
              y="-1169.39"
              width="3216.57"
              height="3310.61"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur stdDeviation="478.182" result="effect1_foregroundBlur_186_1134" />
            </filter>
            <filter
              id="filter2_f_186_1134"
              x="426.762"
              y="-452.424"
              width="1622.63"
              height="1716.67"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur stdDeviation="79.6969" result="effect1_foregroundBlur_186_1134" />
            </filter>
            <filter
              id="filter3_f_186_1134"
              x="-253.163"
              y="-611.818"
              width="2221.95"
              height="2035.46"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur stdDeviation="159.394" result="effect1_foregroundBlur_186_1134" />
            </filter>
            <linearGradient
              id="paint0_linear_186_1134"
              x1="35.0676"
              y1="23.6807"
              x2="903.8"
              y2="632.086"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#131313" stopOpacity="0" />
              <stop offset="1" stopColor="#131313" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient
              id="paint1_linear_186_1134"
              x1="1118.08"
              y1="-149.03"
              x2="1118.08"
              y2="1248.85"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#ff3d00" />
              <stop offset="0.578125" stopColor="#ff6d00" />
              <stop offset="1" stopColor="#ff3d00" />
            </linearGradient>
            <linearGradient
              id="paint2_linear_186_1134"
              x1="1054.08"
              y1="-213.03"
              x2="1054.08"
              y2="1184.85"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#ff3d00" />
              <stop offset="0.578125" stopColor="#ff6d00" />
              <stop offset="1" stopColor="#ff3d00" />
            </linearGradient>
            <linearGradient
              id="paint3_linear_186_1134"
              x1="1238.08"
              y1="-293.03"
              x2="1238.08"
              y2="1104.85"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#ff3d00" />
              <stop offset="0.578125" stopColor="#ff6d00" />
              <stop offset="1" stopColor="#ff3d00" />
            </linearGradient>
            <radialGradient
              id="paint4_radial_186_1134"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(989.13 557.24) rotate(47.9516) scale(466.313 471.424)"
            >
              <stop stopColor="#ff3d00" />
              <stop offset="0.157789" stopColor="#ff6d00" />
              <stop offset="1" stopColor="#ff3d00" />
            </radialGradient>
            <clipPath id="clip0_186_1134">
              <rect width="1220" height="810" rx="16" fill="#131313" />
            </clipPath>
          </defs>
        </svg>
      </div>

      <div className="relative z-10 space-y-4 md:space-y-5 lg:space-y-6 mb-6 md:mb-7 lg:mb-9 max-w-3xl md:max-w-4xl lg:max-w-5xl mt-16 md:mt-20 lg:mt-24 px-6 md:px-4">
        <h1 className="text-foreground text-2xl md:text-4xl lg:text-6xl font-semibold leading-tight">
          비용 <span className="text-primary">ZERO</span>, 성과 <span className="text-primary">MAX</span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base lg:text-lg font-medium leading-relaxed max-w-lg mx-auto">
          인건비 없이도, 한 명이 팀처럼 일하는 마케팅 자동화 솔루션
        </p>

        {/* 4단계 자동화 프로세스 - 참고 코드 스타일 */}
        <div className="mt-8 mb-4">
          <div className="grid grid-cols-4 gap-2 md:gap-3 w-full">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "bg-background/90 border rounded-lg p-3 md:p-4 lg:p-5 relative overflow-hidden transition-all duration-100 h-[120px] md:h-[140px] lg:h-[160px]",
                  activeStep === index 
                    ? "border-primary shadow-lg scale-105" 
                    : "border-border/50 opacity-60"
                )}
              >
                <h3 className="text-xs md:text-sm lg:text-base font-bold mb-2 relative whitespace-nowrap">
                  {step.id}. {step.title}
                  {/* Animated accent underline */}
                  <span 
                    className={cn(
                      "absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-100",
                      activeStep === index ? "w-full" : "w-0"
                    )}
                  />
                </h3>

                {/* Step 1: 타이핑 효과 */}
                {step.id === 1 && activeStep === index && (
                  <div className="absolute bottom-4 left-3 right-3 h-20 flex flex-col justify-center">
                    <div className="typing-text text-xs md:text-sm font-mono text-primary overflow-hidden whitespace-nowrap">
                      <span className="inline-block typing-animation">AI가 콘텐츠 작성중...</span>
                    </div>
                    <div className="typing-text text-xs md:text-sm font-mono text-primary/70 overflow-hidden whitespace-nowrap mt-1">
                      <span className="inline-block typing-animation-delayed">블로그 포스트 생성</span>
                    </div>
                  </div>
                )}

                {/* Step 2: 파티클/퍼널 효과 */}
                {step.id === 2 && activeStep === index && (
                  <div className="absolute bottom-0 left-0 right-0 h-full overflow-hidden">
                    <div className="relative h-full">
                      {[...Array(15)].map((_, i) => (
                        <div 
                          key={i}
                          className="lead-drop" 
                          style={{ 
                            left: `${20 + Math.random() * 50}%`, 
                            animationDelay: `${Math.random() * 0.3}s`,
                            animationDuration: `${0.4 + Math.random() * 0.2}s`
                          }} 
                        />
                      ))}
                    </div>
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3/4 h-6 border-2 border-primary border-t-0 rounded-b-lg bg-gradient-to-b from-transparent to-primary/10" />
                  </div>
                )}

                {/* Step 3: 메일 날아가기 */}
                {step.id === 3 && activeStep === index && (
                  <div className="absolute bottom-8 left-0 right-0 h-12 flex items-center">
                    <div className="envelope-fly absolute w-12 md:w-14 lg:w-16 h-8 md:h-10 lg:h-12">
                      <div className="relative w-full h-full bg-white border-2 border-primary rounded shadow-md">
                        {/* 봉투 플랩 */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-br from-primary/10 to-primary/20 border-b border-primary" 
                             style={{ clipPath: 'polygon(0 0, 50% 100%, 100% 0)' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: 책장 쌓기 */}
                {step.id === 4 && activeStep === index && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center items-end gap-1 h-20">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="book-grow w-3 md:w-4 lg:w-5 bg-primary rounded-sm"
                        style={{ animationDelay: `${i * 0.05}s` }}
                      />
                    ))}
                  </div>
                )}

              </div>
            ))}
          </div>

        </div>

        {/* 지표들 - 크기 1.4배로, 모바일에서도 가로 유지 */}
        <div className="flex justify-center items-center gap-4 md:gap-8 mt-2">
          <div className="text-center">
            <div className="text-xl md:text-3xl lg:text-4xl font-bold text-primary">↓ 70%</div>
            <div className="text-sm md:text-base lg:text-lg text-muted-foreground">고정비</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-3xl lg:text-4xl font-bold text-primary">↑ 300%</div>
            <div className="text-sm md:text-base lg:text-lg text-muted-foreground">업무 속도</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-3xl lg:text-4xl font-bold text-primary">↑ 200%</div>
            <div className="text-sm md:text-base lg:text-lg text-muted-foreground">매출</div>
          </div>
        </div>
      </div>

      {/* Button with reduced spacing from metrics */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-3 md:gap-4 mt-4 md:mt-5 px-6 md:px-0 mb-12 md:mb-16">
        <Button 
          onClick={() => window.location.href = '/signup'}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-12 py-6 rounded-full font-bold text-lg shadow-lg h-auto">
          무료 체험 시작하기
        </Button>
      </div>
    </section>
  )
}
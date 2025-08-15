"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true)

  const pricingPlans = [
    {
      name: "Starter",
      monthlyPrice: "₩0",
      annualPrice: "₩0",
      description: "소규모 비즈니스 시작용",
      features: [
        "기본 자동화 기능",
        "월 100건 콘텐츠 생성",
        "이메일 지원",
        "기본 템플릿",
      ],
      buttonText: "무료로 시작하기",
      buttonClass: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    },
    {
      name: "Growth",
      monthlyPrice: "₩99,000",
      annualPrice: "₩79,000",
      description: "성장하는 비즈니스를 위한",
      features: [
        "모든 자동화 기능",
        "무제한 콘텐츠 생성",
        "우선 지원",
        "프리미엄 템플릿",
        "API 접근",
      ],
      buttonText: "지금 시작하기",
      buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
      popular: true,
    },
    {
      name: "Enterprise",
      monthlyPrice: "맞춤 견적",
      annualPrice: "맞춤 견적",
      description: "대기업을 위한 맞춤형 솔루션",
      features: [
        "전담 계정 관리",
        "맞춤 온보딩",
        "SLA 보장",
        "커스텀 통합",
        "전용 서버",
      ],
      buttonText: "영업팀 문의",
      buttonClass: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    },
  ]

  return (
    <section className="w-full px-5 overflow-hidden flex flex-col justify-start items-center my-0 py-8 md:py-14 bg-background">
      <div className="self-stretch relative flex flex-col justify-center items-center gap-2 py-0">
        <div className="flex flex-col justify-start items-center gap-4">
          <h2 className="text-center text-foreground text-4xl md:text-5xl font-semibold leading-tight md:leading-[40px]">
            인건비 한 달치로, 1년간 팀을 소유하세요
          </h2>
          <p className="self-stretch text-center text-muted-foreground text-sm font-medium leading-tight">
            개인부터 기업까지, 당신의 비즈니스 규모에 맞는 <br /> 마케팅 자동화 솔루션을 선택하세요.
          </p>
        </div>
        <div className="pt-4">
          <div className="p-0.5 bg-muted rounded-lg outline outline-1 outline-border outline-offset-[-1px] flex justify-start items-center gap-1 md:mt-0">
            <button
              onClick={() => setIsAnnual(true)}
              className={`pl-2 pr-1 py-1 flex justify-start items-start gap-2 rounded-md ${isAnnual ? "bg-accent shadow-[0px_1px_1px_-0.5px_rgba(0,0,0,0.08)]" : ""}`}
            >
              <span
                className={`text-center text-sm font-medium leading-tight ${isAnnual ? "text-accent-foreground" : "text-muted-foreground"}`}
              >
                연간 결제
              </span>
            </button>
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-2 py-1 flex justify-start items-start rounded-md ${!isAnnual ? "bg-accent shadow-[0px_1px_1px_-0.5px_rgba(0,0,0,0.08)]" : ""}`}
            >
              <span
                className={`text-center text-sm font-medium leading-tight ${!isAnnual ? "text-accent-foreground" : "text-muted-foreground"}`}
              >
                월간 결제
              </span>
            </button>
          </div>
        </div>
      </div>
      <div className="self-stretch px-5 flex flex-col md:flex-row justify-start items-start gap-4 md:gap-6 mt-6 max-w-[1100px] mx-auto">
        {pricingPlans.map((plan) => (
          <div
            key={plan.name}
            className={`flex-1 p-4 overflow-hidden rounded-xl flex flex-col justify-start items-start gap-6 ${plan.popular ? "bg-primary shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.10)]" : "bg-card"}`}
            style={plan.popular ? {} : { outline: "1px solid hsl(var(--border))", outlineOffset: "-1px" }}
          >
            <div className="self-stretch flex flex-col justify-start items-start gap-6">
              <div className="self-stretch flex flex-col justify-start items-start gap-8">
                <div
                  className={`w-full h-5 text-sm font-medium leading-tight ${plan.popular ? "text-primary-foreground" : "text-foreground"}`}
                >
                  {plan.name}
                  {plan.popular && (
                    <div className="ml-2 px-2 overflow-hidden rounded-full justify-center items-center gap-2.5 inline-flex mt-0 py-0.5 bg-primary-foreground/20">
                      <div className="text-center text-primary-foreground text-xs font-normal leading-tight break-words">
                        인기
                      </div>
                    </div>
                  )}
                </div>
                <div className="self-stretch flex flex-col justify-start items-start gap-1">
                  <div className="flex justify-start items-center gap-1.5">
                    <div
                      className={`relative h-10 flex items-center text-3xl font-medium leading-10 ${plan.popular ? "text-primary-foreground" : "text-foreground"}`}
                    >
                      <span className="invisible">{isAnnual ? plan.annualPrice : plan.monthlyPrice}</span>
                      <span
                        className="absolute inset-0 flex items-center transition-all duration-500"
                        style={{
                          opacity: isAnnual ? 1 : 0,
                          transform: `scale(${isAnnual ? 1 : 0.8})`,
                          filter: `blur(${isAnnual ? 0 : 4}px)`,
                        }}
                        aria-hidden={!isAnnual}
                      >
                        {plan.annualPrice}
                      </span>
                      <span
                        className="absolute inset-0 flex items-center transition-all duration-500"
                        style={{
                          opacity: !isAnnual ? 1 : 0,
                          transform: `scale(${!isAnnual ? 1 : 0.8})`,
                          filter: `blur(${!isAnnual ? 0 : 4}px)`,
                        }}
                        aria-hidden={isAnnual}
                      >
                        {plan.monthlyPrice}
                      </span>
                    </div>
                    <div
                      className={`text-center text-sm font-medium leading-tight ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      /월
                    </div>
                  </div>
                  <div
                    className={`self-stretch text-sm font-medium leading-tight ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                  >
                    {plan.description}
                  </div>
                </div>
              </div>
              <Button
                className={`self-stretch px-5 py-2 rounded-[40px] flex justify-center items-center ${plan.buttonClass}`}
              >
                <div className="px-1.5 flex justify-center items-center gap-2">
                  <span className="text-center text-sm font-medium leading-tight">{plan.buttonText}</span>
                </div>
              </Button>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-4">
              <div
                className={`self-stretch text-sm font-medium leading-tight ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}
              >
                {plan.name === "Starter" ? "무료로 시작하기:" : "Starter 플랜 포함 +"}
              </div>
              <div className="self-stretch flex flex-col justify-start items-start gap-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="self-stretch flex justify-start items-center gap-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <Check
                        className={`w-full h-full ${plan.popular ? "text-primary-foreground" : "text-muted-foreground"}`}
                        strokeWidth={2}
                      />
                    </div>
                    <div
                      className={`leading-tight font-normal text-sm text-left ${plan.popular ? "text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      {feature}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

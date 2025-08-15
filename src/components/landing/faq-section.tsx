"use client"

import type React from "react"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqData = [
  {
    question: "AIMAX는 어떤 비즈니스에 적합한가요?",
    answer:
      "AIMAX는 온라인 쇼핑몰, 로컬 비즈니스, B2B 기업, 서비스업 등 고객과의 접점이 있는 모든 비즈니스에 적합합니다. 특히 마케팅 인력이 부족하거나 반복 작업에 시간을 많이 소비하는 중소기업과 스타트업에게 최적화되어 있습니다. 혼자서 운영하는 1인 기업부터 마케팅팀이 있는 중견기업까지 모두 활용 가능합니다.",
  },
  {
    question: "AI가 작성한 콘텐츠 품질은 어떤가요?",
    answer:
      "AIMAX는 Google의 최신 Gemini AI를 활용하여 SEO에 최적화된 고품질 콘텐츠를 생성합니다. 단순한 텍스트 생성이 아닌, 키워드 분석, 타겟 고객 분석, 경쟁사 분석을 통해 전략적인 콘텐츠를 제작합니다. 생성된 콘텐츠는 바로 사용 가능한 수준이며, 필요시 간단한 수정만으로 브랜드 톤앤매너에 맞출 수 있습니다.",
  },
  {
    question: "설정이 복잡하지 않나요?",
    answer:
      "AIMAX는 복잡한 설정 없이 5분 안에 시작할 수 있도록 설계되었습니다. 구글 계정만 있으면 구글폼, 구글시트, Gmail과 원클릭으로 연동됩니다. 직관적인 UI와 단계별 가이드를 제공하며, 어려운 부분은 고객지원팀이 원격으로 설정을 도와드립니다. 코딩이나 기술 지식이 전혀 없어도 누구나 쉽게 사용할 수 있습니다.",
  },
  {
    question: "기술 지원은 받을 수 있나요?",
    answer:
      "모든 플랜에서 이메일 지원을 제공하며, Growth 플랜부터는 우선 지원을 받을 수 있습니다. 실시간 채팅 상담, 원격 지원, 1:1 온보딩 세션을 제공합니다. 또한 상세한 사용 가이드와 비디오 튜토리얼을 제공하여 스스로 학습할 수 있도록 지원합니다. Enterprise 플랜의 경우 전담 매니저가 배정됩니다.",
  },
  {
    question: "환불 정책은 어떻게 되나요?",
    answer:
      "AIMAX는 30일 무조건 환불 정책을 운영합니다. 서비스가 만족스럽지 않으시다면 구매 후 30일 이내에 전액 환불을 요청하실 수 있습니다. 별도의 위약금이나 수수료 없이 간단한 요청만으로 처리됩니다. 먼저 3회 무료 체험을 통해 충분히 경험해보시고 결정하실 것을 권장합니다.",
  },
]

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

const FAQItem = ({ question, answer, isOpen, onToggle }: FAQItemProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onToggle()
  }
  return (
    <div
      className={`w-full bg-[rgba(231,236,235,0.08)] shadow-[0px_2px_4px_rgba(0,0,0,0.16)] overflow-hidden rounded-[10px] outline outline-1 outline-border outline-offset-[-1px] transition-all duration-500 ease-out cursor-pointer`}
      onClick={handleClick}
    >
      <div className="w-full px-5 py-[18px] pr-4 flex justify-between items-center gap-5 text-left transition-all duration-300 ease-out">
        <div className="flex-1 text-foreground text-base font-medium leading-6 break-words">{question}</div>
        <div className="flex justify-center items-center">
          <ChevronDown
            className={`w-6 h-6 text-muted-foreground-dark transition-all duration-500 ease-out ${isOpen ? "rotate-180 scale-110" : "rotate-0 scale-100"}`}
          />
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-500 ease-out ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
        style={{
          transitionProperty: "max-height, opacity, padding",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          className={`px-5 transition-all duration-500 ease-out ${isOpen ? "pb-[18px] pt-2 translate-y-0" : "pb-0 pt-0 -translate-y-2"}`}
        >
          <div className="text-foreground/80 text-sm font-normal leading-6 break-words">{answer}</div>
        </div>
      </div>
    </div>
  )
}

export function FAQSection() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())
  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }
  return (
    <section className="w-full pt-[66px] pb-20 md:pb-40 px-5 relative flex flex-col justify-center items-center bg-background">
      <div className="w-[300px] h-[500px] absolute top-[150px] left-1/2 -translate-x-1/2 origin-top-left rotate-[-33.39deg] bg-muted/30 blur-[100px] z-0" />
      <div className="self-stretch pt-8 pb-8 md:pt-14 md:pb-14 flex flex-col justify-center items-center gap-2 relative z-10">
        <div className="flex flex-col justify-start items-center gap-4">
          <h2 className="w-full max-w-[435px] text-center text-foreground text-4xl font-semibold leading-10 break-words">
            자주 묻는 질문
          </h2>
          <p className="self-stretch text-center text-muted-foreground text-sm font-medium leading-[18.20px] break-words">
            AIMAX에 대해 궁금한 모든 것을 확인해보세요
          </p>
        </div>
      </div>
      <div className="w-full max-w-[600px] pt-0.5 pb-10 flex flex-col justify-start items-start gap-4 relative z-10">
        {faqData.map((faq, index) => (
          <FAQItem key={index} {...faq} isOpen={openItems.has(index)} onToggle={() => toggleItem(index)} />
        ))}
      </div>
    </section>
  )
}

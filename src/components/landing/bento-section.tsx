import AiCodeReviews from "./bento/ai-code-reviews"
import RealtimeCodingPreviews from "./bento/real-time-previews"
import OneClickIntegrationsIllustration from "./bento/one-click-integrations-illustration"
import MCPConnectivityIllustration from "./bento/mcp-connectivity-illustration"
import EasyDeployment from "./bento/easy-deployment"
import ParallelCodingAgents from "./bento/parallel-agents"
import type { FC } from "react"

interface BentoCardProps {
  title: string
  description: string
  Component: FC
}

const BentoCard = ({ title, description, Component }: BentoCardProps) => (
  <div className="overflow-hidden rounded-2xl border border-foreground/10 flex flex-col justify-start items-start relative">
    {/* Background with blur effect */}
    <div
      className="absolute inset-0 rounded-2xl"
      style={{
        background: "rgba(19, 19, 19, 0.03)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    />
    {/* Additional subtle gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />

    <div className="self-stretch p-6 flex flex-col justify-start items-start gap-2 relative z-10">
      <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
        <p className="self-stretch text-foreground text-lg font-normal leading-7">
          {title} <br />
          <span className="text-muted-foreground">{description}</span>
        </p>
      </div>
    </div>
    <div className="self-stretch h-72 relative -mt-0.5 z-10">
      <Component />
    </div>
  </div>
)

export function BentoSection() {
  const cards = [
    {
      title: "AI 콘텐츠 생성",
      description: "Gemini AI로 SEO 최적화된 블로그/스레드 자동 생성",
      Component: AiCodeReviews,
    },
    {
      title: "실시간 대시보드",
      description: "모든 캠페인 성과를 한눈에 확인하고 관리",
      Component: RealtimeCodingPreviews,
    },
    {
      title: "원클릭 통합",
      description: "구글폼, 구글시트, Gmail 완벽 연동",
      Component: OneClickIntegrationsIllustration,
    },
    {
      title: "스마트 DB 관리",
      description: "구글시트 연동으로 실시간 고객 데이터 자동 수집",
      Component: MCPConnectivityIllustration,
    },
    {
      title: "대량 이메일 발송",
      description: "선별된 고객에게 맞춤형 이메일 자동 발송",
      Component: ParallelCodingAgents,
    },
    {
      title: "자동 고객 선별",
      description: "팔로워 수 기준으로 타겟 고객만 정확히 필터링",
      Component: EasyDeployment,
    },
  ]

  return (
    <section className="w-full px-5 flex flex-col justify-center items-center overflow-visible bg-transparent">
      <div className="w-full py-8 md:py-16 relative flex flex-col justify-start items-start gap-6">
        <div className="w-[547px] h-[938px] absolute top-[614px] left-[80px] origin-top-left rotate-[-33.39deg] bg-primary/10 blur-[130px] z-0" />
        <div className="self-stretch py-8 md:py-14 flex flex-col justify-center items-center gap-2 z-10">
          <div className="flex flex-col justify-start items-center gap-4">
            <h2 className="w-full max-w-[655px] text-center text-foreground text-4xl md:text-6xl font-semibold leading-tight md:leading-[66px]">
              한 명이 팀처럼, 모든 마케팅 자동화
            </h2>
            <p className="w-full max-w-[600px] text-center text-muted-foreground text-lg md:text-xl font-medium leading-relaxed">
              복잡한 마케팅 업무를 AI가 대신합니다. 당신은 전략에만 집중하세요
            </p>
          </div>
        </div>
        <div className="self-stretch grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          {cards.map((card) => (
            <BentoCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  )
}

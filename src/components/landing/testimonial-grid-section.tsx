import Image from "next/image"

const testimonials = [
  {
    quote:
      "AIMAX 도입 후 마케팅 인건비가 70% 절감되었고, 매출은 오히려 200% 증가했습니다. 한 명이 팀처럼 일하는 게 정말 가능하더군요.",
    name: "김민수",
    company: "스마트커머스",
    avatar: "/images/avatars/annette-black.png",
    type: "large-teal",
  },
  {
    quote: "복잡한 마케팅 프로세스를 AIMAX가 자동으로 처리해주니 핵심 업무에만 집중할 수 있게 되었습니다.",
    name: "박지영",
    company: "뷰티브랜드",
    avatar: "/images/avatars/dianne-russell.png",
    type: "small-dark",
  },
  {
    quote: "광고 제작부터 고객 관리까지 모든 것이 자동화되어 업무 효율이 300% 향상되었습니다.",
    name: "이준호",
    company: "테크스타트업",
    avatar: "/images/avatars/cameron-williamson.png",
    type: "small-dark",
  },
  {
    quote: "AIMAX 덕분에 마케팅 대행사 없이도 전문적인 마케팅이 가능해졌습니다. 비용 절감 효과가 놀랍습니다.",
    name: "최수진",
    company: "로컬비즈니스",
    avatar: "/images/avatars/robert-fox.png",
    type: "small-dark",
  },
  {
    quote: "처음엔 반신반의했지만, 지금은 AIMAX 없는 마케팅은 상상할 수 없습니다. 정말 혁신적이에요.",
    name: "정태현",
    company: "온라인쇼핑몰",
    avatar: "/images/avatars/darlene-robertson.png",
    type: "small-dark",
  },
  {
    quote: "데이터 기반 마케팅이 이렇게 쉬울 줄 몰랐습니다. AIMAX가 알아서 최적화까지 해주니 정말 편해요.",
    name: "한소영",
    company: "패션브랜드",
    avatar: "/images/avatars/cody-fisher.png",
    type: "small-dark",
  },
  {
    quote:
      "AIMAX로 마케팅 자동화를 구축한 후, 매출이 지속적으로 성장하고 있습니다. 시간이 갈수록 더 똑똑해지는 시스템이 정말 신기해요.",
    name: "오성민",
    company: "서비스업체",
    avatar: "/images/avatars/albert-flores.png",
    type: "large-light",
  },
]

interface TestimonialCardProps {
  quote: string
  name: string
  company: string
  avatar: string
  type: string
}

const TestimonialCard = ({ quote, name, company, avatar, type }: TestimonialCardProps) => {
  const isLargeCard = type.startsWith("large")
  const avatarSize = isLargeCard ? 48 : 36
  const avatarBorderRadius = isLargeCard ? "rounded-[41px]" : "rounded-[30.75px]"
  const padding = isLargeCard ? "p-6" : "p-[30px]"

  let cardClasses = `flex flex-col justify-between items-start overflow-hidden rounded-[10px] shadow-[0px_2px_4px_rgba(0,0,0,0.08)] relative ${padding}`
  let quoteClasses = ""
  let nameClasses = ""
  let companyClasses = ""
  let backgroundElements = null
  let cardHeight = ""
  const cardWidth = "w-full md:w-[384px]"

  if (type === "large-teal") {
    cardClasses += " bg-primary"
    quoteClasses += " text-primary-foreground text-2xl font-medium leading-8"
    nameClasses += " text-primary-foreground text-base font-normal leading-6"
    companyClasses += " text-primary-foreground/60 text-base font-normal leading-6"
    cardHeight = "h-[502px]"
    backgroundElements = (
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/large-card-background.svg')", zIndex: 0 }}
      />
    )
  } else if (type === "large-light") {
    cardClasses += " bg-[rgba(231,236,235,0.12)]"
    quoteClasses += " text-foreground text-2xl font-medium leading-8"
    nameClasses += " text-foreground text-base font-normal leading-6"
    companyClasses += " text-muted-foreground text-base font-normal leading-6"
    cardHeight = "h-[502px]"
    backgroundElements = (
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: "url('/images/large-card-background.svg')", zIndex: 0 }}
      />
    )
  } else {
    cardClasses += " bg-card outline outline-1 outline-border outline-offset-[-1px]"
    quoteClasses += " text-foreground/80 text-[17px] font-normal leading-6"
    nameClasses += " text-foreground text-sm font-normal leading-[22px]"
    companyClasses += " text-muted-foreground text-sm font-normal leading-[22px]"
    cardHeight = "h-[244px]"
  }

  return (
    <div className={`${cardClasses} ${cardWidth} ${cardHeight}`}>
      {backgroundElements}
      <div className={`relative z-10 font-normal break-words ${quoteClasses}`}>{quote}</div>
      <div className="relative z-10 flex justify-start items-center gap-3">
        <Image
          src={avatar || "/placeholder.svg"}
          alt={`${name} avatar`}
          width={avatarSize}
          height={avatarSize}
          className={`w-${avatarSize / 4} h-${avatarSize / 4} ${avatarBorderRadius}`}
          style={{ border: "1px solid rgba(255, 255, 255, 0.08)" }}
        />
        <div className="flex flex-col justify-start items-start gap-0.5">
          <div className={nameClasses}>{name}</div>
          <div className={companyClasses}>{company}</div>
        </div>
      </div>
    </div>
  )
}

export function TestimonialGridSection() {
  return (
    <section className="w-full px-5 overflow-hidden flex flex-col justify-start py-6 md:py-8 lg:py-14 bg-background">
      <div className="self-stretch py-6 md:py-8 lg:py-14 flex flex-col justify-center items-center gap-2">
        <div className="flex flex-col justify-start items-center gap-4">
          <h2 className="text-center text-foreground text-3xl md:text-4xl lg:text-[40px] font-semibold leading-tight md:leading-tight lg:leading-[40px]">
            이미 수많은 기업이 AIMAX로 성장하고 있습니다
          </h2>
          <p className="self-stretch text-center text-muted-foreground text-sm md:text-sm lg:text-base font-medium leading-[18.20px] md:leading-relaxed lg:leading-relaxed">
            {"실제 고객들이 경험한 AIMAX의 놀라운 성과를"} <br /> {"직접 확인해보세요"}
          </p>
        </div>
      </div>
      <div className="w-full pt-0.5 pb-4 md:pb-6 lg:pb-10 flex flex-col md:flex-row justify-center items-start gap-4 md:gap-4 lg:gap-6 max-w-[1100px] mx-auto">
        <div className="flex-1 flex flex-col justify-start items-start gap-4 md:gap-4 lg:gap-6">
          <TestimonialCard {...testimonials[0]} />
          <TestimonialCard {...testimonials[1]} />
        </div>
        <div className="flex-1 flex flex-col justify-start items-start gap-4 md:gap-4 lg:gap-6">
          <TestimonialCard {...testimonials[2]} />
          <TestimonialCard {...testimonials[3]} />
          <TestimonialCard {...testimonials[4]} />
        </div>
        <div className="flex-1 flex flex-col justify-start items-start gap-4 md:gap-4 lg:gap-6">
          <TestimonialCard {...testimonials[5]} />
          <TestimonialCard {...testimonials[6]} />
        </div>
      </div>
    </section>
  )
}

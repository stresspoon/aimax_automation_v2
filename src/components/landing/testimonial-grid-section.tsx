const testimonials = [
  {
    quote:
      "외부 대행사에 의존하지 않고도 직접 마케팅 시스템을 구축할 수 있다는 사실이 현실이 되었습니다.",
    name: "김O수",
    company: "뷰티 브랜드 운영",
    type: "large-teal",
  },
  {
    quote: "AI 가 너무 막강해져서 너무 자동화되어서 결과가 뚝딱 나오니 '이렇게 해도 되는건가' 하는 생각이들정도 입니다.",
    name: "이O호",
    company: "마케팅 대행사 대표",
    type: "small-dark",
  },
  {
    quote: "사람일을 대신 맡길수 있어서 너무 좋았고 블로그 글 ,콘텐츠기획, sns 글작성등 그리고 수익화까지 AI를 통해서 할수 있는 부분이 매력적입니다.",
    name: "박O진",
    company: "커머스 운영자",
    type: "small-dark",
  },
  {
    quote: "몇 시간 걸리던 블로그 글 작성도 AI로 단 몇 분 만에 가능했고, 콘텐츠 기획부터 디자인, 마케팅까지 혼자서도 해낼 수 있어서 행복합니다.",
    name: "최O아",
    company: "IT 스타트업 PM",
    type: "small-dark",
  },
  {
    quote: "글쓰기 뿐만이라 정말 1명의 기획자, 아니 그 이상을 일해줄 AI 직원을 찾았습니다.",
    name: "윤O준",
    company: "콘텐츠 크리에이터",
    type: "small-dark",
  },
  {
    quote: "'멀티유즈'라는 개념 덕분에 반복 작업을 크게 줄이고 효율적으로 다양한 채널에 콘텐츠를 배포 가능하니 이보다 효율적일 수 없네요.",
    name: "정O영",
    company: "교육 서비스 운영",
    type: "small-dark",
  },
  {
    quote:
      "가장 인상 깊었던 건 블로그·SNS 통합 자동화 기능이었어요. 키워드만 던지면 블로그 글 → 스레드 → 인스타용 캡션까지 일괄 생성! 일주일 걸리던 콘텐츠 루틴이 10분으로 단축됐습니다.",
    name: "오O민",
    company: "로컬 디자이너",
    type: "large-light",
  },
]

interface TestimonialCardProps { quote: string; name?: string; company?: string; avatar?: string; type: string }

const TestimonialCard = ({ quote, name, company, avatar, type }: TestimonialCardProps) => {
  const isLargeCard = type.startsWith("large")
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
    quoteClasses += " text-white text-2xl font-medium leading-8"
    nameClasses += " text-white text-base font-semibold leading-6"
    companyClasses += " text-white/80 text-base font-normal leading-6"
    cardHeight = "h-[502px]"
    backgroundElements = (
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          WebkitMaskImage: "url('/images/large-card-background.svg')",
          maskImage: "url('/images/large-card-background.svg')",
          WebkitMaskSize: "cover",
          maskSize: "cover",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          backgroundColor: "hsl(var(--primary))",
          opacity: 0.7,
          zIndex: 0,
        }}
      />
    )
  } else if (type === "large-light") {
    cardClasses += " bg-[rgba(231,236,235,0.12)]"
    quoteClasses += " text-white text-2xl font-medium leading-8"
    nameClasses += " text-white text-base font-normal leading-6"
    companyClasses += " text-white/80 text-base font-normal leading-6"
    cardHeight = "h-[502px]"
    backgroundElements = (
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          WebkitMaskImage: "url('/images/large-card-background.svg')",
          maskImage: "url('/images/large-card-background.svg')",
          WebkitMaskSize: "cover",
          maskSize: "cover",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          backgroundColor: "hsl(var(--primary))",
          opacity: 0.7,
          zIndex: 0,
        }}
        
      />
    )
  } else {
    cardClasses += " bg-card outline outline-1 outline-border outline-offset-[-1px]"
    quoteClasses += " text-[#131313] text-[17px] font-normal leading-6"
    nameClasses += " text-[#131313] text-sm font-semibold leading-[22px]"
    companyClasses += " text-muted-foreground text-sm font-normal leading-[22px]"
    cardHeight = "h-[244px]"
  }

  return (
    <div className={`${cardClasses} ${cardWidth} ${cardHeight}`}>
      {backgroundElements}
      <div className={`relative z-10 font-normal break-words ${quoteClasses}`}>{quote}</div>
      {(name || company) && (
        <div className="relative z-10 flex flex-col justify-start items-start gap-0.5">
          {name && <div className={nameClasses}>{name}</div>}
          {company && <div className={companyClasses}>{company}</div>}
        </div>
      )}
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

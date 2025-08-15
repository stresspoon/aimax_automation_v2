"use client"

import { cn } from "@/lib/utils"

interface AutomationStepsProps {
  activeStep: number
}

export function AutomationSteps({ activeStep }: AutomationStepsProps) {
  const steps = [
    {
      title: "컨텐츠가 알아서 발행되고",
      icon: <TypeAnimation />,
      description: "예약·스케줄러가 자동으로 콘텐츠 발행"
    },
    {
      title: "고객이 알아서 모이고",
      icon: <FunnelAnimation />,
      description: "유입 → 전환 자동화"
    },
    {
      title: "DB로 메일이 나가고",
      icon: <MailAnimation />,
      description: "DB 저장 → 메일 자동 발송"
    },
    {
      title: "컨텐츠가 쌓이는",
      icon: <LibraryAnimation />,
      description: "콘텐츠 자산 축적"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
      {steps.map((step, index) => (
        <div
          key={index}
          className={cn(
            "relative bg-card rounded-xl p-6 transition-all duration-500",
            "border shadow-sm hover:shadow-lg",
            activeStep === index 
              ? "scale-105 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent" 
              : "opacity-70"
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className={cn(
              "text-sm font-bold",
              activeStep === index ? "text-primary" : "text-muted-foreground"
            )}>
              {index + 1}
            </span>
            <h3 className="text-sm font-semibold">{step.title}</h3>
          </div>
          
          <div className="h-20 flex items-center justify-center mb-3">
            {step.icon}
          </div>
          
          <p className="text-xs text-muted-foreground">{step.description}</p>
          
          {index < 3 && (
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 hidden md:block">
              <ArrowAnimation />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function TypeAnimation() {
  return (
    <div className="relative w-full">
      <div className="type-animation text-xs text-primary font-mono">
        /publish 08:00 | 블로그 1건
      </div>
    </div>
  )
}

function FunnelAnimation() {
  return (
    <div className="relative w-full h-full">
      <div className="relative w-16 h-16 mx-auto">
        <div className="absolute inset-0 border-2 border-primary/30 border-t-0 rounded-b-xl" 
             style={{ clipPath: "polygon(10% 0%, 90% 0%, 70% 100%, 30% 100%)" }} />
        <div className="lead-drop" style={{ top: "-10px", left: "20%", animationDelay: "0s" }} />
        <div className="lead-drop" style={{ top: "-10px", left: "50%", animationDelay: "0.5s" }} />
        <div className="lead-drop" style={{ top: "-10px", left: "80%", animationDelay: "1s" }} />
      </div>
    </div>
  )
}

function MailAnimation() {
  return (
    <div className="relative w-full h-full">
      <div className="envelope-fly absolute left-0 top-1/2 -translate-y-1/2 w-10 h-7 bg-card border-2 border-primary rounded">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/20" />
      </div>
    </div>
  )
}

function LibraryAnimation() {
  return (
    <div className="flex items-end gap-1 h-full justify-center">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="book-grow w-2 bg-primary/80 rounded"
          style={{ animationDelay: `${i * 0.6}s` }}
        />
      ))}
    </div>
  )
}

function ArrowAnimation() {
  return (
    <div className="relative w-12 h-1">
      <div className="arrow-flow absolute inset-0" />
      <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-primary text-xs">
        ▶
      </span>
    </div>
  )
}
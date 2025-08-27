"use client"


export function FooterSection() {
  return (
    <footer className="w-full max-w-[1320px] mx-auto px-5 py-10 md:py-[70px]">
      <div className="flex flex-col gap-3 text-sm text-muted-foreground">
        <div className="text-foreground text-xl font-semibold">AIMAX</div>
        <p><span className="font-medium">상호</span>: AIXLIFE</p>
        <p><span className="font-medium">사업자 등록번호</span>: 789-71-00438</p>
        <p><span className="font-medium">전화번호</span>: 010-3709-0516</p>
        <p><span className="font-medium">주소</span>: 경기도 광명시 일직로 43 GIDC A동 2513호</p>
        <p><span className="font-medium">고객지원</span>: <a href="mailto:naminsoo@aixlife.co.kr" className="underline hover:no-underline">naminsoo@aixlife.co.kr</a></p>
      </div>
    </footer>
  )
}

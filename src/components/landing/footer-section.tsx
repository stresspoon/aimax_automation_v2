"use client"


export function FooterSection() {
  return (
    <footer className="w-full max-w-[1320px] mx-auto px-5 flex flex-col md:flex-row justify-between items-start gap-8 md:gap-0 py-10 md:py-[70px]">
      {/* Left Section: Logo, Description, Social Links */}
      <div className="flex flex-col justify-start items-start gap-8 p-4 md:p-8">
        <div className="flex gap-3 items-stretch justify-center">
          <div className="text-center text-foreground text-xl font-semibold leading-4">AIMAX</div>
        </div>
        <p className="text-foreground/90 text-sm font-medium leading-[18px] text-left">마케팅 자동화의 새로운 기준</p>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>고객지원: support@aimax.com</p>
          <p>© 2024 AIMAX. All rights reserved.</p>
        </div>
      </div>
      {/* Right Section: Product, Company, Resources */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 p-4 md:p-8 w-full md:w-auto">
        <div className="flex flex-col justify-start items-start gap-3">
          <h3 className="text-muted-foreground text-sm font-medium leading-5">제품</h3>
          <div className="flex flex-col justify-end items-start gap-2">
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              기능
            </a>
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              가격
            </a>
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              통합
            </a>
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              자동화 시스템
            </a>
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              AI 마케팅
            </a>
          </div>
        </div>
        <div className="flex flex-col justify-start items-start gap-3">
          <h3 className="text-muted-foreground text-sm font-medium leading-5">회사</h3>
          <div className="flex flex-col justify-center items-start gap-2">
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              회사 소개
            </a>
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              팀
            </a>
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              채용
            </a>
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              브랜드
            </a>
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              연락처
            </a>
          </div>
        </div>
        <div className="flex flex-col justify-start items-start gap-3">
          <h3 className="text-muted-foreground text-sm font-medium leading-5">리소스</h3>
          <div className="flex flex-col justify-center items-start gap-2">
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              이용약관
            </a>
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              API 문서
            </a>
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              가이드
            </a>
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              커뮤니티
            </a>
            <a href="#" className="text-foreground text-sm font-normal leading-5 hover:underline">
              지원
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

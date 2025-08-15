export function UseCasesSection() {
  return (
    <section className="w-full px-5 py-16 md:py-24 flex flex-col justify-center items-center">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">AIMAX, 이렇게 사용하세요</h2>
          <p className="text-xl text-muted-foreground">실제 비즈니스에서 AIMAX가 어떻게 활용되는지 확인해보세요</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 rounded-2xl border border-primary/20">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <div className="w-8 h-8 bg-primary rounded-full"></div>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">쇼핑몰 마케팅 자동화</h3>
            <p className="text-muted-foreground mb-6">상품 분석부터 광고 집행, 고객 관리까지 완전 자동화</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">기존 투입 시간</span>
                <span className="text-red-500">주 40시간</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">AIMAX 적용 후</span>
                <span className="text-green-600">주 5시간</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-foreground">효율성 증대</span>
                <span className="text-primary">800%</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 rounded-2xl border border-primary/20">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <div className="w-8 h-8 bg-primary rounded-full"></div>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">서비스 예약 고객 확보</h3>
            <p className="text-muted-foreground mb-6">타겟 고객 발굴부터 예약 유도까지 자동화된 마케팅 퍼널</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">기존 예약률</span>
                <span className="text-red-500">2.3%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">AIMAX 적용 후</span>
                <span className="text-green-600">7.8%</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-foreground">예약률 증가</span>
                <span className="text-primary">339%</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 rounded-2xl border border-primary/20">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <div className="w-8 h-8 bg-primary rounded-full"></div>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">콘텐츠·광고 제작 자동화</h3>
            <p className="text-muted-foreground mb-6">브랜드 맞춤 콘텐츠 생성부터 SNS 업로드까지 완전 자동화</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">기존 제작 시간</span>
                <span className="text-red-500">콘텐츠당 4시간</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">AIMAX 적용 후</span>
                <span className="text-green-600">콘텐츠당 15분</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-foreground">시간 단축</span>
                <span className="text-primary">1600%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

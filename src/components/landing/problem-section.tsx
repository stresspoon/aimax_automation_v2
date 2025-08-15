export function ProblemSection() {
  return (
    <section className="w-full px-5 py-16 md:py-24 flex flex-col justify-center items-center">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
          당신의 마케팅, 아직도 사람 손에만 맡기고 있나요?
        </h2>

        <div className="grid md:grid-cols-3 gap-8 mt-12">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-primary rounded-full"></div>
            </div>
            <h3 className="text-xl font-semibold text-foreground">고정비 부담</h3>
            <p className="text-muted-foreground">인건비, 마케팅 대행료, 운영비로 인한 지속적인 비용 부담</p>
          </div>

          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-primary rounded-full"></div>
            </div>
            <h3 className="text-xl font-semibold text-foreground">AI 활용의 장벽</h3>
            <p className="text-muted-foreground">AI를 알아도 못 쓰는 이유 - 체계적인 프로세스의 부재</p>
          </div>

          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-primary rounded-full"></div>
            </div>
            <h3 className="text-xl font-semibold text-foreground">성장 한계</h3>
            <p className="text-muted-foreground">사람이 늘어나야만 매출이 늘어나는 구조적 한계</p>
          </div>
        </div>

        <div className="mt-16 p-8 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-left">
              <h3 className="text-2xl font-bold text-foreground mb-4">현재 vs AIMAX</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">월 인건비</span>
                  <span className="text-red-500">300만원+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">광고 관리</span>
                  <span className="text-red-500">수동</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">콘텐츠 제작</span>
                  <span className="text-red-500">외주 의존</span>
                </div>
              </div>
            </div>
            <div className="text-left">
              <h3 className="text-2xl font-bold text-primary mb-4">AIMAX 적용 후</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">월 비용</span>
                  <span className="text-green-600">90만원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">광고 관리</span>
                  <span className="text-green-600">완전 자동화</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">콘텐츠 제작</span>
                  <span className="text-green-600">AI 자동 생성</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

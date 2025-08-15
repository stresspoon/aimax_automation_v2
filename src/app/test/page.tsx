export default function TestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">테스트 페이지</h1>
        <p className="text-muted-foreground mb-4">CSS 스타일이 제대로 적용되는지 확인합니다.</p>
        
        <div className="grid gap-4">
          <div className="bg-primary text-primary-foreground p-4 rounded">
            Primary 색상 테스트 - 오렌지색 배경에 흰색 텍스트
          </div>
          
          <div className="bg-card p-4 rounded border border-border">
            카드 배경 테스트 - 밝은 배경색
          </div>
          
          <div className="bg-secondary text-secondary-foreground p-4 rounded">
            Secondary 색상 테스트
          </div>
          
          <div style={{ backgroundColor: 'hsl(14, 100%, 50%)' }} className="text-white p-4 rounded">
            인라인 스타일 테스트 - 오렌지색 배경
          </div>
          
          <div style={{ backgroundColor: 'hsl(40, 8%, 95%)' }} className="p-4 rounded">
            인라인 스타일 테스트 - 배경색
          </div>
        </div>
      </div>
    </div>
  );
}
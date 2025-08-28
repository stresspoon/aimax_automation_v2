import type React from "react"

const AiCodeReviews: React.FC = () => {
  const themeVars = {
    "--ai-primary-color": "hsl(var(--primary))",
    "--ai-background-color": "hsl(var(--background))",
    "--ai-text-color": "hsl(var(--foreground))",
    "--ai-muted": "hsl(var(--muted-foreground))",
    "--ai-border": "hsl(var(--border))",
    "--ai-glass": "hsl(var(--card) / 0.2)",
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "transparent",
        ...themeVars,
      } as React.CSSProperties}
      role="img"
      aria-label="AI Content generation showing keywords to blog/thread outputs"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1.5fr",
          gap: "16px",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            border: "1px solid var(--ai-border)",
            borderRadius: 10,
            background: "linear-gradient(180deg, var(--ai-glass) 0%, transparent 100%)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--ai-muted)", fontSize: 12 }}>키워드 입력</span>
            <span style={{ background: "var(--ai-primary-color)", color: "hsl(var(--primary-foreground))", borderRadius: 6, padding: "2px 6px", fontSize: 10 }}>GPT-5</span>
          </div>
          <div style={{ border: "1px solid var(--ai-border)", borderRadius: 8, padding: 8 }}>
            <div style={{ color: "var(--ai-text-color)", fontSize: 12 }}>메인: 네이버 블로그 SEO</div>
            <div style={{ color: "var(--ai-muted)", fontSize: 12 }}>연관: 키워드 밀도, 클릭 유도 제목, 내부링크</div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["블로그", "스레드", "인스타 캡션"].map((t) => (
              <span key={t} style={{ border: "1px solid var(--ai-border)", borderRadius: 999, padding: "2px 8px", fontSize: 11, color: "var(--ai-muted)" }}>{t}</span>
            ))}
          </div>
          <button
            style={{
              marginTop: "auto",
              alignSelf: "flex-end",
              background: "var(--ai-primary-color)",
              color: "hsl(var(--primary-foreground))",
              border: "none",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              cursor: "default",
            }}
          >
            생성하기
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 12 }}>
          {[{ title: "블로그 초안", accent: true }, { title: "스레드 요약", accent: false }].map((b, i) => (
            <div key={i} style={{ position: "relative", border: "1px solid var(--ai-border)", borderRadius: 10, overflow: "hidden", background: "linear-gradient(180deg, var(--ai-glass) 0%, transparent 100%)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10 }}>
                <span style={{ color: "var(--ai-text-color)", fontSize: 13, fontWeight: 600 }}>{b.title}</span>
                <span style={{ color: "var(--ai-muted)", fontSize: 11 }}>SEO 최적화</span>
              </div>
              <div style={{ padding: 10, paddingTop: 0, fontSize: 12, color: "var(--ai-text-color)" }}>
                <div style={{ height: 10, background: "hsl(var(--foreground)/0.08)", borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 10, background: "hsl(var(--foreground)/0.08)", borderRadius: 4, width: "92%", marginBottom: 6 }} />
                <div style={{ height: 10, background: "hsl(var(--foreground)/0.08)", borderRadius: 4, width: "85%", marginBottom: 6 }} />
                <div style={{ height: 10, background: "hsl(var(--foreground)/0.08)", borderRadius: 4, width: "88%" }} />
              </div>
              <div style={{ position: "absolute", left: 10, bottom: 10, right: 10, height: 10, background: "hsl(var(--primary)/0.15)", borderRadius: 999 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AiCodeReviews

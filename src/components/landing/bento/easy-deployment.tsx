import type React from "react"

interface DeploymentEasyProps {
  /** Width of component – number (px) or any CSS size value */
  width?: number | string
  /** Height of component – number (px) or any CSS size value */
  height?: number | string
  /** Extra Tailwind / CSS classes for root element */
  className?: string
}

const DeploymentEasy: React.FC<DeploymentEasyProps> = ({ width = "100%", height = "100%", className = "" }) => {
  // Theme tokens
  const themeVars = {
    "--select-primary": "hsl(var(--primary))",
    "--select-bg": "hsl(var(--background))",
    "--select-text": "hsl(var(--foreground))",
    "--select-muted": "hsl(var(--muted-foreground))",
    "--select-border": "hsl(var(--border))",
    "--select-glass": "hsl(var(--card) / 0.2)",
  } as React.CSSProperties

  // Demo candidates
  const candidates = [
    { name: "@brand_studio", followers: 15200 },
    { name: "@min_works", followers: 980 },
    { name: "@daily_market", followers: 4100 },
    { name: "@mkt_lab", followers: 7200 },
    { name: "@local_shop", followers: 620 },
    { name: "@beauty_pick", followers: 13400 },
    { name: "@edu_creator", followers: 2450 },
    { name: "@design_hub", followers: 870 },
  ]
  const threshold = 1000
  const filtered = candidates.filter((c) => c.followers >= threshold)

  return (
    <div
      className={`w-full h-full flex items-center justify-center p-4 relative ${className}`}
      style={{ width, height, position: "relative", background: "transparent", ...themeVars }}
      role="img"
      aria-label="Follower threshold filtering visualization"
    >
      {/* Container */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 340,
          height: 239,
          background: "linear-gradient(180deg, var(--select-bg) 0%, transparent 100%)",
          backdropFilter: "blur(8px)",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid var(--select-border)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderBottom: "1px solid var(--select-border)",
          }}
        >
          <span style={{ color: "var(--select-muted)", fontSize: 12 }}>필터</span>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "≥ 1,000", active: true },
              { label: "≥ 5,000", active: false },
              { label: "≥ 10,000", active: false },
            ].map((chip) => (
              <span
                key={chip.label}
                style={{
                  border: `1px solid ${chip.active ? "var(--select-primary)" : "var(--select-border)"}`,
                  color: chip.active ? "var(--select-primary)" : "var(--select-muted)",
                  background: chip.active ? "hsl(var(--primary) / 0.08)" : "var(--select-glass)",
                  borderRadius: 999,
                  padding: "3px 8px",
                  fontSize: 11,
                  whiteSpace: "nowrap",
                }}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {candidates.map((c) => {
            const ok = c.followers >= threshold
            return (
              <div
                key={c.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: `1px solid ${ok ? "var(--select-primary)" : "var(--select-border)"}`,
                  background: ok ? "hsl(var(--primary) / 0.06)" : "linear-gradient(180deg, var(--select-glass) 0%, transparent 100%)",
                  borderRadius: 8,
                  padding: "6px 10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 999, background: ok ? "var(--select-primary)" : "hsl(var(--foreground)/0.15)" }} />
                  <span style={{ color: "var(--select-text)", fontSize: 12 }}>{c.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: ok ? "var(--select-primary)" : "var(--select-muted)", fontSize: 12 }}>{c.followers.toLocaleString()} 팔로워</span>
                  {ok && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3.5 7.5L6 10l4.5-6" stroke="var(--select-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 12,
            right: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "var(--select-muted)", fontSize: 12 }}>
            대상 {candidates.length}명 → 필터 후 {filtered.length}명
          </span>
          <span
            style={{
              color: "var(--select-primary)",
              background: "hsl(var(--primary)/0.08)",
              border: "1px solid var(--select-primary)",
              borderRadius: 999,
              fontSize: 11,
              padding: "3px 8px",
            }}
          >
            정확 매칭
          </span>
        </div>
      </div>
    </div>
  )
}

export default DeploymentEasy

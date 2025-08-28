"use client"

import type React from "react"

const RealtimeCodingPreviews: React.FC = () => {
  const themeVars = {
    "--realtime-primary-color": "hsl(var(--primary))",
    "--realtime-background-editor": "hsl(var(--background) / 0.8)",
    "--realtime-background-preview": "hsl(var(--background) / 0.8)",
    "--realtime-text-color": "hsl(var(--foreground))",
    "--realtime-text-editor": "hsl(var(--foreground))",
    "--realtime-text-preview": "hsl(var(--primary-foreground))",
    "--realtime-border-color": "hsl(var(--border))",
    "--realtime-border-main": "hsl(var(--border))",
    "--realtime-connection-color": "hsl(var(--muted-foreground))",
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
      aria-label="Realtime dashboard preview showing KPI tiles and a sparkline chart"
    >
      {/* KPI Tiles */}
      <div style={{ position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12 }}>
        {[{ t: "매출", v: "+34%" }, { t: "전환율", v: "3.2%" }, { t: "클릭", v: "12.4k" }].map((k) => (
          <div key={k.t} style={{ width: 110, height: 64, border: "1px solid var(--realtime-border-main)", borderRadius: 10, background: "linear-gradient(180deg, var(--realtime-background-editor) 0%, transparent 100%)", display: "flex", flexDirection: "column", justifyContent: "center", padding: 10 }}>
            <div style={{ color: "var(--realtime-connection-color)", fontSize: 11 }}>{k.t}</div>
            <div style={{ color: "var(--realtime-text-color)", fontSize: 18, fontWeight: 600 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Sparkline Chart */}
      <svg width="360" height="120" viewBox="0 0 360 120" style={{ position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)" }}>
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,90 C40,80 80,110 120,70 C160,30 200,65 240,50 C280,35 320,45 360,30 L360,120 L0,120 Z" fill="url(#area)" />
        <path d="M0,90 C40,80 80,110 120,70 C160,30 200,65 240,50 C280,35 320,45 360,30" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
      </svg>

      {/* Legend */}
      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12 }}>
        {["세션", "구매", "수익"].map((l) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: "hsl(var(--primary))" }} />
            <span style={{ color: "var(--realtime-connection-color)", fontSize: 12 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RealtimeCodingPreviews

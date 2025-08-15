import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIMAX - AI 마케팅 자동화 플랫폼",
  description: "블로그 글쓰기부터 이메일 발송까지, AI로 고객모집을 자동화하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
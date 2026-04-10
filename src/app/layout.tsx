import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIMAX - AI 마케팅 자동화 플랫폼",
  description: "블로그 글쓰기부터 이메일 발송까지, AI로 고객모집을 자동화하세요",
  icons: {
    icon: [
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
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
        <footer className="border-t mt-12">
          <div className="max-w-5xl mx-auto px-4 py-6 text-sm text-muted-foreground flex items-center justify-between">
            <nav className="flex items-center gap-4">
              <a href="/privacy" className="hover:text-foreground">개인정보처리방침</a>
              <a href="/terms" className="hover:text-foreground">서비스 이용약관</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
import { Metadata } from 'next'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'

export const metadata: Metadata = {
  title: 'AIMAX Admin',
  description: 'AIMAX 관리자 대시보드',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 사이드바 */}
      <AdminSidebar />
      
      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 헤더 */}
        <AdminHeader />
        
        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        {/* 하단 푸터 바: 왼쪽 정책 링크, 오른쪽 버전 정보 */}
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <a href="/privacy" className="hover:underline">정보처리방침</a>
              <span className="text-gray-300">|</span>
              <a href="/terms" className="hover:underline">이용약관</a>
            </div>
            <div className="text-right">
              <p>AIMAX Admin v2.0</p>
              <p className="mt-0.5">© 2024 AIMAX</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
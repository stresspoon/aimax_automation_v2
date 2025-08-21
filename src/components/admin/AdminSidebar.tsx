'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Megaphone,
  Settings,
  Activity,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    title: '대시보드',
    href: '/admin',
    icon: LayoutDashboard,
    enabled: true
  },
  {
    title: '사용자 관리',
    href: '/admin/users',
    icon: Users,
    enabled: true
  },
  {
    title: '캠페인 모니터링',
    href: '/admin/campaigns',
    icon: Megaphone,
    enabled: true
  },
  {
    title: '활동 로그',
    href: '/admin/logs',
    icon: Activity,
    enabled: true
  },
  {
    title: '시스템 설정',
    href: '/admin/settings',
    icon: Settings,
    enabled: true
  },
  // 아래는 추후 구현 예정
  // {
  //   title: '통계 분석',
  //   href: '/admin/analytics',
  //   icon: BarChart3,
  //   enabled: false
  // },
  // {
  //   title: '콘텐츠 관리',
  //   href: '/admin/content',
  //   icon: FileText,
  //   enabled: false
  // },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-gray-200">
      {/* 로고 영역 */}
      <div className="h-16 border-b border-gray-200 flex items-center px-6">
        <Link href="/admin" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="font-bold text-xl">AIMAX Admin</span>
        </Link>
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
                          (item.href !== '/admin' && pathname.startsWith(item.href))
          
          if (!item.enabled) {
            return (
              <div
                key={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-400 cursor-not-allowed"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.title}</span>
                <span className="text-xs ml-auto">준비중</span>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                isActive 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* 하단 정보 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p>AIMAX Admin v2.0</p>
          <p className="mt-1">© 2024 AIMAX</p>
        </div>
      </div>
    </aside>
  )
}
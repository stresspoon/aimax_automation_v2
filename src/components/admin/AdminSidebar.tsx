'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Megaphone,
  Settings,
  BarChart3,
  FileText,
  Mail,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    title: '대시보드',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: '사용자 관리',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: '캠페인 모니터링',
    href: '/admin/campaigns',
    icon: Megaphone,
  },
  {
    title: '통계 분석',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    title: '콘텐츠 관리',
    href: '/admin/content',
    icon: FileText,
  },
  {
    title: '이메일 템플릿',
    href: '/admin/emails',
    icon: Mail,
  },
  {
    title: '권한 관리',
    href: '/admin/permissions',
    icon: Shield,
  },
  {
    title: '시스템 설정',
    href: '/admin/settings',
    icon: Settings,
  },
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
          
          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  )
}
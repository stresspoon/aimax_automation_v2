"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProjects();
    fetchUserInfo();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const fetchUserInfo = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 사용자의 프로젝트 가져오기
        const { data: projects, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        
        if (!error && projects) {
          setUserProjects(projects);
        }
      }
    } catch (error) {
      console.error('프로젝트 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const automationCards = [
    {
      id: "customer-acquisition",
      title: "고객모집 자동화",
      description: "블로그 글쓰기, DB 관리, 이메일 발송을 한 번에",
      available: true,
      href: "/automation/customer-acquisition/dashboard",
    },
    {
      id: "detail-page",
      title: "상세페이지 자동화",
      description: "제품 상세페이지를 AI가 자동으로 생성",
      available: false,
      href: "#",
    },
    {
      id: "video",
      title: "영상 자동화",
      description: "마케팅 영상을 AI로 빠르게 제작",
      available: false,
      href: "#",
    },
  ];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };


  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">AIMAX</h1>
              <nav className="ml-10 flex space-x-6">
                <Link href="/dashboard" className="text-primary font-semibold">
                  대시보드
                </Link>
                <Link href="/projects" className="text-muted-foreground hover:text-foreground">
                  프로젝트
                </Link>
                <Link href="/settings" className="text-muted-foreground hover:text-foreground">
                  설정
                </Link>
              </nav>
            </div>
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted/50 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-lg border z-50"
                >
                  <div className="p-4 border-b">
                    <p className="text-sm text-muted-foreground">로그인 계정</p>
                    <p className="text-sm font-medium truncate">{userEmail}</p>
                  </div>
                  <div className="p-2">
                    <Link
                      href="/settings"
                      className="flex items-center space-x-3 px-3 py-2 text-sm rounded-lg hover:bg-muted/50 transition"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>계정 설정</span>
                    </Link>
                    <Link
                      href="/projects"
                      className="flex items-center space-x-3 px-3 py-2 text-sm rounded-lg hover:bg-muted/50 transition"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>내 프로젝트</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg hover:bg-muted/50 transition text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>로그아웃</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 환영 메시지 */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">안녕하세요!</h2>
          <p className="text-muted-foreground">오늘도 AIMAX와 함께 효율적인 마케팅을 시작해보세요</p>
        </div>


        {/* 자동화 섹션 */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-foreground mb-6">자동화</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {automationCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {card.available ? (
                  <div 
                    onClick={() => {
                      window.location.href = card.href;
                    }}
                    className="bg-card border-2 border-primary/20 rounded-xl p-6 hover:border-primary hover:shadow-lg transition cursor-pointer h-full"
                  >
                    <div className="h-12 mb-4"></div>
                    <h4 className="text-xl font-bold text-foreground mb-2">{card.title}</h4>
                    <p className="text-muted-foreground text-sm">{card.description}</p>
                  </div>
                ) : (
                  <div className="bg-card border rounded-xl p-6 opacity-60 relative h-full">
                    <div className="absolute top-4 right-4 bg-muted text-muted-foreground px-2 py-1 rounded text-xs">
                      준비중
                    </div>
                    <div className="h-12 mb-4"></div>
                    <h4 className="text-xl font-bold text-foreground mb-2">{card.title}</h4>
                    <p className="text-muted-foreground text-sm">{card.description}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* 무료 체험 알림 */}
        <div className="mt-12 bg-primary/10 border border-primary/30 rounded-xl p-6 text-center">
          <p className="text-foreground mb-2">
            <span className="font-bold">무료 체험 3회</span>가 남아있습니다
          </p>
          <p className="text-muted-foreground text-sm">
            고객모집 자동화를 무료로 체험해보세요
          </p>
        </div>
      </main>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import GlobalNav from '@/components/global-nav';

export default function DashboardPage() {
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

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
      available: true,
      href: "/automation/detail-page",
    },
    {
      id: "video",
      title: "영상 자동화",
      description: "마케팅 영상을 AI로 빠르게 제작",
      available: false,
      href: "#",
    },
  ];



  return (
    <div className="min-h-screen bg-background">
      <GlobalNav />

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


      </main>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function CustomerAcquisitionDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalContents: 0,
    totalEmails: 0,
    conversionRate: 0,
    totalLeads: 0,
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 프로젝트 목록 가져오기
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        return;
      }

      setProjects(projectsData || []);

      // 통계 계산
      const activeCount = projectsData?.filter(p => p.status !== 'completed').length || 0;
      setStats({
        totalProjects: projectsData?.length || 0,
        activeProjects: activeCount,
        totalContents: projectsData?.reduce((acc, p) => acc + (p.content_count || 0), 0) || 0,
        totalEmails: projectsData?.reduce((acc, p) => acc + (p.emails_sent || 0), 0) || 0,
        conversionRate: 12.5, // 임시값
        totalLeads: projectsData?.reduce((acc, p) => acc + (p.leads_count || 0), 0) || 0,
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('정말 이 프로젝트를 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      
      // 목록 새로고침
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('프로젝트 삭제 중 오류가 발생했습니다.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "writing":
        return "text-orange-600 bg-orange-100";
      case "collecting":
        return "text-blue-600 bg-blue-100";
      case "sending":
        return "text-purple-600 bg-purple-100";
      case "completed":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "writing":
        return "글쓰기 중";
      case "collecting":
        return "DB 수집 중";
      case "sending":
        return "이메일 발송 중";
      case "completed":
        return "완료";
      default:
        return "대기";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-2xl font-bold text-primary">
                AIMAX
              </Link>
              <span className="ml-4 text-muted-foreground">/ 고객모집 자동화</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/automation/customer-acquisition" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition"
              >
                새 프로젝트 시작
              </Link>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                메인으로
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card p-4 rounded-lg border"
          >
            <p className="text-sm text-muted-foreground mb-1">전체 프로젝트</p>
            <p className="text-2xl font-bold">{stats.totalProjects}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card p-4 rounded-lg border"
          >
            <p className="text-sm text-muted-foreground mb-1">진행중</p>
            <p className="text-2xl font-bold text-primary">{stats.activeProjects}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card p-4 rounded-lg border"
          >
            <p className="text-sm text-muted-foreground mb-1">작성된 콘텐츠</p>
            <p className="text-2xl font-bold">{stats.totalContents}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card p-4 rounded-lg border"
          >
            <p className="text-sm text-muted-foreground mb-1">발송된 이메일</p>
            <p className="text-2xl font-bold">{stats.totalEmails}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card p-4 rounded-lg border"
          >
            <p className="text-sm text-muted-foreground mb-1">전환율</p>
            <p className="text-2xl font-bold">{stats.conversionRate}%</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card p-4 rounded-lg border"
          >
            <p className="text-sm text-muted-foreground mb-1">총 리드</p>
            <p className="text-2xl font-bold">{stats.totalLeads}</p>
          </motion.div>
        </div>

        {/* 프로젝트 목록 */}
        <div className="bg-card rounded-lg border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">프로젝트 목록</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">프로젝트를 불러오는 중...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-4">아직 프로젝트가 없습니다</p>
              <Link 
                href="/automation/customer-acquisition"
                className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition"
              >
                첫 프로젝트 시작하기
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {projects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 hover:bg-muted/30 transition"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-semibold">{project.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/automation/customer-acquisition?projectId=${project.id}`}
                        className="text-primary hover:text-primary/80 font-medium text-sm"
                      >
                        상세보기
                      </Link>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-destructive hover:text-destructive/80 font-medium text-sm ml-4"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Step 1: 글쓰기</p>
                      <p className="font-medium">
                        {project.step1_completed ? (
                          <span className="text-green-600">✓ 완료</span>
                        ) : (
                          <span className="text-muted-foreground">대기중</span>
                        )}
                      </p>
                      {project.keyword && (
                        <p className="text-xs text-muted-foreground mt-1">키워드: {project.keyword}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-1">Step 2: DB 관리</p>
                      <p className="font-medium">
                        {project.step2_completed ? (
                          <span className="text-green-600">✓ 완료</span>
                        ) : project.step1_completed ? (
                          <span className="text-blue-600">진행중</span>
                        ) : (
                          <span className="text-muted-foreground">대기중</span>
                        )}
                      </p>
                      {project.leads_count > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">수집: {project.leads_count}명</p>
                      )}
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-1">Step 3: 이메일 발송</p>
                      <p className="font-medium">
                        {project.step3_completed ? (
                          <span className="text-green-600">✓ 완료</span>
                        ) : project.step2_completed ? (
                          <span className="text-purple-600">진행중</span>
                        ) : (
                          <span className="text-muted-foreground">대기중</span>
                        )}
                      </p>
                      {project.emails_sent > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">발송: {project.emails_sent}건</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground">
                    마지막 수정: {new Date(project.updated_at).toLocaleString('ko-KR')}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
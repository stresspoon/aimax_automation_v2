"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

      // 모든 프로젝트 가져오기 (projects 테이블)
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

  const getProjectTypeLabel = (project: any) => {
    // 프로젝트 타입 구분 (추후 확장 가능)
    if (project.keyword || project.step1_completed !== undefined) {
      return "고객모집 자동화";
    }
    return "일반 프로젝트";
  };

  const getProjectTypeColor = (project: any) => {
    if (project.keyword || project.step1_completed !== undefined) {
      return "text-blue-600 bg-blue-100";
    }
    return "text-gray-600 bg-gray-100";
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
              <nav className="ml-10 flex space-x-6">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                  대시보드
                </Link>
                <Link href="/projects" className="text-primary font-semibold">
                  프로젝트
                </Link>
                <Link href="/settings" className="text-muted-foreground hover:text-foreground">
                  설정
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/cart" className="text-muted-foreground hover:text-foreground">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </Link>
              <button className="text-muted-foreground hover:text-foreground">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">내 프로젝트</h1>
            <p className="text-muted-foreground mt-2">진행 중인 모든 프로젝트를 확인하고 관리하세요</p>
          </div>
          <Link 
            href="/automation/customer-acquisition"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition"
          >
            새 프로젝트 시작
          </Link>
        </div>

        {/* 프로젝트 목록 */}
        <div className="bg-card rounded-lg border">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">프로젝트를 불러오는 중...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
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
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-muted/30 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold">{project.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProjectTypeColor(project)}`}>
                          {getProjectTypeLabel(project)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        생성일: {new Date(project.created_at).toLocaleDateString('ko-KR')} | 
                        마지막 수정: {new Date(project.updated_at).toLocaleDateString('ko-KR')}
                      </p>
                      
                      {/* 고객모집 자동화 프로젝트의 진행 상황 */}
                      {(project.keyword || project.step1_completed !== undefined) && (
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className={project.step1_completed ? "text-green-600" : "text-muted-foreground"}>
                              {project.step1_completed ? "✓" : "○"} 글쓰기
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={project.step2_completed ? "text-green-600" : "text-muted-foreground"}>
                              {project.step2_completed ? "✓" : "○"} DB 수집
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={project.step3_completed ? "text-green-600" : "text-muted-foreground"}>
                              {project.step3_completed ? "✓" : "○"} 이메일 발송
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {(project.keyword || project.step1_completed !== undefined) ? (
                        <Link
                          href={`/automation/customer-acquisition?projectId=${project.id}`}
                          className="text-primary hover:text-primary/80 font-medium text-sm"
                        >
                          상세보기
                        </Link>
                      ) : (
                        <button
                          className="text-primary hover:text-primary/80 font-medium text-sm"
                          onClick={() => alert('프로젝트 상세 페이지 준비 중입니다')}
                        >
                          상세보기
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-destructive hover:text-destructive/80 font-medium text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 도움말 */}
        <div className="mt-8 bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">프로젝트 관리 도움말</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 각 프로젝트의 진행 상황을 실시간으로 확인할 수 있습니다</li>
            <li>• 고객모집 자동화 프로젝트는 글쓰기, DB 수집, 이메일 발송 3단계로 진행됩니다</li>
            <li>• 프로젝트 상세보기에서 생성된 콘텐츠와 결과를 확인할 수 있습니다</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
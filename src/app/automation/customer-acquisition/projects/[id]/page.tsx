"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from '@/lib/supabase/client';

interface ProjectData {
  id: string;
  name: string;
  keyword: string;
  status: string;
  step1_completed: boolean;
  step2_completed: boolean;
  step3_completed: boolean;
  content_count: number;
  leads_count: number;
  emails_sent: number;
  created_at: string;
  updated_at: string;
  generated_content?: any;
  email_template?: any;
  target_audience?: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchProject();
  }, [params.id]);

  const fetchProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        router.push('/automation/customer-acquisition/dashboard');
        return;
      }

      setProject(data);
    } catch (error) {
      console.error('Error:', error);
      router.push('/automation/customer-acquisition/dashboard');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">프로젝트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">프로젝트를 찾을 수 없습니다</p>
          <Link 
            href="/automation/customer-acquisition/dashboard"
            className="text-primary hover:text-primary/80"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

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
              <span className="ml-4 text-muted-foreground">/ 고객모집 자동화 / 프로젝트 상세</span>
            </div>
            <Link 
              href="/automation/customer-acquisition/dashboard" 
              className="text-muted-foreground hover:text-foreground"
            >
              대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 프로젝트 헤더 */}
        <div className="bg-card rounded-lg border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground mt-1">
                생성일: {new Date(project.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
              {getStatusText(project.status)}
            </span>
          </div>

          {project.keyword && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">타겟 키워드</p>
              <p className="font-medium">{project.keyword}</p>
            </div>
          )}
        </div>

        {/* 진행 상태 */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`bg-card rounded-lg border p-6 ${project.step1_completed ? 'border-green-500' : ''}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Step 1: 콘텐츠 작성</h3>
              {project.step1_completed && (
                <span className="text-green-600 text-xl">✓</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              AI가 블로그 콘텐츠를 자동으로 생성합니다
            </p>
            {project.content_count > 0 && (
              <p className="text-sm font-medium mb-4">
                생성된 콘텐츠: {project.content_count}개
              </p>
            )}
            {!project.step1_completed && (
              <button
                onClick={() => router.push(`/automation/customer-acquisition?projectId=${project.id}&step=1`)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg font-semibold transition mt-4"
              >
                시작하기
              </button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`bg-card rounded-lg border p-6 ${project.step2_completed ? 'border-green-500' : ''}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Step 2: DB 수집</h3>
              {project.step2_completed && (
                <span className="text-green-600 text-xl">✓</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              타겟 고객 데이터베이스를 수집합니다
            </p>
            {project.leads_count > 0 && (
              <p className="text-sm font-medium mb-4">
                수집된 리드: {project.leads_count}명
              </p>
            )}
            {project.step1_completed && !project.step2_completed && (
              <button
                onClick={() => router.push(`/automation/customer-acquisition?projectId=${project.id}&step=2`)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg font-semibold transition mt-4"
              >
                시작하기
              </button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`bg-card rounded-lg border p-6 ${project.step3_completed ? 'border-green-500' : ''}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Step 3: 이메일 발송</h3>
              {project.step3_completed && (
                <span className="text-green-600 text-xl">✓</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              수집된 리드에게 이메일을 발송합니다
            </p>
            {project.emails_sent > 0 && (
              <p className="text-sm font-medium mb-4">
                발송된 이메일: {project.emails_sent}건
              </p>
            )}
            {project.step2_completed && !project.step3_completed && (
              <button
                onClick={() => router.push(`/automation/customer-acquisition?projectId=${project.id}&step=3`)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg font-semibold transition mt-4"
              >
                시작하기
              </button>
            )}
          </motion.div>
        </div>

        {/* 생성된 콘텐츠 */}
        {project.generated_content && (
          <div className="bg-card rounded-lg border p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">생성된 콘텐츠</h2>
            <div className="prose prose-sm max-w-none">
              {typeof project.generated_content === 'string' ? (
                <p className="whitespace-pre-wrap">{project.generated_content}</p>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4">
                  <pre className="text-sm">{JSON.stringify(project.generated_content, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 이메일 템플릿 */}
        {project.email_template && (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-bold mb-4">이메일 템플릿</h2>
            <div className="bg-muted/50 rounded-lg p-4">
              {typeof project.email_template === 'string' ? (
                <p className="whitespace-pre-wrap">{project.email_template}</p>
              ) : (
                <pre className="text-sm">{JSON.stringify(project.email_template, null, 2)}</pre>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
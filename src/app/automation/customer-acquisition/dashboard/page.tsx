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
  const [showNameModal, setShowNameModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
    
    // 5초마다 프로젝트 목록 새로고침
    const interval = setInterval(() => {
      fetchProjects();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 프로젝트 목록 가져오기 (campaigns 정보 포함)
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*, campaigns(id, name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        return;
      }

      setProjects(projectsData || []);

      // 통계 계산
      const activeCount = projectsData?.filter(p => p.status !== 'completed').length || 0;
      const totalLeads = projectsData?.reduce((acc, p) => acc + (p.leads_count || 0), 0) || 0;
      const totalEmails = projectsData?.reduce((acc, p) => acc + (p.emails_sent || 0), 0) || 0;
      
      // 전환율 계산: (선정된 후보 / 전체 후보) * 100
      let conversionRate = 0;
      if (totalLeads > 0) {
        const selectedLeads = projectsData?.reduce((acc, p) => {
          // step2 또는 step3의 candidates에서 selected 상태인 사람 수 계산
          const candidates = p.data?.step2?.candidates || p.data?.step3?.candidates || [];
          const selected = Array.isArray(candidates) ? 
            candidates.filter((c: any) => c.status === 'selected').length : 0;
          return acc + selected;
        }, 0) || 0;
        conversionRate = Math.round((selectedLeads / totalLeads) * 100 * 10) / 10; // 소수점 1자리까지
      }
      
      setStats({
        totalProjects: projectsData?.length || 0,
        activeProjects: activeCount,
        totalContents: projectsData?.reduce((acc, p) => acc + (p.content_count || 0), 0) || 0,
        totalEmails: totalEmails,
        conversionRate: conversionRate,
        totalLeads: totalLeads,
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('정말 이 프로젝트를 삭제하시겠습니까?\n관련된 모든 데이터가 삭제됩니다.')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요합니다.');
        return;
      }

      // 먼저 프로젝트 정보를 가져와서 campaign_id 확인
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('campaign_id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      // 관련된 폼 데이터 삭제
      // 1. 먼저 폼 responses 삭제
      const { data: forms } = await supabase
        .from('forms')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id);
      
      if (forms && forms.length > 0) {
        for (const form of forms) {
          // 폼 응답 삭제
          await supabase
            .from('form_responses')
            .delete()
            .eq('form_id', form.id);
        }
        
        // 폼 삭제
        await supabase
          .from('forms')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', user.id);
      }

      // 프로젝트 삭제 (user_id 조건 추가로 보안 강화)
      const { error: deleteProjectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (deleteProjectError) throw deleteProjectError;

      // 캠페인도 함께 삭제 (연관된 다른 프로젝트가 없는 경우)
      if (project.campaign_id) {
        // 같은 캠페인을 사용하는 다른 프로젝트가 있는지 확인
        const { data: otherProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('campaign_id', project.campaign_id)
          .neq('id', projectId);

        // 다른 프로젝트가 없으면 캠페인도 삭제
        if (!otherProjects || otherProjects.length === 0) {
          await supabase
            .from('campaigns')
            .delete()
            .eq('id', project.campaign_id)
            .eq('user_id', user.id);
        }
      }
      
      // 상태를 즉시 업데이트 (새로고침 전에 UI 업데이트)
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // 통계도 즉시 업데이트
      const updatedProjects = projects.filter(p => p.id !== projectId);
      const activeCount = updatedProjects.filter(p => p.status !== 'completed').length;
      const totalLeads = updatedProjects.reduce((acc, p) => acc + (p.leads_count || 0), 0);
      const totalEmails = updatedProjects.reduce((acc, p) => acc + (p.emails_sent || 0), 0);
      
      let conversionRate = 0;
      if (totalLeads > 0) {
        const selectedLeads = updatedProjects.reduce((acc, p) => {
          const candidates = p.data?.step2?.candidates || p.data?.step3?.candidates || [];
          const selected = Array.isArray(candidates) ? 
            candidates.filter((c: any) => c.status === 'selected').length : 0;
          return acc + selected;
        }, 0);
        conversionRate = Math.round((selectedLeads / totalLeads) * 100 * 10) / 10;
      }
      
      setStats({
        totalProjects: updatedProjects.length,
        activeProjects: activeCount,
        totalContents: updatedProjects.reduce((acc, p) => acc + (p.content_count || 0), 0),
        totalEmails: totalEmails,
        conversionRate: conversionRate,
        totalLeads: totalLeads,
      });
      
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('프로젝트 삭제 중 오류가 발생했습니다.');
      // 오류 발생 시 목록 새로고침
      fetchProjects();
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('프로젝트 이름을 입력해주세요.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 먼저 캠페인 생성 (type 컬럼 제외)
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: newProjectName,
          status: 'active',
          data: { type: 'customer_acquisition' }
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // 프로젝트 생성
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          campaign_id: campaign.id,
          type: 'customer_acquisition',
          step: 1,
          data: {
            campaign_name: newProjectName,
            step1: {},
            step2: {},
            step3: {}
          },
          campaign_name: newProjectName,
          status: 'writing'
        })
        .select()
        .single();

      if (error) throw error;

      // 상세 페이지로 이동
      router.push(`/automation/customer-acquisition?id=${newProject.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('프로젝트 생성 중 오류가 발생했습니다.');
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
              <button 
                onClick={() => setShowNameModal(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition"
              >
                새 프로젝트 시작
              </button>
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
              <button 
                onClick={() => setShowNameModal(true)}
                className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition"
              >
                첫 프로젝트 시작하기
              </button>
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
                    <div>
                      <h3 className="text-xl font-bold mb-1">
                        {project.campaigns?.name || project.campaign_name || project.data?.campaign_name || project.data?.step1?.keyword || '제목 없음'}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          생성일: {new Date(project.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/automation/customer-acquisition?projectId=${project.id}`}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-semibold transition"
                      >
                        상세보기
                      </Link>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-destructive hover:text-destructive/80 font-medium text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className={`border rounded-lg p-4 ${project.step1_completed || project.generated_content ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                      <p className="text-sm font-semibold mb-2">Step 1: 글쓰기</p>
                      <div className="flex items-center space-x-2">
                        {(project.step1_completed || project.generated_content) ? (
                          <>
                            <span className="text-green-600 text-lg">✓</span>
                            <span className="text-green-600 font-medium">완료</span>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-400 text-lg">○</span>
                            <span className="text-gray-500">대기중</span>
                          </>
                        )}
                      </div>
                      {project.keyword && (
                        <p className="text-xs text-muted-foreground mt-2">키워드: {project.keyword}</p>
                      )}
                      {project.content_count > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">생성: {project.content_count}개</p>
                      )}
                    </div>

                    <div className={`border rounded-lg p-4 ${project.step2_completed || project.db_collected ? 'bg-green-50 border-green-200' : project.step1_completed || project.generated_content ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                      <p className="text-sm font-semibold mb-2">Step 2: DB 수집</p>
                      <div className="flex items-center space-x-2">
                        {(project.step2_completed || project.db_collected) ? (
                          <>
                            <span className="text-green-600 text-lg">✓</span>
                            <span className="text-green-600 font-medium">완료</span>
                          </>
                        ) : (project.step1_completed || project.generated_content) ? (
                          <>
                            <span className="text-blue-600 text-lg">◉</span>
                            <span className="text-blue-600 font-medium">진행가능</span>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-400 text-lg">○</span>
                            <span className="text-gray-500">대기중</span>
                          </>
                        )}
                      </div>
                      {project.leads_count > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">수집: {project.leads_count}명</p>
                      )}
                    </div>

                    <div className={`border rounded-lg p-4 ${project.step3_completed || project.emails_sent > 0 ? 'bg-green-50 border-green-200' : project.step2_completed || project.db_collected ? 'bg-purple-50 border-purple-200' : 'bg-gray-50'}`}>
                      <p className="text-sm font-semibold mb-2">Step 3: 이메일 발송</p>
                      <div className="flex items-center space-x-2">
                        {(project.step3_completed || project.emails_sent > 0) ? (
                          <>
                            <span className="text-green-600 text-lg">✓</span>
                            <span className="text-green-600 font-medium">완료</span>
                          </>
                        ) : (project.step2_completed || project.db_collected) ? (
                          <>
                            <span className="text-purple-600 text-lg">◉</span>
                            <span className="text-purple-600 font-medium">진행가능</span>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-400 text-lg">○</span>
                            <span className="text-gray-500">대기중</span>
                          </>
                        )}
                      </div>
                      {project.emails_sent > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">발송: {project.emails_sent}건</p>
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

      {/* 프로젝트 이름 입력 모달 */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">새 프로젝트 만들기</h2>
            <input
              type="text"
              placeholder="프로젝트 이름을 입력하세요"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setNewProjectName('');
                }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground"
              >
                취소
              </button>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                시작하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
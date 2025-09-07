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

      const activeCount = projectsData?.filter(p => p.status !== 'completed').length || 0;
      const totalLeads = projectsData?.reduce((acc, p) => acc + (p.leads_count || 0), 0) || 0;
      const totalEmails = projectsData?.reduce((acc, p) => acc + (p.emails_sent || 0), 0) || 0;

      let conversionRate = 0;
      if (totalLeads > 0) {
        const selectedLeads = projectsData?.reduce((acc, p) => {
          const candidates = p.data?.step2?.candidates || p.data?.step3?.candidates || [];
          const selected = Array.isArray(candidates) ? 
            candidates.filter((c: any) => c.status === 'selected').length : 0;
          return acc + selected;
        }, 0) || 0;
        conversionRate = Math.round((selectedLeads / totalLeads) * 100 * 10) / 10;
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
        // 로그인 유도만, 알림은 과하게 떠 있지 않도록 생략
        router.push('/login');
        return;
      }

      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('campaign_id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      const { data: forms } = await supabase
        .from('forms')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (forms && forms.length > 0) {
        for (const form of forms) {
          await supabase
            .from('form_responses')
            .delete()
            .eq('form_id', form.id);
        }

        await supabase
          .from('forms')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', user.id);
      }

      const { error: deleteProjectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (deleteProjectError) throw deleteProjectError;

      if (project.campaign_id) {
        const { data: otherProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('campaign_id', project.campaign_id)
          .neq('id', projectId);

        if (!otherProjects || otherProjects.length === 0) {
          await supabase
            .from('campaigns')
            .delete()
            .eq('id', project.campaign_id)
            .eq('user_id', user.id);
        }
      }

      setProjects(prev => prev.filter(p => p.id !== projectId));

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
      // 간단한 피드백: 브라우저 alert 대신 상태로 대체하거나 상단 알림 컴포넌트가 생기면 연결
      fetchProjects();
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      // 간단한 피드백: 입력 아래 문구로 처리(추후 토스트 연결 가능)
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      router.push(`/automation/customer-acquisition?id=${newProject.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const kpiText = (project: any) => {
    const leads = project.leads_count || 0; // DB 모집 수로도 노출
    const dbCollected = leads;
    const emails = project.emails_sent || 0;
    const updated = project.updated_at ? new Date(project.updated_at).toLocaleString('ko-KR') : '-';
    return (
      <div className="text-sm">
        <span>DB모집 </span>
        <span className="text-primary font-semibold">{dbCollected}</span>
        <span className="mx-1">·</span>
        <span>리드 </span>
        <span className="text-primary font-semibold">{leads}</span>
        <span className="mx-1">·</span>
        <span>발송 </span>
        <span className="text-primary font-semibold">{emails}</span>
        <span className="mx-1">·</span>
        <span>업데이트 </span>
        <span className="text-primary font-semibold">{updated}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">전체 프로젝트</p>
            <p className="text-2xl font-bold">{stats.totalProjects}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">진행중</p>
            <p className="text-2xl font-bold text-primary">{stats.activeProjects}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">모집된 총 인원</p>
            <p className="text-2xl font-bold">{stats.totalLeads}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">발송된 이메일</p>
            <p className="text-2xl font-bold">{stats.totalEmails}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">전환율</p>
            <p className="text-2xl font-bold">{stats.conversionRate}%</p>
          </motion.div>
          {/* 기존 '총 리드' 카드는 '모집된 총 인원' 카드로 대체되어 제거 */}
        </div>

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
                <motion.div key={project.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 hover:bg-muted/30 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{project.campaigns?.name || project.campaign_name || project.data?.campaign_name || '제목 없음'}</h3>
                      <div>{kpiText(project)}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Link href={`/automation/customer-acquisition?projectId=${project.id}`} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-semibold transition">
                        상세보기
                      </Link>
                      <button onClick={() => handleDeleteProject(project.id)} className="text-destructive hover:text-destructive/80 font-medium text-sm">
                        삭제
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

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
              <button onClick={() => { setShowNameModal(false); setNewProjectName(''); }} className="px-4 py-2 text-muted-foreground hover:text-foreground">
                취소
              </button>
              <button onClick={handleCreateProject} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                시작하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CustomerAcquisitionDashboard() {
  const [projects] = useState([
    {
      id: 1,
      name: "12월 마케팅 캠페인",
      status: "step2",
      step1: { completed: true, keyword: "AI 마케팅 자동화", contentType: "blog", createdAt: "2024-12-01" },
      step2: { completed: false, candidatesCount: 45, selectedCount: 12 },
      step3: { completed: false, emailsSent: 0 },
      lastModified: "2024-12-15 14:30",
    },
    {
      id: 2,
      name: "신제품 런칭 캠페인",
      status: "step3",
      step1: { completed: true, keyword: "스마트홈 IoT", contentType: "thread", createdAt: "2024-12-10" },
      step2: { completed: true, candidatesCount: 67, selectedCount: 23 },
      step3: { completed: false, emailsSent: 15 },
      lastModified: "2024-12-14 09:15",
    },
    {
      id: 3,
      name: "연말 프로모션",
      status: "completed",
      step1: { completed: true, keyword: "연말 할인 이벤트", contentType: "blog", createdAt: "2024-11-25" },
      step2: { completed: true, candidatesCount: 102, selectedCount: 34 },
      step3: { completed: true, emailsSent: 34 },
      lastModified: "2024-12-01 16:45",
    },
  ]);

  const [stats] = useState({
    totalCampaigns: 3,
    activeCampaigns: 2,
    totalContents: 12,
    totalEmails: 49,
    conversionRate: 12.5,
    totalLeads: 156,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "step1":
        return "text-orange-600 bg-orange-100";
      case "step2":
        return "text-blue-600 bg-blue-100";
      case "step3":
        return "text-purple-600 bg-purple-100";
      case "completed":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "step1":
        return "글쓰기 중";
      case "step2":
        return "DB 관리 중";
      case "step3":
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
              <span className="ml-4 text-muted-foreground">/ 고객모집 자동화 대시보드</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/automation/customer-acquisition" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition"
              >
                새 캠페인 시작
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border rounded-xl p-4"
          >
            <p className="text-sm text-muted-foreground mb-1">전체 캠페인</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalCampaigns}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card border rounded-xl p-4"
          >
            <p className="text-sm text-muted-foreground mb-1">진행 중</p>
            <p className="text-2xl font-bold text-primary">{stats.activeCampaigns}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border rounded-xl p-4"
          >
            <p className="text-sm text-muted-foreground mb-1">생성 콘텐츠</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalContents}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card border rounded-xl p-4"
          >
            <p className="text-sm text-muted-foreground mb-1">발송 이메일</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalEmails}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border rounded-xl p-4"
          >
            <p className="text-sm text-muted-foreground mb-1">전환율</p>
            <p className="text-2xl font-bold text-foreground">{stats.conversionRate}%</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-card border rounded-xl p-4"
          >
            <p className="text-sm text-muted-foreground mb-1">총 리드</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalLeads}</p>
          </motion.div>
        </div>

        {/* 프로젝트 목록 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">캠페인 목록</h2>
          <div className="space-y-4">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border rounded-xl p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{project.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        마지막 수정: {project.lastModified}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/automation/customer-acquisition"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition"
                  >
                    계속하기
                  </Link>
                </div>

                {/* 진행 상황 */}
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Step 1 */}
                  <div className={`p-4 rounded-lg border ${
                    project.step1.completed ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">Step 1: 글쓰기</span>
                      {project.step1.completed && (
                        <span className="text-green-600">✓</span>
                      )}
                    </div>
                    {project.step1.completed ? (
                      <>
                        <p className="text-xs text-muted-foreground">키워드: {project.step1.keyword}</p>
                        <p className="text-xs text-muted-foreground">타입: {project.step1.contentType}</p>
                        <p className="text-xs text-muted-foreground">생성일: {project.step1.createdAt}</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">대기 중</p>
                    )}
                  </div>

                  {/* Step 2 */}
                  <div className={`p-4 rounded-lg border ${
                    project.step2.completed ? "bg-green-50 border-green-200" : 
                    project.status === "step2" ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">Step 2: DB 관리</span>
                      {project.step2.completed && (
                        <span className="text-green-600">✓</span>
                      )}
                    </div>
                    {project.step2.candidatesCount > 0 ? (
                      <>
                        <p className="text-xs text-muted-foreground">수집: {project.step2.candidatesCount}명</p>
                        <p className="text-xs text-muted-foreground">선정: {project.step2.selectedCount}명</p>
                        <div className="mt-2 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(project.step2.selectedCount / project.step2.candidatesCount) * 100}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">대기 중</p>
                    )}
                  </div>

                  {/* Step 3 */}
                  <div className={`p-4 rounded-lg border ${
                    project.step3.completed ? "bg-green-50 border-green-200" : 
                    project.status === "step3" ? "bg-purple-50 border-purple-200" : "bg-gray-50 border-gray-200"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">Step 3: 이메일</span>
                      {project.step3.completed && (
                        <span className="text-green-600">✓</span>
                      )}
                    </div>
                    {project.step3.emailsSent > 0 ? (
                      <>
                        <p className="text-xs text-muted-foreground">발송: {project.step3.emailsSent}건</p>
                        <p className="text-xs text-muted-foreground">
                          성공률: {project.step2.selectedCount > 0 ? 
                            Math.round((project.step3.emailsSent / project.step2.selectedCount) * 100) : 0}%
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">대기 중</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 빈 상태 */}
        {projects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">아직 진행 중인 캠페인이 없습니다</p>
            <Link
              href="/automation/customer-acquisition"
              className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition"
            >
              첫 캠페인 시작하기
            </Link>
          </div>
        )}

        {/* 팁 섹션 */}
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-6">
          <h3 className="font-bold text-foreground mb-3">캠페인 성과 향상 팁</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• 키워드는 구체적이고 타겟이 명확할수록 좋습니다</li>
            <li>• 스레드는 짧고 임팩트 있게, 블로그는 정보성 콘텐츠로 작성하세요</li>
            <li>• DB 선정 기준을 너무 높게 설정하면 대상자가 줄어듭니다</li>
            <li>• 이메일 제목에 개인화 요소를 넣으면 오픈율이 높아집니다</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
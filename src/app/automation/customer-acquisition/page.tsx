"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type Step = 1 | 2 | 3;

interface Candidate {
  name: string;
  email: string;
  phone: string;
  threads: number;
  blog: number;
  instagram: number;
  status: "selected" | "notSelected";
}

export default function CustomerAcquisitionPage() {
  const [expandedStep, setExpandedStep] = useState<Step | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [campaignName, setCampaignName] = useState<string>("");
  const [projectData, setProjectData] = useState({
    step1: {
      keyword: "",
      contentType: "blog" as "blog" | "thread",
      apiKey: "",
      instructions: "",
      generatedContent: "",
      generatedImages: [] as string[],
    },
    step2: {
      sheetUrl: "",
      isRunning: false,
      candidates: [] as Candidate[],
    },
    step3: {
      targetType: "selected" as "selected" | "notSelected",
      emailSubject: "",
      emailBody: "",
      senderEmail: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [freeTrialsRemaining, setFreeTrialsRemaining] = useState(3);

  // URL에서 캠페인 이름 가져오기
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const campaign = urlParams.get('campaign');
    if (campaign) {
      setCampaignName(campaign);
      // 저장된 캠페인 데이터가 있으면 불러오기
      const savedData = localStorage.getItem(`campaign_${campaign}_data`);
      if (savedData) {
        setProjectData(JSON.parse(savedData));
      }
    }
  }, []);

  // 데이터 변경 시 저장
  useEffect(() => {
    if (campaignName) {
      localStorage.setItem(`campaign_${campaignName}_data`, JSON.stringify(projectData));
    }
  }, [projectData, campaignName]);

  // 콘텐츠 타입별 작성 지침
  const contentGuidelines = {
    blog: `블로그 고객모집 글 작성 가이드:

1. 제목 작성법
   • 검색 키워드를 자연스럽게 포함
   • 숫자나 질문형식 활용 (예: "2024년 최신 ~5가지 방법")
   • 호기심을 유발하는 제목 구성

2. 도입부 (첫 문단)
   • 독자의 공감대 형성
   • 문제 상황 제시
   • 해결책 암시

3. 본문 구성
   • 소제목으로 가독성 향상
   • 구체적인 사례와 데이터 제시
   • 이미지를 활용한 시각적 설명
   • 전문성 있는 정보 제공

4. CTA (행동 유도)
   • 자연스러운 제품/서비스 소개
   • 구체적인 혜택 제시
   • 연락처나 링크 명확히 표기

5. SEO 최적화
   • 키워드 3-5회 자연스럽게 배치
   • 관련 키워드 활용
   • 메타 설명 최적화`,
    thread: `스레드 고객모집 글 작성 가이드:

1. 첫 트윗 (Hook)
   • 강력한 한 줄로 시작
   • 숫자, 이모지 활용
   • 질문이나 충격적 사실 제시

2. 스토리텔링
   • 개인 경험담 활용
   • 짧고 임팩트 있는 문장
   • 각 트윗당 280자 이내
   • 연결성 있는 내용 구성

3. 가치 전달
   • 구체적인 팁 제공
   • 실행 가능한 조언
   • 빠른 결과를 약속

4. 시각적 요소
   • 번호 매기기 (1/, 2/, 3/...)
   • 줄바꿈으로 가독성 향상
   • 핵심 단어 강조

5. 마무리
   • 명확한 CTA
   • 리트윗 유도
   • 팔로우 요청
   • DM이나 링크 안내`
  };

  // 콘텐츠 타입 변경시 지침 자동 업데이트
  const updateContentType = (type: "blog" | "thread") => {
    setProjectData({
      ...projectData,
      step1: {
        ...projectData.step1,
        contentType: type,
        instructions: contentGuidelines[type]
      }
    });
  };

  const handleStep1Generate = async () => {
    if (freeTrialsRemaining <= 0) {
      alert("무료 체험 횟수를 모두 사용했습니다. 유료 플랜으로 업그레이드해주세요.");
      return;
    }

    setLoading(true);
    // 실제로는 API 호출
    setTimeout(() => {
      setProjectData({
        ...projectData,
        step1: {
          ...projectData.step1,
          generatedContent: `[AI 생성 콘텐츠]

제목: ${projectData.step1.keyword}로 시작하는 성공적인 비즈니스 전략

안녕하세요! 오늘은 ${projectData.step1.keyword}에 대해 이야기해보려고 합니다.

많은 분들이 ${projectData.step1.keyword}에 관심을 가지고 계시는데요, 
실제로 이를 통해 놀라운 성과를 만들어낸 사례들이 많습니다.

[본문 내용...]

지금 바로 시작해보세요!
문의: contact@aimax.com`,
          generatedImages: ["image1.jpg", "image2.jpg"],
        },
      });
      setFreeTrialsRemaining(freeTrialsRemaining - 1);
      setLoading(false);
    }, 2000);
  };

  const handleStep2Start = () => {
    if (!projectData.step2.sheetUrl) {
      showNotification('구글시트 URL을 입력해주세요', 'error');
      return;
    }

    // 자동화 시작/일시정지 토글
    const newRunningState = !projectData.step2.isRunning;
    
    setProjectData({
      ...projectData,
      step2: {
        ...projectData.step2,
        isRunning: newRunningState,
      },
    });

    showNotification(
      newRunningState ? '자동화가 시작되었습니다' : '자동화가 일시정지되었습니다',
      'info'
    );

    // 예시 데이터 생성 (실제로는 API 호출)
    if (newRunningState && projectData.step2.candidates.length === 0) {
      setTimeout(() => {
        setProjectData(prev => ({
          ...prev,
          step2: {
            ...prev.step2,
            candidates: [
              { name: "김철수", email: "kim@example.com", phone: "010-1234-5678", threads: 600, blog: 400, instagram: 1200, status: "selected" },
              { name: "이영희", email: "lee@example.com", phone: "010-2345-6789", threads: 400, blog: 250, instagram: 800, status: "notSelected" },
            ],
          },
        }));
      }, 2000);
    }
  };


  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleStep3Send = () => {
    if (!projectData.step3.senderEmail || !projectData.step3.emailSubject || !projectData.step3.emailBody) {
      showNotification('모든 필드를 입력해주세요', 'error');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      showNotification('이메일이 성공적으로 발송되었습니다!', 'success');
      setLoading(false);
    }, 2000);
  };

  const stepCards = [
    {
      step: 1,
      title: "고객모집 글쓰기",
      description: "AI가 자동으로 고객모집용 콘텐츠를 생성합니다"
    },
    {
      step: 2,
      title: "DB 관리",
      description: "구글폼으로 수집된 고객 데이터를 자동 관리합니다"
    },
    {
      step: 3,
      title: "이메일 발송",
      description: "선정된 고객에게 자동으로 이메일을 발송합니다"
    }
  ];

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-xl p-8"
    >
      <h2 className="text-2xl font-bold text-foreground mb-6">Step 1: 고객모집 글쓰기</h2>
      
      <div className="space-y-6">
        {/* 콘텐츠 타입 선택 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">콘텐츠 타입</label>
          <div className="flex space-x-4">
            <button
              onClick={() => updateContentType("blog")}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                projectData.step1.contentType === "blog"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              블로그 (긴 글)
            </button>
            <button
              onClick={() => updateContentType("thread")}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                projectData.step1.contentType === "thread"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              스레드 (짧은 글)
            </button>
          </div>
        </div>

        {/* 키워드 입력 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">키워드</label>
          <input
            type="text"
            value={projectData.step1.keyword}
            onChange={(e) => setProjectData({ ...projectData, step1: { ...projectData.step1, keyword: e.target.value } })}
            placeholder="예: AI 마케팅 자동화"
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* API 키 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Gemini API 키
            <span className="ml-2 text-xs text-muted-foreground">(이미지 생성용)</span>
          </label>
          <input
            type="password"
            value={projectData.step1.apiKey}
            onChange={(e) => setProjectData({ ...projectData, step1: { ...projectData.step1, apiKey: e.target.value } })}
            placeholder="AIza..."
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>


        {/* 작성 지침 */}
        {projectData.step1.contentType && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-foreground">
                {projectData.step1.contentType === "blog" ? "블로그" : "스레드"} 작성 지침
              </label>
              <button className="text-xs text-primary hover:text-primary/80 font-semibold">
                지침 수정 가이드
              </button>
            </div>
            <textarea
              value={projectData.step1.instructions}
              onChange={(e) => setProjectData({ ...projectData, step1: { ...projectData.step1, instructions: e.target.value } })}
              rows={12}
              className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-white focus:outline-none focus:border-primary text-sm"
            />
          </div>
        )}

        {/* 생성 버튼 */}
        <button
          onClick={handleStep1Generate}
          disabled={loading || !projectData.step1.keyword}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? "생성 중..." : `글 생성하기 (무료 체험 ${freeTrialsRemaining}/3)`}
        </button>

        {/* 생성된 콘텐츠 */}
        {projectData.step1.generatedContent && (
          <div className="mt-6 p-6 bg-muted/30 rounded-lg border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-foreground">생성된 콘텐츠</h3>
              <button className="text-primary hover:text-primary/80 font-semibold">
                복사
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-muted-foreground text-sm">
              {projectData.step1.generatedContent}
            </pre>
            {projectData.step1.generatedImages.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">생성된 이미지:</p>
                <div className="flex space-x-2">
                  {projectData.step1.generatedImages.map((_img, idx) => (
                    <div key={idx} className="w-20 h-20 bg-muted rounded flex items-center justify-center text-muted-foreground">
                      이미지 {idx + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 다음 단계 버튼 */}
        {projectData.step1.generatedContent && (
          <button
            onClick={() => setExpandedStep(2)}
            className="w-full bg-muted hover:bg-muted/80 text-foreground py-3 rounded-lg font-semibold transition"
          >
            다음: DB 관리 →
          </button>
        )}
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-xl p-8"
    >
      <h2 className="text-2xl font-bold text-foreground mb-6">Step 2: DB 관리</h2>
      
      <div className="space-y-6">
        {/* 매뉴얼 링크 */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
          <p className="text-sm text-foreground mb-2">구글폼 + 구글시트 연동 방법</p>
          <Link href="#" className="text-primary hover:text-primary/80 font-semibold">
            노션 매뉴얼 보기 →
          </Link>
        </div>


        {/* 구글시트 URL */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">구글시트 URL</label>
          <input
            type="url"
            value={projectData.step2.sheetUrl}
            onChange={(e) => setProjectData({ ...projectData, step2: { ...projectData.step2, sheetUrl: e.target.value } })}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* 선정 기준 */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <h4 className="font-semibold text-foreground mb-3">선정 기준</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Threads: 팔로워 500명 이상</li>
            <li>• 네이버 블로그: 이웃 300명 이상</li>
            <li>• 인스타그램: 팔로워 1,000명 이상</li>
          </ul>
        </div>

        {/* 자동화 시작/일시정지 버튼 */}
        <button
          onClick={handleStep2Start}
          disabled={!projectData.step2.sheetUrl}
          className={`w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 ${
            projectData.step2.isRunning
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
        >
          {projectData.step2.isRunning ? '일시정지' : '자동화 시작'}
        </button>

        {/* 수집된 데이터 */}
        {projectData.step2.candidates.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-text mb-3">수집된 후보</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-text/10">
                    <th className="text-left py-2">이름</th>
                    <th className="text-left py-2">이메일</th>
                    <th className="text-center py-2">Threads</th>
                    <th className="text-center py-2">블로그</th>
                    <th className="text-center py-2">인스타</th>
                    <th className="text-center py-2">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {projectData.step2.candidates.map((candidate, idx) => (
                    <tr key={idx} className="border-b border-text/5">
                      <td className="py-2">{candidate.name}</td>
                      <td className="py-2">{candidate.email}</td>
                      <td className="text-center py-2">{candidate.threads}</td>
                      <td className="text-center py-2">{candidate.blog}</td>
                      <td className="text-center py-2">{candidate.instagram}</td>
                      <td className="text-center py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          candidate.status === "selected" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {candidate.status === "selected" ? "선정" : "미달"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 다음 단계 버튼 */}
        {projectData.step2.candidates.length > 0 && (
          <button
            onClick={() => setExpandedStep(3)}
            className="w-full bg-muted hover:bg-muted/80 text-foreground py-3 rounded-lg font-semibold transition"
          >
            다음: 이메일 발송 →
          </button>
        )}
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-xl p-8"
    >
      <h2 className="text-2xl font-bold text-foreground mb-6">Step 3: 이메일 발송</h2>
      
      <div className="space-y-6">
        {/* 대상 선택 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">발송 대상</label>
          <div className="flex space-x-4">
            <button
              onClick={() => setProjectData({ ...projectData, step3: { ...projectData.step3, targetType: "selected" } })}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                projectData.step3.targetType === "selected"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              선정 대상
            </button>
            <button
              onClick={() => setProjectData({ ...projectData, step3: { ...projectData.step3, targetType: "notSelected" } })}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                projectData.step3.targetType === "notSelected"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              비선정 대상
            </button>
          </div>
        </div>

        {/* 발신 이메일 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            발신 이메일 (Gmail)
            <Link href="#" className="ml-2 text-xs text-primary hover:text-primary/80">설정 방법</Link>
          </label>
          <input
            type="email"
            value={projectData.step3.senderEmail}
            onChange={(e) => setProjectData({ ...projectData, step3: { ...projectData.step3, senderEmail: e.target.value } })}
            placeholder="your@gmail.com"
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* 이메일 제목 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">이메일 제목</label>
          <input
            type="text"
            value={projectData.step3.emailSubject}
            onChange={(e) => setProjectData({ ...projectData, step3: { ...projectData.step3, emailSubject: e.target.value } })}
            placeholder="예: {이름}님, 특별한 제안이 있습니다"
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* 이메일 본문 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">이메일 본문</label>
            <button className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1 rounded font-semibold">
              Gemini로 자동작성
            </button>
          </div>
          <textarea
            value={projectData.step3.emailBody}
            onChange={(e) => setProjectData({ ...projectData, step3: { ...projectData.step3, emailBody: e.target.value } })}
            placeholder="안녕하세요 {이름}님,&#10;&#10;..."
            rows={8}
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {`{이름}`}, {`{이메일}`} 등의 변수를 사용할 수 있습니다
          </p>
        </div>

        {/* 발송 버튼 */}
        <button
          onClick={handleStep3Send}
          disabled={loading || !projectData.step3.senderEmail || !projectData.step3.emailSubject || !projectData.step3.emailBody}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? "발송 중..." : "이메일 발송"}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Toast 알림 */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`px-6 py-3 rounded-lg shadow-lg font-semibold ${
            showToast.type === 'success' ? 'bg-green-500 text-white' :
            showToast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {showToast.message}
          </div>
        </div>
      )}
      {/* 헤더 */}
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-2xl font-bold text-primary">
                AIMAX
              </Link>
              <span className="ml-4 text-muted-foreground">
                / 고객모집 자동화 {campaignName && `- ${campaignName}`}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/automation/customer-acquisition/dashboard" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition"
              >
                대시보드 보기
              </Link>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                메인으로
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 프로세스 선택 카드 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">고객모집 자동화</h1>
          <p className="text-muted-foreground">원하는 단계를 선택하여 시작하세요</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {stepCards.map(({ step, title, description }) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: step * 0.1 }}
              onClick={() => setExpandedStep(expandedStep === step ? null : step as Step)}
              className={`bg-card border-2 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg ${
                expandedStep === step 
                  ? "border-primary shadow-lg" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="w-12 h-12 mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{step}</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Step {step}: {title}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">{description}</p>
              <button className={`w-full py-2 rounded-lg font-semibold transition ${
                expandedStep === step
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}>
                {expandedStep === step ? "닫기" : "시작하기"}
              </button>
            </motion.div>
          ))}
        </div>

        {/* 선택된 Step 상세 내용 */}
        {expandedStep === 1 && renderStep1()}
        {expandedStep === 2 && renderStep2()}
        {expandedStep === 3 && renderStep3()}
      </main>
    </div>
  );
}
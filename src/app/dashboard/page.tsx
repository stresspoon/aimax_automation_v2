"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCartStore } from "@/stores/cartStore";

export default function DashboardPage() {
  const { addItem, getTotalItems } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignName, setCampaignName] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);
  const [userProjects] = useState([
    // 임시 프로젝트 데이터 (실제로는 DB에서 가져옴)
    {
      id: 1,
      name: "2024년 12월 캠페인",
      status: "step2",
      createdAt: "2024-12-01",
      lastModified: "2024-12-15",
    },
  ]);

  const automationCards = [
    {
      id: "customer-acquisition",
      title: "고객모집 자동화",
      description: "블로그 글쓰기, DB 관리, 이메일 발송을 한 번에",
      available: true,
      href: "/automation/customer-acquisition",
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

  const toolCards = [
    {
      id: "naver-blog",
      title: "네이버 블로그 완전 자동화",
      description: "포스팅부터 관리까지 완전 자동화",
      price: 49900,
      priceDisplay: "₩49,900",
    },
    {
      id: "smartstore-review",
      title: "스마트스토어 리뷰 자동답글",
      description: "리뷰에 자동으로 맞춤형 답글 작성",
      price: 39900,
      priceDisplay: "₩39,900",
    },
    {
      id: "image-extract",
      title: "이미지 추출",
      description: "웹페이지에서 이미지 일괄 추출",
      price: 29900,
      priceDisplay: "₩29,900",
    },
    {
      id: "naver-place",
      title: "네이버 플레이스 리뷰 자동답글",
      description: "플레이스 리뷰 자동 관리",
      price: 39900,
      priceDisplay: "₩39,900",
    },
    {
      id: "blog-neighbor",
      title: "네이버 블로그 서이추+이웃댓글 자동화",
      description: "이웃 관리와 댓글을 자동으로",
      price: 34900,
      priceDisplay: "₩34,900",
    },
    {
      id: "review-writing",
      title: "리뷰 글쓰기 자동화",
      description: "AI가 작성하는 완벽한 리뷰",
      price: 44900,
      priceDisplay: "₩44,900",
    },
  ];

  const handleCreateCampaign = () => {
    if (campaignName.trim()) {
      window.location.href = `/automation/customer-acquisition?campaign=${encodeURIComponent(campaignName)}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 캠페인 생성 모달 */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl shadow-2xl border max-w-md w-full p-8"
          >
            <h3 className="text-2xl font-bold text-foreground mb-2">새 캠페인 만들기</h3>
            <p className="text-muted-foreground mb-6">
              캠페인 이름을 입력하면 고객모집 자동화를 시작할 수 있습니다
            </p>
            
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCampaign()}
              placeholder="예: 2024년 연말 프로모션"
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition mb-6"
              autoFocus
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCampaignModal(false);
                  setCampaignName("");
                }}
                className="flex-1 px-4 py-3 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 font-semibold transition"
              >
                취소
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={!campaignName.trim()}
                className="flex-1 px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                캠페인 시작
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
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
            <div className="flex items-center space-x-4">
              <Link href="/cart" className="relative text-muted-foreground hover:text-foreground">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {mounted && getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
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
        {/* 환영 메시지 */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">안녕하세요!</h2>
          <p className="text-muted-foreground">오늘도 AIMAX와 함께 효율적인 마케팅을 시작해보세요</p>
        </div>

        {/* 내 프로젝트 (있을 경우만 표시) */}
        {userProjects.length > 0 && (
          <section className="mb-12">
            <h3 className="text-xl font-bold text-foreground mb-4">진행 중인 프로젝트</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userProjects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border rounded-xl p-6 hover:shadow-lg transition"
                >
                  <h4 className="font-semibold text-foreground mb-2">{project.name}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    상태: Step {project.status.replace("step", "")} 진행 중
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      수정: {project.lastModified}
                    </span>
                    <Link
                      href={`/automation/customer-acquisition/dashboard`}
                      className="text-primary hover:text-primary/80 text-sm font-semibold"
                    >
                      계속하기 →
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

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
                      if (card.id === "customer-acquisition") {
                        setShowCampaignModal(true);
                      } else {
                        window.location.href = card.href;
                      }
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

        {/* 개별 판매 도구 섹션 */}
        <section>
          <h3 className="text-2xl font-bold text-foreground mb-6">개별 판매 도구</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {toolCards.map((tool, index) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => addItem({ id: tool.id, title: tool.title, price: tool.price })}
                className="bg-card border rounded-xl p-6 hover:shadow-lg hover:border-primary/50 transition cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="h-8"></div>
                  <span className="text-primary font-bold">{tool.priceDisplay}</span>
                </div>
                <h4 className="font-bold text-foreground mb-2 group-hover:text-primary transition">{tool.title}</h4>
                <p className="text-muted-foreground text-sm">{tool.description}</p>
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
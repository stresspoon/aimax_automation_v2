"use client";

import { motion } from "framer-motion";
import GlobalNav from '@/components/global-nav';

export default function DetailPageAutomation() {
    return (
        <div className="min-h-screen bg-background">
            <GlobalNav pageTitle="상세페이지 자동화" />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-3xl font-bold text-foreground mb-8">상세페이지 자동화</h1>

                    <div className="max-w-2xl">
                        <a
                            href="https://app.hookable.ai/promotion/aimax"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block bg-card border rounded-xl overflow-hidden hover:border-primary hover:shadow-lg transition-all duration-300"
                        >
                            <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/5 transition-colors">
                                {/* 이미지 플레이스홀더 */}
                                <div className="text-center">
                                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-lg font-medium">상세페이지 자동화 툴 이미지</span>
                                </div>
                            </div>
                            <div className="p-8">
                                <h2 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">상세페이지 자동화 툴</h2>
                                <p className="text-muted-foreground">제품 상세페이지를 AI가 자동으로 생성합니다. 클릭하여 시작하세요.</p>
                            </div>
                        </a>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}

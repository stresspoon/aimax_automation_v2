import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 개발 중 캐시 문제 해결
  experimental: {
    // 서버 컴포넌트 무효화 시간 단축
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
  // 개발 서버 최적화
  onDemandEntries: {
    // 페이지를 메모리에 유지하는 시간 (밀리초)
    maxInactiveAge: 25 * 1000,
    // 메모리에 유지할 최대 페이지 수
    pagesBufferLength: 2,
  },
  // Webpack 캐시 설정
  webpack: (config, { dev }) => {
    if (dev) {
      // 개발 모드에서 캐시 비활성화
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
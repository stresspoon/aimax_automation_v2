import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 보안 헤더 설정
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ]
  },

  // 개발 중 캐시 문제 해결
  experimental: {
    // 서버 컴포넌트 무효화 시간 (더 안정적으로 조정)
    staleTimes: {
      dynamic: 30,  // 0은 너무 짧아서 문제 발생
      static: 180,
    },
  },

  // 패키지 트랜스파일 설정 (Supabase 빌드 에러 해결) - 2.48.1 버전에서는 불필요할 수 있음
  // transpilePackages: ['@supabase/supabase-js', '@supabase/ssr'],

  // 개발 서버 최적화
  onDemandEntries: {
    // 페이지를 메모리에 유지하는 시간 (밀리초)
    maxInactiveAge: 25 * 1000,
    // 메모리에 유지할 최대 페이지 수
    pagesBufferLength: 2,
  },
  // Webpack 설정
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // 개발 모드에서 파일 시스템 캐시 사용 (메모리 효율적)
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };

      // 파일 변경 감지 최적화
      config.watchOptions = {
        poll: false,  // CPU 사용량 감소
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      };
    }
    return config;
  },
};

export default nextConfig;
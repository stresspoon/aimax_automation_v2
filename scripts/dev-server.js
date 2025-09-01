#!/usr/bin/env node

/**
 * 개발 서버 관리 스크립트
 * - 기존 프로세스 자동 종료
 * - 포트 충돌 방지
 * - 자동 재시작 관리
 */

const { exec, spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 3001;
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 포트를 사용하는 프로세스 종료
function killPort(port) {
  return new Promise((resolve) => {
    log(`🔍 포트 ${port} 확인 중...`, 'cyan');
    
    // macOS/Linux
    exec(`lsof -ti :${port}`, (error, stdout) => {
      if (stdout && stdout.trim()) {
        const pids = stdout.trim().split('\n');
        log(`⚠️  포트 ${port}를 사용 중인 프로세스 발견: PID ${pids.join(', ')}`, 'yellow');
        
        pids.forEach(pid => {
          try {
            process.kill(pid, 'SIGTERM');
            log(`✅ 프로세스 ${pid} 종료됨`, 'green');
          } catch (err) {
            log(`❌ 프로세스 ${pid} 종료 실패: ${err.message}`, 'red');
          }
        });
        
        // 프로세스 종료 대기
        setTimeout(resolve, 1000);
      } else {
        log(`✅ 포트 ${port} 사용 가능`, 'green');
        resolve();
      }
    });
  });
}

// .next 캐시 정리
function cleanCache() {
  return new Promise((resolve) => {
    log('🧹 .next 캐시 정리 중...', 'cyan');
    exec('rm -rf .next/cache', (error) => {
      if (error) {
        log('⚠️  캐시 정리 실패 (무시하고 계속)', 'yellow');
      } else {
        log('✅ 캐시 정리 완료', 'green');
      }
      resolve();
    });
  });
}

// Next.js 개발 서버 시작
function startDevServer() {
  log('🚀 Next.js 개발 서버 시작 중...', 'bright');
  
  const server = spawn('npm', ['run', 'dev'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PORT: PORT
    }
  });
  
  server.on('error', (err) => {
    log(`❌ 서버 시작 실패: ${err.message}`, 'red');
    process.exit(1);
  });
  
  server.on('exit', (code, signal) => {
    if (signal) {
      log(`⚠️  서버가 시그널 ${signal}로 종료됨`, 'yellow');
    } else if (code !== 0) {
      log(`❌ 서버가 코드 ${code}로 종료됨`, 'red');
    } else {
      log('✅ 서버 정상 종료', 'green');
    }
  });
  
  // 프로세스 종료 시 서버도 종료
  process.on('SIGINT', () => {
    log('\n👋 개발 서버 종료 중...', 'yellow');
    server.kill('SIGTERM');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    server.kill('SIGTERM');
    process.exit(0);
  });
}

// 메인 실행
async function main() {
  log('=================================', 'bright');
  log('🛠️  AIMAX 개발 서버 관리자', 'bright');
  log('=================================', 'bright');
  log('');
  
  try {
    // 1. 기존 포트 정리
    await killPort(PORT);
    
    // 2. 캐시 정리 (선택적)
    if (process.argv.includes('--clean')) {
      await cleanCache();
    }
    
    // 3. 서버 시작
    log('');
    startDevServer();
    
  } catch (error) {
    log(`❌ 오류 발생: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 스크립트 실행
main();
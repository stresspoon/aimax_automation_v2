#!/usr/bin/env node
/*
  Threads 페이지의 현재 화면 텍스트를 추출하여 Markdown 파일로 저장합니다.
  사용법:
    node scripts/snapshot-threads.js "https://www.threads.com/@naminsoo_ai" "docs/snapshots/threads-naminsoo_ai.md"
*/

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  const url = process.argv[2];
  const outPath = process.argv[3] || path.join('docs', 'snapshots', `threads-snapshot-${Date.now()}.md`);

  if (!url) {
    console.error('Usage: node scripts/snapshot-threads.js <url> [out.md]');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'ko-KR'
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // 초기 렌더 안정화
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);

    // 쿠키 배너가 있다면 닫기 (베스트 에포트)
    try {
      const consentBtn = await page.$('text=/.*(동의|허용|확인).*/');
      if (consentBtn) await consentBtn.click({ timeout: 1000 }).catch(() => {});
    } catch {}

    const snapshot = await page.evaluate(() => {
      const title = document.title || '';
      const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
      const description = document.querySelector('meta[name="description"]')?.content || '';
      const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
      const ogDesc = document.querySelector('meta[property="og:description"]')?.content || '';
      const visibleText = document.body?.innerText || '';
      return { title, canonical, description, ogTitle, ogDesc, visibleText };
    });

    const header = `# Threads Snapshot\n\n- URL: ${snapshot.canonical}\n- Title: ${snapshot.title}\n- Captured: ${new Date().toISOString()}\n`;
    const meta = snapshot.description || snapshot.ogTitle || snapshot.ogDesc
      ? `\n## Meta\n\n- Description: ${snapshot.description}\n- og:title: ${snapshot.ogTitle}\n- og:description: ${snapshot.ogDesc}\n`
      : '';
    const body = `\n## Visible Text\n\n\n${snapshot.visibleText}\n`;

    const md = `${header}${meta}${body}`;

    // 디렉토리 보장
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, md, 'utf8');
    console.log(`Saved snapshot to ${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



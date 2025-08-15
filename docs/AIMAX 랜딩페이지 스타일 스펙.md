# **AIMAX 랜딩페이지 스타일 스펙 (zip 기반, Pretendard 적용)**

## **비주얼 아이덴티티**

배경은 거의 흰색에 가까운 웜 톤(\#f2f1ef), 본문 텍스트는 짙은 블랙(\#131313).  
 포인트 컬러는 강한 오렌지(\#ff3d00) 한 가지를 사용해 시각적 강조를 최소화하면서도 명확한 초점을 만든다.  
 섹션 배경과 카드 배경은 이보다 밝거나 어두운 톤으로만 차등을 주고, 채도 높은 색은 포인트에만 사용.  
 요소 간 구분은 색 대비보다 여백·얇은 테두리·얕은 그림자로 구현한다.  
 다크 모드는 클래스 전환을 통해 색 변수를 바꾸는 구조를 전제로 한다.

---

## **타이포그래피**

* **폰트 패밀리:** [Pretendard](https://github.com/orioncactus/pretendard)  
   가독성이 좋고 굵기 단계가 다양해 헤드라인·본문·UI 모두 일관성 있게 사용 가능하다.

**웹 적용 예시**

 css  
복사편집  
`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');`

`body {`  
  `font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', sans-serif;`  
`}`

*   
* 제목은 600\~700 굵기, 넉넉한 행간

* 본문은 400\~500 굵기, 행간은 1.5배

* 강조는 굵기·컬러로 처리, 밑줄보다는 색 변화 사용

---

## **레이아웃 시스템**

콘텐츠 폭의 상한은 약 1320px.  
 섹션은 모두 이 폭 안에 정렬되고, 모바일에선 1열 → 태블릿 2열 → 데스크탑 3열로 확장된다.  
 카드는 둥근 모서리(라운드 크게), 얇은 1px 테두리, 얕은 그림자 한 겹, 필요 시 약한 그라디언트를 적용.  
 섹션 간 세로 간격은 넉넉히 두어 페이지 리듬을 일정하게 유지한다.  
 원칙은 “한 스크롤에 한 메시지”.

---

## **히어로 섹션**

풀블리드 컬러 배경 대신 SVG 패턴과 얇은 포인트 컬러 블록으로 질감을 만든다.  
 중심에는 큼직한 헤드라인과 짧은 서브카피, 그리고 CTA 버튼 두 개(포인트 색 채움 \+ 보조 테두리형)를 배치.  
 모든 버튼은 크게 라운딩 처리, 그림자는 얕게.  
 우측 또는 하단에 제품 미리보기 이미지를 배치해 시각적 관심을 분산.

---

## **사회적 증거**

로고 월과 한 줄 평, 대형 추천사 블록을 조합.  
 로고는 흑백 또는 단색 처리로 통일성을 유지하고, 간격·정렬로만 정돈.  
 후기 카드의 배경은 바닥과 분리되도록 살짝 띄우고, 본문 대비는 조금 낮춰 자연스럽게 읽히도록 한다.

---

## **문제 제기 → 기능 소개**

문제 섹션은 굵은 제목·짧은 문장·리스트로 강약을 준다.  
 기능 섹션은 벤토(타일) 스타일 그리드로 핵심 기능을 한눈에 보이게 하되, 아이콘·짧은 헤드라인·서브텍스트·작은 스크린샷을 조합.  
 시각적 강도는 아이콘 \< 제목 \< 이미지 순서로 배치.

---

## **사용 사례**

대표 시나리오 3개 정도를 각기 다른 색 배경이나 경계선으로 구분.  
 간결한 수치와 전·후 비교를 넣어 성과를 직관적으로 전달.  
 사례 간 간격은 충분히 벌려 정보 간섭을 방지.

---

## **가격 섹션**

월간/연간 토글 버튼 상단 배치, 2\~3개의 가격 카드 나란히 배치.  
 추천 플랜은 얇은 배지 또는 배경 하이라이트로 표시하되 과장하지 않는다.  
 각 카드에는 기능 리스트와 CTA 버튼이 하단에만 위치.  
 체크 아이콘은 라인 아이콘, 텍스트는 짧게 끊어 가독성 유지.

---

## **FAQ, 최종 CTA, 푸터**

FAQ는 아코디언 애니메이션, 부드러운 높이 전환.  
 최종 CTA는 히어로를 압축한 형태로 다시 한번 핵심 메시지와 버튼만 남긴다.  
 푸터는 얇은 구분선, 작은 글씨, 간단한 링크 묶음으로 마무리.

---

## **인터랙션과 모션**

스크롤 시 요소가 아래에서 위로, 투명도 0→1로 등장.  
 지속 시간은 짧게, 이징은 부드럽게.  
 리스트나 카드가 연속 등장 시 0.050.15초 간격의 스태거 적용.  
 호버 시 버튼·카드에 미세한 밝기 변화 또는 12px 상승감 부여.  
 애니메이션은 과하지 않고 자연스럽게.

---

## **아이콘·이미지**

아이콘은 라인 스타일, 굵기·끝마감 통일.  
 컬러는 채색을 최소화하고 포인트가 필요한 경우에만 적용.  
 이미지는 둥근 모서리와 얕은 그림자로 카드와 톤을 맞춤.

---

## **버튼과 폼**

주 버튼: 포인트 색 채움, 텍스트는 흰색  
 보조 버튼: 투명 배경+테두리  
 패딩은 넉넉하게, 포커스 링은 유지.  
 입력 필드: 얇은 보더, 둥근 모서리, 내부 여백 충분히.  
 에러 상태는 테두리 색 변경으로 표시.

---

## **반응형 규칙**

모바일: 한 열 레이아웃, 버튼·이미지 세로 쌓임  
 태블릿·데스크탑: 단계적으로 열 확장, 여백도 비례 확대  
 최대 폭 1320px 유지, 초광폭 모니터에서도 줄 길이 안정

---

## **접근성**

색 대비 충분히 확보, 포인트 색 남용 금지  
 링크·버튼은 색 변화 외에도 굵기·아이콘 등 보조 신호 제공  
 키보드 내비게이션 가능, 애니메이션은 시각적 방해 없이 짧게

이 문서를 그대로 넘기면, 개발자가 zip 없이도 동일한 톤·간격·모션을 재현할 수 있다.

## **0\) 전제**

* 프레임워크/스타일 시스템: Tailwind CSS \+ CSS 변수(hsl) 맵핑

* 컨테이너: 가로 중앙 정렬, 기본 패딩 2rem(`tailwind.config.ts: theme.container.padding = "2rem"`)

* 브레이크포인트: 기본 Tailwind sm/md/lg/xl \+ 커스텀 `2xl: 1400px`

* 다크모드: `class` 토글 방식(변수 교체 기반). zip에 다크 변수 정의 일부 생략돼 있지만, 구조상 `:root` 변수 교체 전제

---

## **1\) 컬러 토큰 (app/globals.css 기준)**

아래 값은 HSL 변수이며 Tailwind에서 `bg-background`, `text-foreground` 등으로 매핑됨.

* `--background: 40 8% 95%` ≈ `#f2f1ef`

* `--foreground: 0 0% 7%` ≈ `#131313`

* `--muted: 40 8% 90%` ≈ `#e8e6e3`

* `--muted-foreground: 0 0% 7% / 0.7` ≈ `rgba(19,19,19,0.7)`

* `--muted-foreground-light: 0 0% 7% / 0.5`

* `--muted-foreground-dark: 0 0% 7% / 0.6`

* `--card: 40 8% 98%`

* `--card-foreground: 0 0% 7%`

* `--popover: 40 8% 95%`

* `--popover-foreground: 0 0% 7%`

* `--primary: 14 100% 50%` ≈ `#ff3d00`

* `--primary-foreground: 0 0% 100%`(일반적인 대비 가정; zip 내 매핑 존재)

* `--primary-dark` / `--primary-light`: 존재. 예: `bg-primary-light/50` 사용(대시보드 프리뷰 바탕)

* `--secondary: 40 8% 90%`

* `--secondary-foreground: 0 0% 7%`

* `--accent: 40 8% 85%`

* `--border: 0 0% 7% / 0.08` ≈ `rgba(19,19,19,0.08)`

* `--ring: 14 100% 50%`

* `--radius: 0.5rem` (기본 라운드 반경)

Tailwind 매핑 예시(`tailwind.config.ts → theme.extend.colors`):

* `bg-background`, `text-foreground`, `border-border`, `bg-card`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`, 등으로 그대로 사용.

---

## **2\) 타이포그래피 (Pretendard 적용 – 네 요청 반영)**

폰트: Pretendard(웹 임포트)

 css  
복사편집  
`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');`

`html, body {`  
  `font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', sans-serif;`  
`}`

*   
* 제목: 600\~700 굵기, 넉넉한 행간

* 본문: 400\~500 굵기, 행간 ≈ 1.5

* 숫자/코드 느낌 필요한 요소는 모노체 섞는 패턴 있음(레이아웃 파일에서 모노 import 흔적). 그러나 최종 폰트는 Pretendard 우선.

---

## **3\) 레이아웃 폭·여백 규칙**

* 섹션 공통 래퍼: `max-w-[1320px] mx-auto`

* 섹션 상단 마진: `mt-8 md:mt-16`가 기본(일부는 더 큼)

* 히어로 바로 아래 첫 섹션(SocialProof) 진입 마진: `mt-[411px] md:mt-[400px]` (히어로 높이에 맞춘 배치)

* 페이지 기본 좌우 패딩: 모바일 `px-6` 사용 빈도 높음

---

## **4\) 히어로 섹션(components/hero-section.tsx)**

* 전체 래퍼

  * 정렬: 중앙 정렬, 텍스트 센터

  * 크기: `w-full h-[400px] md:w-[1220px] md:h[600px] lg:h-[810px]`

  * 패딩/마진: `my-6 py-0 px-4` (md 이상 `px-0`)

  * 모서리: `rounded-2xl`

* 내부 텍스트 컨테이너

  * 최대폭: `max-w-[500px]`, 서브텍스트 `max-w-[588px]` 병용

  * 버튼: 주 CTA `px-8 py-3 rounded-full`, 보조 CTA도 동일 패턴(보더형)

* 배경

  * SVG 패턴 사용, 바깥 프레임 `stroke="#131313" strokeOpacity="0.06"`

* 대시보드 미리보기와의 조합은 하단 섹션에서 연결(아래 6번 참고)

---

## **5\) 인터랙션/모션 (components/animated-section.tsx)**

Framer Motion 스펙(모든 섹션 공통 래퍼에 적용):

* 초기: `{ opacity: 0, y: 20, scale: 0.98 }`

* 인뷰: `{ opacity: 1, y: 0, scale: 1 }`

* 뷰포트: `{ once: true }` (한 번만 재생)

* 트랜지션: `{ duration: 0.8, ease: [0.33, 1, 0.68, 1], delay }`

* 딜레이: 섹션별 `0.1 ~ 0.25`초 등으로 시퀀스 구성(`app/page.tsx`)

호버/포커스 상태는 Tailwind 기본 \+ 컬러 토큰으로 처리. 별도 강한 애니메이션 없음.

---

## **6\) 대시보드 미리보기 카드(components/dashboard-preview.tsx)**

* 외곽 래퍼: 폭 `w-[calc(100vw-32px)] md:w-[1160px]`

* 배경 박스: `bg-primary-light/50 rounded-2xl p-2 shadow-2xl`

* 이미지: `rounded-xl shadow-lg`, `w:1160, h:700` 메타

* 그림자 등급: Tailwind `shadow-2xl`(외곽), 내부 이미지 `shadow-lg`

---

## **7\) 헤더/내비게이션(components/header.tsx)**

* 상단 바: `shadow-sm` 얕은 그림자

* 모바일 메뉴: 시트(Sheet) 컴포넌트 패턴, 내부 버튼 `rounded-full px-6 py-2 shadow-sm`

* 내비 항목: “기능”, “가격”, “후기” 앵커(\#features-section, \#pricing-section, \#testimonials-section)

---

## **8\) 사회적 증거(로고 그리드)**

* 섹션 래퍼: `max-w-[1320px] mx-auto`

* 마진: 히어로 뒤 첫 진입 `mt-[411px]/[400px]` 특수 값, 이후 섹션은 `mt-8 md:mt-16` 규격

* 로고는 흑백/단색 가정(스타일 톤상)

---

## **9\) 문제 섹션(components/problem-section.tsx)**

* 구조: 큰 제목 \+ 3개 포인트(카드 또는 리스트)

* 톤: 본문 대비를 살짝 낮추는 `text-muted-foreground` 계열 사용

* 레이아웃: 1열→2\~3열 반응형(컴포넌트 내부 grid/flex 조합)

---

## **10\) 기능 섹션(components/bento-section.tsx)**

* 벤토(타일)형 카드 그리드

* 카드 공통

  * 라운드: `rounded-xl` 또는 상위 래퍼 `rounded-2xl` 혼용

  * 보더: `outline: 1px solid hsl(var(--border))` 패턴(일부 컴포넌트에서 style 속성으로 명시)

  * 내부 간격: `p-4~p-6`급

  * 내용: 작은 아이콘/한 줄 헤드라인/짧은 본문/작은 미리보기 조합

---

## **11\) 사용 사례(components/use-cases-section.tsx)**

* 3개 카드(쇼핑몰/예약/제작 자동화 등)

* 강조값: 성과 수치에 `text-foreground` 대비 유지, 보조 텍스트 `text-muted-foreground`

* 그리드: 모바일 1→데스크탑 3

---

## **12\) 후기(components/large-testimonial.tsx \+ testimonial-grid-section.tsx)**

* 대형 추천사 1 \+ 그리드 다수

* 카드 톤: 배경 `bg-card`, 테두리 `--border`, 둥근 모서리, 얕은 그림자(기본 `shadow-sm` 수준)

---

## **13\) 가격 섹션(components/pricing-section.tsx)**

* 상단 토글: 연/월 전환

* 플랜 그리드: 2\~3열

* 플랜 카드

  * `rounded-xl`

  * 일반 카드: 외곽선 `outline: 1px solid hsl(var(--border)); outline-offset: -1px`

  * 인기 플랜: `bg-primary` 계열 \+ 흰색 전경(`text-primary-foreground`)

  * 커스텀 그림자 사용: `shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.10)]`

  * 내부: 제목/가격/설명/체크리스트/CTA 순

  * 체크 아이콘: lucide `Check` (라인 아이콘)

---

## **14\) FAQ(components/faq-section.tsx)**

* 아코디언 방식

* 아이템 열림/닫힘: 높이 전환(글로벌에서 `accordion-down/up` 키프레임 등록)

* 리스트 폭: `max-w-[600px]` 중앙 정렬, 상단 타이틀 별도

---

## **15\) CTA & 푸터(components/cta-section.tsx, footer-section.tsx)**

* CTA: 히어로 축약판(한 줄 핵심 \+ 버튼)

* 푸터: 얇은 구분선, 작은 글씨, 링크 묶음

---

## **16\) 라운드·보더·그림자 등 수치 표준화**

* 라운드

  * 기본 변수: `--radius: 0.5rem`

  * 컴포넌트 사용: `rounded-xl = 0.75rem`, `rounded-2xl = 1rem`, 버튼은 `rounded-full`

* 보더

  * 두께: 1px

  * 색: `hsl(var(--border))` ≈ `rgba(19,19,19,0.08)`

  * 카드 외곽선은 `outline`로 그어 `outline-offset: -1px` 사용(가격 카드 등)

* 그림자(실사용)

  * `shadow-sm` 헤더/버튼

  * `shadow-lg` 이미지

  * `shadow-2xl` 대시보드 프레임

  * 커스텀: `0 4px 8px -2px rgba(0,0,0,0.10)`(가격 섹션 카드)

---

## **17\) 간격(주요 클래스 샘플)**

* 섹션 간: `mt-8 md:mt-16`

* 히어로 인접: `mt-[411px] md:mt-[400px]`

* 카드 내부: `p-4 ~ p-6`

* 버튼: `px-8 py-3`

* 버튼 그룹/요소 사이: `gap-3, gap-4, gap-8` 자주 사용

---

## **18\) 아이콘/이미지 스타일**

* 아이콘: lucide-react 라인 아이콘(일관 굵기)

* 색: 텍스트/보더 토큰 사용, 채색 최소화

* 이미지: `rounded-xl` \+ `shadow-lg` 기본, 필요 시 배경 박스(`bg-primary-light/50`)로 레이어 분리

---

## **19\) 접근성/상태**

* 포커스 링: `--ring` \= `14 100% 50%`(포인트와 일치)

* 대비: 본문은 `foreground` 대비, 보조 텍스트는 `muted-foreground`

* 호버: 밝기/테두리/살짝 상승감(translateY 1\~2px) 수준, 과한 애니메이션 없음

---

## **20\) 구현 체크리스트(최소 합격선)**

* 컨테이너 폭/패딩: `max-w-[1320px] + px-6` 일관

* 컬러 토큰: 위 변수로만 적용(직접 HEX 남발 금지)

* 라운드/보더/그림자 등급: 위 표준치 사용

* 스크롤 인뷰 모션: duration 0.8 / ease `[0.33,1,0.68,1]` / y:20 / scale:0.98 → 1

* 섹션 간 간격: 기본 `mt-8 md:mt-16`, 히어로 직후는 특수 마진

* 버튼 크기/라운드: `px-8 py-3`, `rounded-full`

* 가격 카드 보더: `outline: 1px solid hsl(var(--border)); outline-offset: -1px`

* 대시보드 프리뷰: 외곽 `rounded-2xl shadow-2xl`, 내부 이미지 `rounded-xl shadow-lg`


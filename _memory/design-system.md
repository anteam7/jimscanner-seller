# 디자인 시스템 v2.1 — 짐스캐너 SELLER

마지막 갱신: 2026-05-15

레퍼런스: 샵링커·셀러허브·플레이오토·카페24 어드민 — 한국 sellers SaaS 표준

---

## 톤 한 줄

**라이트 메인 + 다크 사이드바 + Pretendard + shadow-sm 입체감**

---

## 컬러 토큰

### Background
- `bg-slate-50` (#F8FAFC) — 메인 컨텐츠 canvas
- `bg-white` — 카드·테이블·모달 surface
- `bg-slate-800` (#1E293B) — **다크 사이드바 only** (그 외 영역에 쓰지 말 것)
- `bg-slate-100` — secondary card (subtle gray)

### Text
- `text-slate-900` — H1, 중요 텍스트
- `text-slate-800` — H2, 카드 제목
- `text-slate-700` — H3, 본문 강조
- `text-slate-600` — 본문, subtitle (주의: cron sed 가 일부 400 으로 만들었음. 진하게 복원 권장)
- `text-slate-500` — caption, label
- `text-slate-400` — placeholder, hint, muted

### Sidebar (다크 컨텍스트)
- bg: `bg-slate-800`
- 텍스트: `text-slate-100/300/400` (white·muted·hint)
- active: `bg-indigo-500/20 text-indigo-200`
- hover: `bg-slate-700 text-white`
- border: `border-slate-700`

### Accent
- Primary: `indigo-600` (button, link, focus ring)
- `indigo-50` (soft bg) + `text-indigo-700` (badge)
- Success: `emerald-600` + `bg-emerald-50` + `text-emerald-700`
- Warning: `amber-600` + `bg-amber-50` + `text-amber-800`
- Danger: `red-600` + `bg-red-50` + `text-red-700`
- Info / 운송 메타포: `sky-500` (B2C 톤 차용)

### Border
- `border-slate-200` — 카드·테이블·input 기본
- `border-slate-300` — 활성 input
- `border-slate-700` — 사이드바 내부

---

## 폰트

- 한국어: **Pretendard Variable** (globals.css CDN @import — `cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9`)
- 영문/숫자: Geist Sans + system fallback
- 크기:
  - H1 = `text-2xl` (24px) + `font-bold` + `tracking-tight`
  - H2 = `text-sm` + `font-semibold` (section heading)
  - 본문 = `text-sm` (14px) 또는 `text-xs` (12px, dense)
  - label = `text-xs font-semibold text-slate-500 uppercase tracking-wider`

---

## 컴포넌트 패턴

### Card
```tsx
<div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
  ...
</div>
```

- `rounded-xl` (12px) — 라이트 톤 카드 표준
- `shadow-sm` 필수 (flat 느낌 방지)
- `hover:shadow-md` + `transition-shadow` (interactive 카드)
- `border-l-[3px] border-l-{color}-500` — accent bar (통계 카드 등)

### Status Banner (Gradient)
```tsx
<div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-5 py-4 shadow-sm">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/30">
      <svg className="w-5 h-5 text-white" ...>...</svg>
    </div>
    <div>
      <p className="text-sm font-semibold text-emerald-900">...</p>
      <p className="text-xs text-slate-600 mt-0.5">...</p>
    </div>
  </div>
</div>
```

색 매핑:
- 성공/완료: emerald
- 진행 중/대기: amber
- 정지/위험: red
- 정보: blue 또는 sky

### Button — Primary
```tsx
<button className="h-11 px-4 rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50">
  ...
</button>
```

### Button — Secondary
```tsx
<button className="h-11 px-4 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium transition-colors">
  ...
</button>
```

### Input
```tsx
<Input className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500" />
```

### Verification Badge (dual variant)
- Light (헤더): `bg-{color}-50 text-{color}-700 border-{color}-200`
- Dark (사이드바): `bg-{color}-900/40 text-{color}-200 border-{color}-800/50`

### Modal
```tsx
<div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
  <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
    ...
  </div>
</div>
```

### Toast
- 위치: **bottom-right 통일** (top-center 쓰지 말 것)
- Success: `bg-emerald-50 border-emerald-200 text-emerald-700`
- Error: `bg-red-50 border-red-200 text-red-700`

### Empty State
- 큰 SVG/이모지 + 안내 텍스트 + primary CTA
- `text-center py-12` 정도 여백
- (Stage 2b 작업 시 일러스트 도입 고려)

---

## 레이아웃 메트릭

- Sidebar width: **220px**
- Header height: **56px** (h-14)
- Content padding: **p-8** (32px)
- Max-width: 페이지 종류별
  - dashboard: max-w-5xl
  - settings: max-w-4xl
  - pricing: max-w-6xl (4-col)
  - signup/login form: max-w-md (centered)

### Gap
- 큰 섹션 간: `space-y-8`
- 카드 그리드: `gap-3` 또는 `gap-4`
- form 필드 간: `space-y-5`

---

## 페이지 구조 표준

### App 내부 페이지 (sidebar 옆)
```tsx
<div className="p-8 space-y-8 max-w-{N}xl">
  {/* 헤더 */}
  <div>
    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
    <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
  </div>

  {/* 컨텐츠 sections */}
  <section>
    <h2 className="text-sm font-semibold text-slate-900 mb-3">{section}</h2>
    <div className="grid grid-cols-... gap-...">
      {/* 카드들 */}
    </div>
  </section>
</div>
```

### Auth 페이지 (full viewport)
```tsx
<div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
  <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
    <Link href="/signup" className="text-lg font-bold tracking-tight">
      짐스캐너 SELLER
    </Link>
    ...
  </header>
  <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
    <div className="w-full max-w-md">
      ...
    </div>
  </main>
  <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200">
    © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
  </footer>
</div>
```

---

## 로고

- B2C 짐스캐너 로고 (`public/jimscanner-logo.png`) 그대로 사용
- 사이드바 (다크 bg) 위에는 `brightness-0 invert` filter 로 흰색 변환
- "SELLER" 표기 추가 — `bg-indigo-500/15 border-indigo-500/30 text-indigo-300 rounded` pill
- 로그인/Signup 헤더 등 라이트 영역에서는 원본 색 그대로 (다음 작업 시 적용)

---

## 자주 발생하는 함정

| 함정 | 처방 |
|---|---|
| sed 일괄 swap 으로 button 안 `text-white` 가 `text-slate-900` 됨 | `bg-indigo-600` 등 색 버튼 안 `text-white` 유지 |
| `text-indigo-400` 라이트 톤 가독성 약함 | 본문 link 는 `text-indigo-600 hover:text-indigo-700` |
| `<a href>` 로 internal 이동 시 SPA 깨짐 | 반드시 `next/Link` |
| 카드 flat 한 느낌 | `shadow-sm` 추가, hover 시 `shadow-md` |
| 빽빽한 느낌 | content padding 32 (`p-8`), gap 16 (`gap-4`) |
| Sidebar 안 light pill 강요 | sidebar variant 별도 — `bg-{color}-900/40` 톤 사용 |
| Pretendard 안 적용 | globals.css `@import url(.../pretendardvariable-dynamic-subset.css)` 확인 |

---

## v2 → v2.1 변경 요약

- 카드: `shadow-none` → `shadow-sm`
- 상태 배너: solid → gradient (`from-{color}-50 to-white`)
- 아이콘 컨테이너: subtle bg → solid 강조 (`bg-{color}-500 + shadow-sm shadow-{color}-500/30`)
- h1: `text-xl` → `text-2xl tracking-tight`
- 통계 카드: 단색 → indigo/emerald/sky 3분할 + accent border-l-[3px]
- content padding: `p-6` → `p-8`
- 빠른 작업 (Quick Actions) 섹션 추가 (dashboard)

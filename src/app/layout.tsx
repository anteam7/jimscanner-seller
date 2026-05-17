import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://seller.jimscanner.co.kr'),
  title: {
    default: '짐스캐너 SELLER — 해외 직구 셀러 운영 자동화',
    template: '%s | 짐스캐너 SELLER',
  },
  description:
    '해외 직구 셀러를 위한 운영 자동화 SaaS. 배대지 양식 자동 변환 · 환율 적용 마진 계산 · 합배송 묶기.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: '짐스캐너 SELLER',
    description: '해외 직구 셀러 운영 자동화 SaaS',
    url: 'https://seller.jimscanner.co.kr',
  },
}

const PRETENDARD_CSS_URL =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard CDN — preconnect 로 DNS/TLS 미리 + stylesheet 비동기 로드 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preload" as="style" href={PRETENDARD_CSS_URL} />
        <link rel="stylesheet" href={PRETENDARD_CSS_URL} />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}

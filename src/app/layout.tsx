import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://seller.jimscanner.co.kr'),
  title: {
    default: '짐스캐너 B2B — 직구 사업자 도구',
    template: '%s | 짐스캐너 B2B',
  },
  description:
    '구매대행·해외직구 사업자를 위한 주문 통합·배대지 양식 자동 변환·의뢰자 관리 SaaS.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: '짐스캐너 B2B',
    description: '구매대행 사업자용 SaaS',
    url: 'https://seller.jimscanner.co.kr',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}

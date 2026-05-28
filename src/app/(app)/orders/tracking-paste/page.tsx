import type { Metadata } from 'next'
import TrackingPasteClient from './TrackingPasteClient'

export const metadata: Metadata = {
  title: '운송장 일괄 입력',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default function TrackingPastePage() {
  return <TrackingPasteClient />
}

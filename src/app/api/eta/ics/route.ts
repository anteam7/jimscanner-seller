import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { buildEtaLookup, computeOrderEta, formatKstDate, type TransitDefault } from '@/lib/b2b/eta'

export const dynamic = 'force-dynamic'

const ACTIVE_STATUS = ['draft', 'pending', 'paid', 'purchasing', 'shipping', 'refund_requested']

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function icsDate(d: Date): string {
  // YYYYMMDD (KST 자정 기준)
  return formatKstDate(d).replace(/-/g, '')
}

function icsDateTimeUtc(d: Date): string {
  // YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return new NextResponse('No account', { status: 403 })
  }

  const [{ data: ordersRaw }, { data: defaultsRaw }] = await Promise.all([
    sb
      .from('b2b_orders')
      .select('id, order_number, market_order_number, marketplace, buyer_name, forwarder_country, forwarder_submitted_at, order_date, created_at, status')
      .eq('account_id', account.id)
      .is('deleted_at', null)
      .in('status', ACTIVE_STATUS)
      .order('created_at', { ascending: false })
      .limit(500),
    sb
      .from('b2b_forwarder_transit_defaults')
      .select('origin_country, method, avg_transit_days, min_transit_days, max_transit_days')
      .eq('is_active', true),
  ])

  const lookup = buildEtaLookup((defaultsRaw ?? []) as TransitDefault[])
  const orders = ordersRaw ?? []
  const now = new Date()
  const dtstamp = icsDateTimeUtc(now)

  const lines: string[] = []
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//jimscanner//seller-eta//KO')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push('X-WR-CALNAME:짐스캐너 SELLER · 도착 예정')
  lines.push('X-WR-TIMEZONE:Asia/Seoul')

  for (const o of orders) {
    const { eta, basis, days } = computeOrderEta(o, lookup)
    const date = icsDate(eta)
    const orderRef = o.market_order_number ?? o.order_number
    const buyer = o.buyer_name ?? '미지정'
    const country = o.forwarder_country ?? 'OTHER'
    const basisLabel = basis === 'forwarder_submitted' ? '배대지 접수 기준' : '주문일 기준 추정'
    const summary = escapeIcs(`📦 ${orderRef} · ${buyer}`)
    const description = escapeIcs(
      `구매자: ${buyer}\n` +
      `주문번호: ${orderRef}\n` +
      `국가: ${country}\n` +
      `운송일수: ${days}일 (${basisLabel})`,
    )
    const uid = `eta-${o.id}@seller.jimscanner.co.kr`

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART;VALUE=DATE:${date}`)
    lines.push(`DTEND;VALUE=DATE:${date}`)
    lines.push(`SUMMARY:${summary}`)
    lines.push(`DESCRIPTION:${description}`)
    if (basis === 'order_date_estimated') {
      lines.push('CATEGORIES:추정')
    }
    lines.push('TRANSP:TRANSPARENT')
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  // RFC 5545 — CRLF 라인 종결
  const body = lines.join('\r\n') + '\r\n'

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="jimscanner-eta.ics"',
      'Cache-Control': 'no-store',
    },
  })
}

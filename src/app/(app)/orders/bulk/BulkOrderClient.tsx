'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MARKETPLACES, SUPPLIER_SITES, CURRENCIES } from '@/lib/b2b/order-options'

type SkuLite = {
  id: string
  seller_sku: string
  display_name: string
  english_name: string | null
  default_supplier_site: string | null
  default_currency: string | null
  default_unit_price: number | string | null
  default_forwarder_id: string | null
  default_forwarder_country: string | null
  default_weight_kg: number | string | null
}

export type ForwarderOption = {
  id: string
  name: string
  slug: string
}

// ─── 컬럼 정의 ─────────────────────────────────────────────────────────
type ColumnType = 'text' | 'number' | 'select' | 'date'

type ColumnDef = {
  key: string
  label: string
  type: ColumnType
  required?: boolean
  width: number
  group: '마켓' | '구매자' | '상품/매입' | '배대지' | '기타'
  options?: { value: string; label: string }[]
  placeholder?: string
  pattern?: RegExp
  patternMessage?: string
}

const MARKETPLACE_OPTIONS = MARKETPLACES
const SUPPLIER_OPTIONS = SUPPLIER_SITES
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.code, label: c.code }))

const FORWARDER_COUNTRY_OPTIONS = [
  { value: 'US', label: '미국' },
  { value: 'JP', label: '일본' },
  { value: 'CN', label: '중국' },
  { value: 'DE', label: '독일' },
  { value: 'UK', label: '영국' },
  { value: 'HK', label: '홍콩' },
  { value: 'OTHER', label: '기타' },
]

function buildColumns(forwarders: ForwarderOption[]): ColumnDef[] {
  return [
    // 마켓
    { key: 'marketplace', label: '마켓', type: 'select', width: 130, group: '마켓', options: MARKETPLACE_OPTIONS },
    { key: 'market_order_number', label: '마켓 주문번호', type: 'text', width: 170, group: '마켓', placeholder: '예: 2026...' },
    { key: 'order_date', label: '주문일', type: 'date', width: 130, group: '마켓' },
    { key: 'order_number', label: '셀러 주문번호', type: 'text', width: 150, group: '마켓', placeholder: '비우면 자동' },
    // 구매자
    { key: 'buyer_name', label: '구매자 이름', type: 'text', width: 110, group: '구매자' },
    { key: 'buyer_phone', label: '전화', type: 'text', width: 130, group: '구매자', placeholder: '010-1234-5678' },
    { key: 'buyer_postal_code', label: '우편번호', type: 'text', width: 90, group: '구매자', pattern: /^\d{5}$/, patternMessage: '우편번호 5자리' },
    { key: 'buyer_address', label: '기본 주소', type: 'text', width: 240, group: '구매자' },
    { key: 'buyer_detail_address', label: '상세 주소', type: 'text', width: 180, group: '구매자' },
    { key: 'buyer_customs_code', label: '개인통관코드', type: 'text', width: 140, group: '구매자', placeholder: 'P123...', pattern: /^P\d{12}$/i, patternMessage: 'P+12자리 (예: P123456789012)' },
    // 상품 / 매입
    { key: 'market_product_id', label: '마켓 상품번호', type: 'text', width: 130, group: '상품/매입' },
    { key: 'market_option', label: '마켓 옵션', type: 'text', width: 130, group: '상품/매입', placeholder: '색/사이즈' },
    { key: 'product_name', label: '상품명', type: 'text', width: 240, group: '상품/매입', required: true },
    { key: 'quantity', label: '갯수', type: 'number', width: 70, group: '상품/매입' },
    { key: 'supplier_site', label: '매입처', type: 'select', width: 140, group: '상품/매입', options: SUPPLIER_OPTIONS },
    { key: 'product_url', label: '매입 링크', type: 'text', width: 200, group: '상품/매입', placeholder: 'https://' },
    { key: 'supplier_order_number', label: '매입 주문번호', type: 'text', width: 160, group: '상품/매입' },
    { key: 'currency', label: '통화', type: 'select', width: 80, group: '상품/매입', options: CURRENCY_OPTIONS },
    { key: 'unit_price_foreign', label: '매입 단가', type: 'number', width: 110, group: '상품/매입' },
    { key: 'forwarder_country', label: '매입 국가', type: 'select', width: 100, group: '상품/매입', options: FORWARDER_COUNTRY_OPTIONS },
    { key: 'weight_kg', label: '중량(kg)', type: 'number', width: 90, group: '상품/매입' },
    { key: 'sale_price_krw', label: '판매가(KRW)', type: 'number', width: 120, group: '상품/매입' },
    // 배대지
    {
      key: 'forwarder_id',
      label: '배대지',
      type: 'select',
      width: 130,
      group: '배대지',
      options: forwarders.map((f) => ({ value: f.id, label: f.name })),
    },
    { key: 'forwarder_warehouse', label: '배대지 창고', type: 'text', width: 130, group: '배대지', placeholder: '예: NJ, OR' },
    // 기타
    { key: 'market_commission_krw', label: '수수료(KRW)', type: 'number', width: 110, group: '기타' },
    { key: 'shipping_fee_krw', label: '배송비(KRW)', type: 'number', width: 110, group: '기타' },
    { key: 'request_notes', label: '메모', type: 'text', width: 200, group: '기타' },
  ]
}

const GROUP_ACCENT: Record<ColumnDef['group'], string> = {
  '마켓': 'bg-indigo-50/40 text-indigo-700',
  '구매자': 'bg-emerald-50/40 text-emerald-700',
  '상품/매입': 'bg-sky-50/40 text-sky-700',
  '배대지': 'bg-amber-50/40 text-amber-700',
  '기타': 'bg-slate-50 text-slate-700',
}

// ─── Row 타입 ──────────────────────────────────────────────────────────
type Row = Record<string, string>

function emptyRow(): Row {
  return {}
}

function rowHasContent(row: Row): boolean {
  return Object.values(row).some((v) => v != null && String(v).trim() !== '')
}

function rowMissingRequired(row: Row, cols: ColumnDef[]): string[] {
  if (!rowHasContent(row)) return [] // 빈 행은 검증 안 함 (자동 무시)
  return cols.filter((c) => c.required && !String(row[c.key] ?? '').trim()).map((c) => c.label)
}

// 셀별 format 오류 — pattern 정의된 column 의 값이 형식에 안 맞을 때
function rowFormatErrors(row: Row, cols: ColumnDef[]): { label: string; message: string }[] {
  if (!rowHasContent(row)) return []
  const errors: { label: string; message: string }[] = []
  for (const c of cols) {
    if (!c.pattern) continue
    const v = String(row[c.key] ?? '').trim()
    if (!v) continue // 빈 값은 형식 검사 X (required 와 분리)
    if (!c.pattern.test(v)) {
      errors.push({ label: c.label, message: c.patternMessage ?? '형식이 잘못되었습니다.' })
    }
  }
  return errors
}

function cellHasFormatError(row: Row, col: ColumnDef): boolean {
  if (!col.pattern) return false
  const v = String(row[col.key] ?? '').trim()
  if (!v) return false
  return !col.pattern.test(v)
}

// ─── 컴포넌트 ──────────────────────────────────────────────────────────
export default function BulkOrderClient({ forwarders }: { forwarders: ForwarderOption[] }) {
  const router = useRouter()
  const columns = useMemo(() => buildColumns(forwarders), [forwarders])

  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 5 }, emptyRow))
  const [pasteText, setPasteText] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [serverResults, setServerResults] = useState<
    { index: number; ok: boolean; error?: string; order_number?: string }[] | null
  >(null)

  // 통계
  const stats = useMemo(() => {
    let filled = 0
    let invalid = 0
    let formatErr = 0
    rows.forEach((r) => {
      if (!rowHasContent(r)) return
      filled++
      const hasMissing = rowMissingRequired(r, columns).length > 0
      const hasFormat = rowFormatErrors(r, columns).length > 0
      if (hasMissing) invalid++
      if (hasFormat) formatErr++
    })
    return { filled, invalid, valid: filled - invalid - formatErr, formatErr }
  }, [rows, columns])

  const updateCell = useCallback((rowIdx: number, key: string, value: string) => {
    setRows((prev) => {
      const next = prev.slice()
      next[rowIdx] = { ...next[rowIdx], [key]: value }
      return next
    })
  }, [])

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow()])
  }, [])

  const addRows = useCallback((n: number) => {
    setRows((prev) => [...prev, ...Array.from({ length: n }, emptyRow)])
  }, [])

  const removeRow = useCallback((idx: number) => {
    setRows((prev) => {
      const next = prev.slice()
      next.splice(idx, 1)
      return next.length === 0 ? [emptyRow()] : next
    })
  }, [])

  const clearAll = useCallback(() => {
    if (!confirm('모든 행을 비우시겠습니까?')) return
    setRows(Array.from({ length: 5 }, emptyRow))
    setServerResults(null)
    setGlobalError(null)
  }, [])

  const applySkuToRow = useCallback((rowIdx: number, p: SkuLite) => {
    setRows((prev) => {
      const next = prev.slice()
      const cur = { ...next[rowIdx] }
      cur.product_name = p.display_name
      cur._sku_id = p.id
      cur._sku_code = p.seller_sku
      if (p.default_supplier_site && !cur.supplier_site) cur.supplier_site = p.default_supplier_site
      if (p.default_currency && !cur.currency) cur.currency = p.default_currency
      if (p.default_unit_price != null && !cur.unit_price_foreign) {
        cur.unit_price_foreign = String(p.default_unit_price)
      }
      if (p.default_weight_kg != null && !cur.weight_kg) {
        cur.weight_kg = String(p.default_weight_kg)
      }
      if (p.default_forwarder_id && !cur.forwarder_id) cur.forwarder_id = p.default_forwarder_id
      if (p.default_forwarder_country && !cur.forwarder_country) {
        cur.forwarder_country = p.default_forwarder_country
      }
      next[rowIdx] = cur
      return next
    })
  }, [])

  // select 컬럼별 값 alias — 사용자가 라벨·value 외 한국어 변형·영문명을 paste 해도 enum 으로 변환
  // (`HEADER_ALIASES` 가 컬럼명 매핑이라면 이건 셀 값 매핑)
  const SELECT_VALUE_ALIASES: Record<string, Record<string, string[]>> = {
    marketplace: {
      coupang: ['쿠팡', 'Coupang', '쿠팡닷컴'],
      smartstore: ['스마트스토어', '네이버', '네이버 스마트스토어', '네이버스마트스토어', 'Smart Store', 'Smartstore'],
      auction: ['옥션', 'Auction'],
      gmarket: ['지마켓', 'G마켓', 'Gmarket'],
      '11st': ['11번가', '십일번가', 'Eleven Street', '11st'],
      interpark: ['인터파크', 'Interpark'],
      wemakeprice: ['위메프', 'Wemakeprice', 'WMP'],
      tmon: ['티몬', '티켓몬스터', 'Tmon'],
      kakao_gift: ['카카오 선물하기', '카카오선물하기', '카카오톡 선물하기', '카톡 선물하기'],
      own_mall: ['자사몰', '자체몰', '독립몰', '브랜드몰'],
      kakao_channel: ['카카오 채널', '카카오채널', '카톡 채널'],
      instagram: ['인스타그램', '인스타', 'Instagram', 'IG'],
      other: ['기타', '그외', '기타몰'],
    },
    supplier_site: {
      amazon_us: ['미국 아마존', '아마존 미국', '아마존US', '아마존 US', 'Amazon US', 'Amazon.com', 'amazon.com', '아마존'],
      amazon_jp: ['일본 아마존', '아마존 일본', 'Amazon JP', 'Amazon.co.jp', 'amazon.co.jp', '아마존JP'],
      amazon_de: ['독일 아마존', '아마존 독일', 'Amazon DE', 'Amazon.de', 'amazon.de'],
      amazon_uk: ['영국 아마존', '아마존 영국', 'Amazon UK', 'Amazon.co.uk', 'amazon.co.uk'],
      amazon_ca: ['캐나다 아마존', '아마존 캐나다', 'Amazon CA', 'Amazon.ca', 'amazon.ca'],
      rakuten_jp: ['라쿠텐', 'Rakuten', '라쿠텐 재팬', 'rakuten.co.jp'],
      yahoo_jp: ['야후 재팬', '야후재팬', '야후 옥션', 'Yahoo Japan', 'Yahoo Auction', 'auctions.yahoo.co.jp'],
      mercari_jp: ['메루카리', '메르카리', 'Mercari', 'mercari.com'],
      zozotown: ['조조타운', '죠죠타운', 'Zozo', 'zozo.jp'],
      taobao: ['타오바오', '淘宝', 'Taobao', 'taobao.com'],
      tmall: ['티몰', '天猫', 'Tmall', 'tmall.com'],
      aliexpress: ['알리익스프레스', '알리', 'AliExpress', 'Aliexpress', 'aliexpress.com'],
      jd: ['징동', '징동닷컴', 'JD', 'JD.com', 'jd.com', '京东'],
      pinduoduo: ['핀둬둬', '핀뚸뚸', 'Pinduoduo', 'PDD'],
      ebay: ['이베이', 'ebay', 'eBay.com'],
      walmart: ['월마트', 'walmart.com'],
      target: ['타깃', '타켓', 'Target.com'],
      shopee: ['쇼피', 'shopee.com'],
      lazada: ['라자다', 'lazada.com'],
      farfetch: ['파페치', 'farfetch.com'],
      ssense: ['센스', 'ssense.com'],
      matchesfashion: ['매치스패션', 'Matches', 'matches.com'],
      mytheresa: ['마이테레사', 'My Theresa', 'mytheresa.com'],
      other: ['기타', '그외', '기타 사이트'],
    },
    currency: {
      USD: ['달러', '미국 달러', '미달러', '$', 'dollar', 'Dollar', 'US$', 'USD ($)'],
      JPY: ['엔', '엔화', '일본 엔', '¥', 'yen', 'Yen', 'JPY (¥)'],
      CNY: ['위안', '위안화', '인민폐', '元', '¥', 'yuan', 'Yuan', 'RMB', 'CNY (¥)'],
      EUR: ['유로', '€', 'euro', 'Euro', 'EUR (€)'],
      GBP: ['파운드', '영국 파운드', '£', 'pound', 'Pound', 'GBP (£)'],
      HKD: ['홍콩달러', '홍콩 달러', 'HK$', 'HKD (HK$)'],
      KRW: ['원', '원화', '한국 원', '₩', 'won', 'Won', 'KRW (₩)'],
    },
    forwarder_country: {
      US: ['미국', 'USA', 'America', 'U.S.', 'U.S.A', '미주'],
      JP: ['일본', 'Japan', 'JPN', '재팬'],
      CN: ['중국', 'China', 'CHN', 'PRC'],
      DE: ['독일', 'Germany', 'DEU', 'Deutschland'],
      UK: ['영국', 'United Kingdom', 'Britain', 'GB', 'England'],
      HK: ['홍콩', 'Hong Kong', 'HongKong'],
      OTHER: ['기타', '그외'],
    },
  }

  // 마켓별 헤더 alias — 쿠팡·스마트스토어·옥션·11번가 등 다양한 한국어 헤더 매핑
  const HEADER_ALIASES: Record<string, string[]> = {
    market_order_number: ['주문번호', '상품주문번호', '마켓 주문번호', '결제번호', 'Order ID', 'Order Number'],
    order_number: ['셀러 주문번호', '내부주문번호', 'Internal Order'],
    marketplace: ['마켓', '쇼핑몰', '판매처', '채널'],
    order_date: ['주문일', '주문일자', '결제일', '주문 시각'],
    buyer_name: ['구매자 이름', '구매자명', '수취인이름', '수취인명', '받는분', '받는 분', '수취인', '수령자', '받는사람'],
    buyer_phone: ['전화', '수취인연락처', '수취인전화', '받는분연락처', '연락처', '핸드폰', '휴대폰', '핸드폰번호', '구매자전화'],
    buyer_postal_code: ['우편번호', '받는분우편번호', '수령지우편번호', '집코드', 'ZIP'],
    buyer_address: ['기본 주소', '수령지주소', '받는분주소', '배송지', '도로명주소', '주소'],
    buyer_detail_address: ['상세 주소', '상세주소', '나머지주소', '동/호수'],
    buyer_customs_code: ['개인통관코드', '통관고유부호', '개인통관고유부호', '개통번호', 'PCCC', '통관코드'],
    market_product_id: ['상품번호', '마켓 상품번호', '상품 ID', 'product_id'],
    market_option: ['마켓 옵션', '옵션', '옵션 정보'],
    product_name: ['상품명', '품명', '제품명', '아이템'],
    quantity: ['갯수', '수량', '개수', '주문 수량'],
    supplier_site: ['매입처', '해외 쇼핑몰', '구매 사이트'],
    product_url: ['매입 링크', '상품 URL', '구매 링크', '쇼핑 URL'],
    supplier_order_number: ['매입 주문번호', '해외 주문번호', '쇼핑몰 주문번호'],
    currency: ['통화', '화폐'],
    unit_price_foreign: ['매입 단가', '단가', '구매가', '해외 단가'],
    forwarder_country: ['매입 국가', '구매 국가', '도착 국가'],
    weight_kg: ['중량(kg)', '중량', '무게'],
    sale_price_krw: ['판매가(KRW)', '판매가', '판매 금액', '판매가격'],
    forwarder_id: ['배대지', '배송대행지'],
    forwarder_warehouse: ['배대지 창고', '창고'],
    market_commission_krw: ['수수료(KRW)', '수수료', '마켓 수수료'],
    shipping_fee_krw: ['배송비(KRW)', '배송비'],
    request_notes: ['메모', '요청사항', '비고'],
  }

  // 헤더 라벨 → 컬럼 키 매핑 (paste 시 사용)
  const headerToKey = useMemo(() => {
    const map = new Map<string, string>()
    columns.forEach((c) => {
      map.set(c.label, c.key)
      map.set(c.key, c.key) // 영문 key 도 허용
    })
    // 마켓별 alias 추가
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      for (const alias of aliases) {
        if (!map.has(alias)) map.set(alias, key)
      }
    }
    return map
  }, [columns])

  const parsePaste = useCallback(() => {
    const text = pasteText.trim()
    if (!text) {
      setGlobalError('붙여넣을 내용이 없습니다.')
      return
    }
    setGlobalError(null)

    // TSV (탭 구분) 우선, 없으면 CSV (쉼표)
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length === 0) return

    const splitter = lines[0].includes('\t') ? '\t' : ','
    const headers = lines[0].split(splitter).map((h) => h.trim())
    const hasHeader = headers.some((h) => headerToKey.has(h))

    const dataLines = hasHeader ? lines.slice(1) : lines
    const keyOrder = hasHeader
      ? headers.map((h) => headerToKey.get(h) ?? null)
      : columns.map((c) => c.key)

    // select 컬럼별 label → value reverse lookup ('쿠팡' → 'coupang')
    // 1) opt.label / opt.value / lowercase 기본 매핑
    // 2) SELECT_VALUE_ALIASES 의 한국어·영문 변형 alias 추가 매핑
    const reverseLookup: Record<string, Map<string, string>> = {}
    for (const col of columns) {
      if (col.type !== 'select' || !col.options) continue
      const m = new Map<string, string>()
      for (const opt of col.options) {
        m.set(opt.label, opt.value)
        m.set(opt.label.toLowerCase(), opt.value)
        m.set(opt.value, opt.value) // value 그대로도 통과
        m.set(opt.value.toLowerCase(), opt.value)
      }
      // alias 병합 (이미 등록된 키는 덮어쓰지 않음 — opt.label 우선)
      const aliases = SELECT_VALUE_ALIASES[col.key]
      if (aliases) {
        for (const [value, variants] of Object.entries(aliases)) {
          for (const variant of variants) {
            if (!m.has(variant)) m.set(variant, value)
            const lower = variant.toLowerCase()
            if (!m.has(lower)) m.set(lower, value)
          }
        }
      }
      reverseLookup[col.key] = m
    }

    const parsed: Row[] = dataLines.map((line) => {
      const cells = line.split(splitter)
      const row: Row = {}
      cells.forEach((cell, i) => {
        const key = keyOrder[i]
        if (!key) return
        const raw = cell.trim()
        if (!raw) {
          row[key] = ''
          return
        }
        const lookup = reverseLookup[key]
        if (lookup) {
          const mapped = lookup.get(raw) ?? lookup.get(raw.toLowerCase())
          row[key] = mapped ?? raw // 매칭 실패 시 원문 유지 (검증에서 잡힘)
        } else {
          row[key] = raw
        }
      })
      return row
    })

    // 기존 빈 행 제거 후 paste 결과 추가
    setRows((prev) => {
      const filtered = prev.filter(rowHasContent)
      return [...filtered, ...parsed, emptyRow()]
    })
    setPasteText('')
    setPasteOpen(false)
  }, [pasteText, headerToKey, columns])

  const downloadTemplate = useCallback(() => {
    const headers = columns.map((c) => c.label).join(',')
    const sample = columns
      .map((c) => {
        if (c.key === 'marketplace') return 'coupang'
        if (c.key === 'market_order_number') return '2026051600000001'
        if (c.key === 'buyer_name') return '홍길동'
        if (c.key === 'buyer_phone') return '010-1234-5678'
        if (c.key === 'buyer_postal_code') return '06234'
        if (c.key === 'buyer_address') return '서울 강남구 테헤란로 123'
        if (c.key === 'buyer_customs_code') return 'P123456789012'
        if (c.key === 'product_name') return 'Nike Air Force 1'
        if (c.key === 'quantity') return '1'
        if (c.key === 'supplier_site') return 'amazon_us'
        if (c.key === 'product_url') return 'https://www.amazon.com/...'
        if (c.key === 'currency') return 'USD'
        if (c.key === 'unit_price_foreign') return '110'
        if (c.key === 'forwarder_country') return 'US'
        if (c.key === 'sale_price_krw') return '180000'
        if (c.key === 'forwarder_warehouse') return 'NJ'
        return ''
      })
      .join(',')
    const csv = `${headers}\n${sample}\n`
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jimscanner-bulk-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [columns])

  async function onSubmit() {
    setGlobalError(null)
    setServerResults(null)

    const payload = rows
      .map((r, idx) => ({ idx, r }))
      .filter((x) => rowHasContent(x.r))
      .map(({ r }) => {
        const out: Record<string, string | number | null> = {}
        columns.forEach((c) => {
          const v = r[c.key]
          if (v == null || String(v).trim() === '') {
            out[c.key] = null
          } else if (c.type === 'number') {
            const n = Number(v)
            out[c.key] = Number.isFinite(n) ? n : null
          } else {
            out[c.key] = String(v).trim()
          }
        })
        // SKU 적용된 행은 product_id 도 같이 전송
        if (r._sku_id) out.product_id = String(r._sku_id)
        return out
      })

    if (payload.length === 0) {
      setGlobalError('등록할 행이 없습니다. 최소 1개 행에 상품명을 입력해 주세요.')
      return
    }
    if (stats.invalid > 0) {
      setGlobalError(`${stats.invalid}개 행에 필수값(★)이 비어있습니다. 빨강 표시된 셀을 채워주세요.`)
      return
    }
    if (stats.formatErr > 0) {
      setGlobalError(`${stats.formatErr}개 행에 형식 오류 (통관코드·우편번호) 가 있습니다. 노랑 표시된 셀을 확인해 주세요.`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        success_count?: number
        fail_count?: number
        results?: { index: number; ok: boolean; error?: string; order_number?: string }[]
        error?: string
      }

      if (!res.ok && !json.results) {
        throw new Error(json.error || `등록 실패 (HTTP ${res.status})`)
      }

      setServerResults(json.results ?? [])
      if (json.fail_count === 0 && json.success_count && json.success_count > 0) {
        // 전부 성공 — 2초 후 목록으로
        setTimeout(() => {
          router.push('/orders')
          router.refresh()
        }, 1500)
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : '등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 실 입력 행만 결과 인덱스 매핑
  const payloadIndexMap = useMemo(() => {
    const m = new Map<number, number>() // rowIdx → payloadIdx
    let p = 0
    rows.forEach((r, i) => {
      if (rowHasContent(r)) {
        m.set(i, p)
        p++
      }
    })
    return m
  }, [rows])

  return (
    <div className="p-8 space-y-6 max-w-[1600px]">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <Link
          href="/orders"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors mt-1"
          aria-label="주문 목록으로"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">일괄 입력</h1>
          <p className="text-sm text-slate-600 mt-1">
            마켓에서 받은 주문을 한 번에 등록합니다. 그리드에 직접 입력하거나 엑셀에서 복사해 붙여넣을 수 있습니다.
          </p>
        </div>
      </div>

      {/* 컨트롤 바 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => addRows(5)}
          className="px-3 py-1.5 text-xs font-semibold rounded-md text-slate-700 border border-slate-200 bg-white hover:bg-slate-50"
        >
          + 5행 추가
        </button>
        <button
          type="button"
          onClick={addRow}
          className="px-3 py-1.5 text-xs font-semibold rounded-md text-slate-700 border border-slate-200 bg-white hover:bg-slate-50"
        >
          + 1행 추가
        </button>
        <button
          type="button"
          onClick={() => setPasteOpen((v) => !v)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors
            ${pasteOpen ? 'bg-indigo-600 text-white' : 'text-slate-700 border border-slate-200 bg-white hover:bg-slate-50'}`}
        >
          엑셀 붙여넣기
        </button>
        <button
          type="button"
          onClick={downloadTemplate}
          className="px-3 py-1.5 text-xs font-semibold rounded-md text-slate-700 border border-slate-200 bg-white hover:bg-slate-50"
        >
          CSV 템플릿 받기
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="px-3 py-1.5 text-xs font-semibold rounded-md text-rose-700 border border-rose-200 bg-white hover:bg-rose-50 ml-auto"
        >
          전체 비우기
        </button>
      </div>

      {/* paste 영역 */}
      {pasteOpen && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 shadow-sm p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-900">엑셀에서 복사해 붙여넣기</p>
              <p className="text-xs text-slate-600 mt-1">
                마켓에서 받은 주문 엑셀에서 헤더 행 포함해 셀들을 선택해 Ctrl+C → 아래 영역에 붙여넣으세요. 헤더가 한국어 라벨과 일치하면 자동 매핑됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPasteOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              닫기
            </button>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder={'예 (탭 또는 쉼표 구분):\n마켓\t마켓 주문번호\t구매자 이름\t상품명\t갯수\ncoupang\t202605160001\t홍길동\tNike Air Force 1\t1'}
            className="block w-full px-3 py-2 text-xs font-mono rounded-md border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setPasteText('')}
              className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-md"
            >
              지우기
            </button>
            <button
              type="button"
              onClick={parsePaste}
              disabled={!pasteText.trim()}
              className="px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
            >
              그리드에 추가
            </button>
          </div>
        </div>
      )}

      {/* 통계·요약 */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          입력 행 <span className="font-semibold text-slate-900 tabular-nums">{stats.filled}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          유효 <span className="font-semibold tabular-nums">{stats.valid}</span>
        </span>
        {stats.invalid > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            누락 <span className="font-semibold tabular-nums">{stats.invalid}</span>
          </span>
        )}
        {stats.formatErr > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700" title="통관코드 (P+12자리) 또는 우편번호 (5자리) 형식 오류">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            형식 오류 <span className="font-semibold tabular-nums">{stats.formatErr}</span>
          </span>
        )}
      </div>

      {globalError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-medium text-rose-700">{globalError}</p>
        </div>
      )}

      {/* 서버 결과 요약 */}
      {serverResults && (
        <ServerResultBanner results={serverResults} />
      )}

      {/* 그리드 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              {/* 그룹 헤더 */}
              <tr className="border-b border-slate-200">
                <th className="px-2 py-1.5 bg-slate-50 border-r border-slate-200 sticky left-0 z-10 min-w-[36px]" />
                {(() => {
                  const groupSpans: { group: ColumnDef['group']; span: number }[] = []
                  columns.forEach((c) => {
                    const last = groupSpans[groupSpans.length - 1]
                    if (last && last.group === c.group) last.span++
                    else groupSpans.push({ group: c.group, span: 1 })
                  })
                  return groupSpans.map((g, i) => (
                    <th
                      key={`${g.group}-${i}`}
                      colSpan={g.span}
                      className={`px-2 py-1.5 text-[10px] uppercase tracking-wider font-bold border-r border-slate-200 ${GROUP_ACCENT[g.group]}`}
                    >
                      {g.group}
                    </th>
                  ))
                })()}
                <th className="px-2 py-1.5 bg-slate-50 min-w-[40px]" />
              </tr>
              {/* 컬럼 라벨 */}
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-2 py-1.5 sticky left-0 z-10 bg-slate-50 border-r border-slate-200 text-slate-500 font-semibold">#</th>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    style={{ width: c.width, minWidth: c.width }}
                    className="px-2 py-1.5 text-left text-slate-700 font-semibold border-r border-slate-200 whitespace-nowrap"
                  >
                    {c.label}
                    {c.required && <span className="text-rose-500 ml-0.5">★</span>}
                  </th>
                ))}
                <th className="px-2 py-1.5 bg-slate-50" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, ridx) => {
                const missing = rowMissingRequired(row, columns)
                const formatErrs = rowFormatErrors(row, columns)
                const hasContent = rowHasContent(row)
                const payloadIdx = payloadIndexMap.get(ridx)
                const result =
                  payloadIdx !== undefined && serverResults
                    ? serverResults.find((r) => r.index === payloadIdx)
                    : undefined
                return (
                  <tr
                    key={ridx}
                    className={
                      result?.ok
                        ? 'bg-emerald-50/30'
                        : result && !result.ok
                          ? 'bg-rose-50/30'
                          : hasContent && (missing.length > 0 || formatErrs.length > 0)
                            ? 'bg-amber-50/30'
                            : ''
                    }
                    title={formatErrs.length > 0 ? `형식 오류: ${formatErrs.map((e) => `${e.label} (${e.message})`).join(', ')}` : undefined}
                  >
                    <td className="px-2 py-1 sticky left-0 z-10 bg-white border-r border-slate-200 text-slate-400 text-center tabular-nums">
                      {ridx + 1}
                    </td>
                    {columns.map((c) => {
                      const isMissing = c.required && hasContent && !String(row[c.key] ?? '').trim()
                      const isFormatErr = cellHasFormatError(row, c)
                      return (
                        <td
                          key={c.key}
                          style={{ width: c.width, minWidth: c.width }}
                          className={`p-0 border-r border-slate-100 ${isMissing ? 'bg-rose-50' : isFormatErr ? 'bg-amber-50 ring-1 ring-inset ring-amber-300' : ''}`}
                          title={isFormatErr ? c.patternMessage : undefined}
                        >
                          {c.key === 'product_name' ? (
                            <SkuPickerCell
                              value={row[c.key] ?? ''}
                              skuCode={row._sku_code ?? null}
                              onChange={(v) => updateCell(ridx, c.key, v)}
                              onPick={(p) => applySkuToRow(ridx, p)}
                              onClearSku={() => {
                                setRows((prev) => {
                                  const next = prev.slice()
                                  const cur = { ...next[ridx] }
                                  delete cur._sku_id
                                  delete cur._sku_code
                                  next[ridx] = cur
                                  return next
                                })
                              }}
                            />
                          ) : (
                            <Cell
                              col={c}
                              value={row[c.key] ?? ''}
                              onChange={(v) => updateCell(ridx, c.key, v)}
                            />
                          )}
                        </td>
                      )
                    })}
                    <td className="px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(ridx)}
                        className="w-6 h-6 inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        aria-label={`${ridx + 1}행 삭제`}
                        title="행 삭제"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 액션 */}
      <div className="flex items-center justify-end gap-2">
        <Link
          href="/orders"
          className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          취소
        </Link>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || stats.filled === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
        >
          {submitting ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
              </svg>
              등록 중…
            </>
          ) : (
            `${stats.valid}건 등록`
          )}
        </button>
      </div>
    </div>
  )
}

// ─── 셀 ────────────────────────────────────────────────────────────────
function Cell({ col, value, onChange }: { col: ColumnDef; value: string; onChange: (v: string) => void }) {
  if (col.type === 'select') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full h-7 px-1.5 text-xs bg-transparent text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-inset focus:bg-white"
      >
        <option value="">—</option>
        {col.options?.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  }
  return (
    <input
      type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={col.placeholder}
      step={col.type === 'number' ? 'any' : undefined}
      className={`block w-full h-7 px-1.5 text-xs bg-transparent text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-inset focus:bg-white ${col.type === 'number' ? 'text-right tabular-nums' : ''}`}
    />
  )
}

// ─── SKU 픽커 셀 (product_name 컬럼 전용) ──────────────────────────────
function SkuPickerCell({
  value,
  skuCode,
  onChange,
  onPick,
  onClearSku,
}: {
  value: string
  skuCode: string | null
  onChange: (v: string) => void
  onPick: (p: SkuLite) => void
  onClearSku: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SkuLite[]>([])
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const url = '/api/products?limit=10' + (query ? `&q=${encodeURIComponent(query)}` : '')
        const res = await fetch(url)
        const json = (await res.json().catch(() => ({}))) as { products?: SkuLite[] }
        setResults(json.products ?? [])
        setHighlight(0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open, query])

  function pick(p: SkuLite) {
    onPick(p)
    setOpen(false)
    setQuery('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault()
      pick(results[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative flex items-center w-full">
      {skuCode && (
        <button
          type="button"
          onClick={onClearSku}
          title="SKU 매핑 해제"
          className="ml-1 mr-0.5 px-1 py-0 h-[18px] inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 hover:border-indigo-300 transition-colors whitespace-nowrap"
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
          </svg>
          {skuCode}
        </button>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setQuery(e.target.value)
          if (!open) setOpen(true)
        }}
        onFocus={() => {
          setQuery(value)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        placeholder="상품명 또는 SKU 검색"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="sku-picker-list"
        aria-activedescendant={open && results[highlight] ? `sku-opt-${results[highlight].id}` : undefined}
        className="block w-full h-7 px-1.5 text-xs bg-transparent text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-inset focus:bg-white"
      />
      {open && (
        <div className="absolute left-0 top-full mt-0.5 z-30 w-[320px] max-h-[280px] overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-2 text-[11px] text-slate-500">검색 중…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-slate-500">
              {query ? '일치하는 SKU 없음 — 직접 입력 가능' : '등록된 SKU 없음 — /products 에서 등록'}
            </div>
          ) : (
            <ul id="sku-picker-list" role="listbox" className="py-1">
              {results.map((p, i) => (
                <li key={p.id} id={`sku-opt-${p.id}`} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(p)}
                    className={`w-full text-left px-3 py-1.5 text-[11px] ${i === highlight ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-indigo-700 shrink-0">{p.seller_sku}</span>
                      <span className="text-slate-900 truncate">{p.display_name}</span>
                    </div>
                    {(p.default_supplier_site || p.default_currency || p.default_unit_price != null) && (
                      <div className="mt-0.5 text-[10px] text-slate-500 truncate">
                        {[
                          p.default_supplier_site,
                          p.default_currency,
                          p.default_unit_price != null ? `${p.default_unit_price}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 결과 배너 ─────────────────────────────────────────────────────────
function ServerResultBanner({
  results,
}: {
  results: { index: number; ok: boolean; error?: string; order_number?: string }[]
}) {
  const success = results.filter((r) => r.ok)
  const failed = results.filter((r) => !r.ok)

  if (success.length > 0 && failed.length === 0) {
    return (
      <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-800">
          {success.length}건 모두 등록 완료 — 잠시 후 목록으로 이동합니다.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
      <p className="text-sm font-semibold text-amber-900">
        결과: 성공 {success.length}건 · 실패 {failed.length}건
      </p>
      {failed.length > 0 && (
        <ul className="text-xs text-amber-900 space-y-0.5 max-h-32 overflow-y-auto">
          {failed.map((r, i) => (
            <li key={i}>• {r.error}</li>
          ))}
        </ul>
      )}
      {success.length > 0 && (
        <p className="text-xs text-amber-800">
          성공한 행은 등록됨. 실패한 행은 빨강으로 표시 — 수정 후 다시 등록해 주세요.
        </p>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import ForwarderExportModal, {
  type ForwarderTemplateLite,
  type OrderBuyerInfo,
} from './ForwarderExportModal'

type Props = {
  orderId: string
  templates: ForwarderTemplateLite[]
  defaultTemplateId?: string | null
  buyerInfo?: OrderBuyerInfo | null
}

export default function ForwarderExportButton({ orderId, templates, defaultTemplateId, buyerInfo }: Props) {
  const [open, setOpen] = useState(false)
  const noTemplates = templates.length === 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={noTemplates}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
        title={noTemplates ? '사용 가능한 양식이 없습니다' : '배대지 양식 xlsx 다운로드'}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        배대지 양식으로 변환
      </button>
      {noTemplates && (
        <p className="text-[10px] text-slate-500 text-center mt-1">사용 가능한 양식 없음</p>
      )}
      {!noTemplates && (
        <p className="text-[10px] text-slate-500 text-center mt-1">
          {templates.length}개 양식 사용 가능
        </p>
      )}
      <ForwarderExportModal
        open={open}
        onClose={() => setOpen(false)}
        orderId={orderId}
        templates={templates}
        defaultTemplateId={defaultTemplateId ?? null}
        buyerInfo={buyerInfo ?? null}
      />
    </>
  )
}

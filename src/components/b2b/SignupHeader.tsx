'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/auth/client'

export function SignupHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => setIsLoggedIn(!!data.session))
      .catch(() => {})
  }, [])

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <Link
        href={isLoggedIn ? '/dashboard' : '/signup'}
        className="inline-flex items-center gap-2"
      >
        <span className="text-lg font-bold text-indigo-600 tracking-tight">짐스캐너</span>
        <span className="text-[10px] font-bold tracking-wider text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5">
          SELLER
        </span>
      </Link>
      {!isLoggedIn && (
        <Link href="/login" className="text-sm text-slate-400 hover:text-slate-900 transition-colors">
          이미 계정이 있으신가요? <span className="text-indigo-600 font-medium">로그인</span>
        </Link>
      )}
    </header>
  )
}

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
  }, [])

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <Link
        href={isLoggedIn ? '/dashboard' : '/signup'}
        className="text-lg font-bold text-indigo-600 tracking-tight"
      >
        짐스캐너 B2B
      </Link>
      {!isLoggedIn && (
        <Link href="/login" className="text-sm text-slate-400 hover:text-slate-900 transition-colors">
          이미 계정이 있으신가요? <span className="text-indigo-600 font-medium">로그인</span>
        </Link>
      )}
    </header>
  )
}

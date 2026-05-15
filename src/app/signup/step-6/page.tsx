'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/auth/client'
import { SignupProgress } from '@/components/b2b/SignupProgress'
import { SignupHeader } from '@/components/b2b/SignupHeader'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

type UploadState = 'idle' | 'selected' | 'uploading' | 'error' | 'complete'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function SignupStep6Page() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/signup/step-1')
        return
      }
      if (!data.user.email_confirmed_at) {
        router.replace('/signup/step-3')
        return
      }
      setAuthLoading(false)
    })
  }, [router])

  // previewUrl 메모리 해제
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const validateAndSetFile = useCallback((file: File) => {
    setValidationError(null)
    setUploadError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setValidationError('JPG, PNG, PDF 파일만 업로드 가능합니다.')
      return
    }
    if (file.size > MAX_SIZE) {
      setValidationError('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
    setUploadState('selected')
  }, [previewUrl])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
    e.target.value = ''
  }, [validateAndSetFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndSetFile(file)
  }, [validateAndSetFile])

  const handleRemoveFile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadState('idle')
    setUploadError(null)
    setValidationError(null)
  }, [previewUrl])

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return
    setUploadError(null)
    setUploadState('uploading')

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const res = await fetch('/api/signup/document-upload', {
        method: 'POST',
        body: formData,
      })
      const body = await res.json().catch(() => ({})) as { ok?: boolean; error?: string }

      if (res.ok && body.ok) {
        setUploadState('complete')
        return
      }

      setUploadError(body.error ?? '업로드에 실패했습니다. 다시 시도해 주세요.')
      setUploadState('selected')
    } catch {
      setUploadError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.')
      setUploadState('selected')
    }
  }, [selectedFile])

  const handleSkip = useCallback(() => {
    setUploadState('complete')
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <SignupHeader />

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <SignupProgress currentStep={5} />

        <div className="w-full max-w-lg">
          {uploadState === 'complete' ? (
            <CompleteCard />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">사업자등록증 업로드</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-300">
                  선택
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-6">
                사업자등록증을 업로드하면 인증 레벨이 L2로 상승하여 Pro 플랜 신청이 가능합니다.
                지금 건너뛰어도 마이페이지에서 나중에 업로드할 수 있습니다.
              </p>

              {/* 업로드 조건 안내 */}
              <div className="rounded-xl border border-slate-300 bg-white p-4 mb-6">
                <p className="text-xs font-medium text-slate-500 mb-2">업로드 조건</p>
                <ul className="space-y-1.5">
                  {[
                    'JPG, PNG, PDF 형식',
                    '파일 크기 최대 5MB',
                    '암호화 저장 — 운영팀 외 열람 불가',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-slate-400">
                      <svg
                        className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 드롭존 */}
              <div
                role="button"
                tabIndex={0}
                aria-label="파일 선택 또는 드래그 앤 드롭"
                onClick={() => uploadState !== 'uploading' && inputRef.current?.click()}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && uploadState !== 'uploading') {
                    inputRef.current?.click()
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={uploadState !== 'uploading' ? handleDrop : undefined}
                className={`relative rounded-xl border-2 border-dashed transition-colors
                  ${uploadState === 'uploading' ? 'cursor-not-allowed' : 'cursor-pointer'}
                  ${isDragging
                    ? 'border-indigo-400 bg-indigo-50'
                    : uploadState === 'selected'
                    ? 'border-indigo-600/60 bg-white'
                    : 'border-slate-300 bg-white hover:border-slate-500 hover:bg-slate-100'
                  }
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                  aria-hidden="true"
                  tabIndex={-1}
                />

                {uploadState === 'idle' && (
                  <div className="flex flex-col items-center justify-center py-12 px-6 gap-3">
                    <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center">
                      <svg
                        className="w-7 h-7 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-800">
                        파일을 드래그하거나 클릭하여 선택
                      </p>
                      <p className="text-xs text-slate-400 mt-1">JPG · PNG · PDF, 최대 5MB</p>
                    </div>
                  </div>
                )}

                {(uploadState === 'selected' || uploadState === 'uploading') && selectedFile && (
                  <div className="p-4 flex items-center gap-4">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt="사업자등록증 미리보기"
                        className="w-16 h-16 rounded-lg object-cover border border-slate-300 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-8 h-8 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatBytes(selectedFile.size)}</p>
                      {uploadState === 'uploading' && (
                        <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full w-2/3 animate-pulse" />
                        </div>
                      )}
                    </div>

                    {uploadState === 'selected' && (
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label="파일 제거"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {validationError && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {validationError}
                </p>
              )}

              {uploadError && (
                <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {uploadError}
                </div>
              )}

              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleUpload}
                  disabled={uploadState !== 'selected' || !selectedFile}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 disabled:opacity-40"
                >
                  {uploadState === 'uploading' ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      업로드 중…
                    </span>
                  ) : (
                    '사업자등록증 업로드하기'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={uploadState === 'uploading'}
                  className="w-full py-2.5 rounded-lg border border-slate-300 text-sm text-slate-400 hover:border-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  나중에 업로드하고 계속하기
                </button>
              </div>

              <p className="mt-5 text-center text-xs text-slate-400">
                업로드된 서류는 Supabase 암호화 스토리지에 저장되며, 담당 운영자만 열람합니다.
              </p>
            </>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200">
        © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
      </footer>
    </div>
  )
}

function CompleteCard() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>

        <div>
          <p className="text-xl font-bold text-indigo-700">가입 신청 완료!</p>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            사업자 계정 신청이 접수되었습니다.<br />
            검토 완료 후 등록한 이메일로 안내 드리겠습니다.
          </p>
        </div>

        <div className="w-full rounded-lg bg-slate-100 border border-slate-300 p-4 text-left space-y-3">
          <p className="text-xs font-medium text-slate-500">다음 단계</p>
          {[
            '운영팀이 사업자 정보를 검토합니다. (영업일 기준 1~2일)',
            '승인 완료 시 이메일로 알림을 발송합니다.',
            '대시보드에 로그인하여 서비스를 시작하세요.',
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs text-indigo-600 font-bold">
                {i + 1}
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="/login"
        className="block w-full text-center py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        로그인 페이지로 이동
      </Link>
    </div>
  )
}

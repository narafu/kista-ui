'use client'

import { useRouter } from 'next/navigation'
import { AssetForm } from './AssetForm'
import type { AssetFormMode } from './AssetForm'
import type { AssetSnapshot } from '@entities/finance'

interface Props {
  mode: AssetFormMode
  initial?: AssetSnapshot
  // 'push': 일반 페이지 라우트 — 목록으로 이동. 'back': 인터셉팅 라우트(모달) — 이전 화면으로 복귀
  dismiss?: 'push' | 'back'
}

export function AssetFormPage({ mode, initial, dismiss = 'push' }: Props) {
  const router = useRouter()
  const handleDone = dismiss === 'back' ? () => router.back() : () => router.push('/finance')

  return (
    <AssetForm mode={mode} initial={initial} onSuccess={handleDone} onCancel={handleDone} />
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { AssetForm } from './AssetForm'
import type { AssetFormMode } from './AssetForm'
import type { AssetSnapshot } from '@entities/finance'

interface Props {
  mode: AssetFormMode
  initial?: AssetSnapshot
}

export function AssetFormPage({ mode, initial }: Props) {
  const router = useRouter()
  const handleDone = () => router.push('/finance')

  return (
    <AssetForm mode={mode} initial={initial} onSuccess={handleDone} onCancel={handleDone} />
  )
}

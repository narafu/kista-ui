import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { AssetFormPage, loadAssetById } from '@features/asset/save-asset'
import { getAuthToken } from '@shared/lib/auth/token'

interface Props {
  searchParams: Promise<{ duplicateFrom?: string }>
}

export const metadata: Metadata = {
  title: '자산 등록 | KISTA',
  description: '자산·부채 기록을 등록합니다',
}

export default async function NewAssetPage({ searchParams }: Props) {
  const [{ duplicateFrom }, token] = await Promise.all([searchParams, getAuthToken()])

  if (!token) {
    return notFound()
  }

  // 복제 대상 조회 실패는 등록 자체를 막지 않는다 — 빈 등록 폼으로 그레이스풀 폴백한다
  const initial = duplicateFrom ? await loadAssetById(duplicateFrom, token).catch(() => null) : null

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader eyebrow="자산 관리" eyebrowHref="/assets" title={initial ? '자산 기록 복제' : '자산 등록'} />
      <AssetFormPage mode={initial ? 'duplicate' : 'create'} initial={initial ?? undefined} />
    </div>
  )
}

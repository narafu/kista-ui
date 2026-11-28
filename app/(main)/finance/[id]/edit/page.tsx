import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { AssetFormPage, loadAssetSnapshotById } from '@features/asset/save-asset'
import { getAuthToken } from '@shared/lib/auth/token'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ month?: string }>
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export const metadata: Metadata = {
  title: '자산 기록 수정',
  description: '자산·부채 기록을 수정합니다',
}

export default async function EditAssetPage({ params, searchParams }: Props) {
  const [{ id }, { month }, token] = await Promise.all([params, searchParams, getAuthToken()])

  if (!token) {
    return notFound()
  }

  // month가 형식에 안 맞으면 서버 400이 에러 바운더리로 가기 전에 not-found로 돌린다
  if (!month || !MONTH_PATTERN.test(month)) {
    return notFound()
  }

  const asset = await loadAssetSnapshotById(id, month, token).catch(() => null)
  if (!asset) {
    return notFound()
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader eyebrow="자산" eyebrowHref="/finance" title="자산 기록 수정" description="기준일·카테고리·금액 등 자산 기록 입력" />
      <AssetFormPage mode="edit" initial={asset} />
    </div>
  )
}

import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { AssetFormPage, loadAssetSnapshotById } from '@features/asset/save-asset'
import { RouteModal } from '@shared/ui/RouteModal'
import { getAuthToken } from '@shared/lib/auth/token'

interface Props {
  searchParams: Promise<{ duplicateFrom?: string }>
}

export default async function NewAssetModal({ searchParams }: Props) {
  const [{ duplicateFrom }, token] = await Promise.all([searchParams, getAuthToken()])

  if (!token) {
    return notFound()
  }

  // 복제 대상 조회 실패는 등록 자체를 막지 않는다 — 빈 등록 폼으로 그레이스풀 폴백한다
  const initial = duplicateFrom ? await loadAssetSnapshotById(duplicateFrom, token).catch(() => null) : null

  return (
    <RouteModal>
      <PageHeader eyebrow="자산 관리" eyebrowHref="/assets" title={initial ? '자산 기록 복제' : '자산 등록'} />
      <AssetFormPage mode={initial ? 'duplicate' : 'create'} initial={initial ?? undefined} dismiss="back" />
    </RouteModal>
  )
}

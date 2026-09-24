import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { AssetFormPage, loadAssetSnapshotById } from '@features/asset/save-asset'
import { getAuthToken } from '@shared/lib/auth/token'
import { getActiveGroupId } from '@shared/lib/auth/activeGroup'
import type { DismissMode } from '@shared/lib/dismiss'

interface Props {
  searchParams: Promise<{ duplicateFrom?: string }>
  // 'push'(기본): 일반 페이지 라우트. 'back': 인터셉팅 라우트(@modal) — 이 페이지와 @modal 버전이
  // 로더·PageHeader·폼 조립을 공유하고 래퍼(div vs RouteModal)와 이 값만 다르게 호출한다.
  dismiss?: DismissMode
}

export async function NewAssetFormBody({ searchParams, dismiss }: Props) {
  const [{ duplicateFrom }, token, groupId] = await Promise.all([searchParams, getAuthToken(), getActiveGroupId()])

  if (!token) {
    return notFound()
  }

  // 복제 대상 조회 실패는 등록 자체를 막지 않는다 — 빈 등록 폼으로 그레이스풀 폴백한다
  const initial = duplicateFrom ? await loadAssetSnapshotById(duplicateFrom, groupId, token).catch(() => null) : null

  return (
    <>
      <PageHeader eyebrow="자산 관리" eyebrowHref="/finance" title={initial ? '자산 기록 복제' : '자산 등록'} />
      <AssetFormPage mode={initial ? 'duplicate' : 'create'} initial={initial ?? undefined} dismiss={dismiss} />
    </>
  )
}

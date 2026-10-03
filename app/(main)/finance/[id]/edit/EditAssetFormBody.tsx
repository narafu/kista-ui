import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { AssetFormPage, loadAssetSnapshotById } from '@features/asset/save-asset'
import { getAuthToken } from '@shared/lib/auth/token'
import type { DismissMode } from '@shared/lib/dismiss'

interface Props {
  params: Promise<{ id: string }>
  // 'push'(기본): 일반 페이지 라우트. 'back': 인터셉팅 라우트(@modal) — NewAssetFormBody와 동일한 이유로 분리.
  dismiss?: DismissMode
}

export async function EditAssetFormBody({ params, dismiss }: Props) {
  const [{ id }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const asset = await loadAssetSnapshotById(id, token)
  if (!asset) {
    return notFound()
  }

  return (
    <>
      <PageHeader eyebrow="자산 관리" eyebrowHref="/finance" title="자산 수정" description="기준일·카테고리·금액 등 자산 기록 입력" />
      <AssetFormPage mode="edit" initial={asset} dismiss={dismiss} />
    </>
  )
}

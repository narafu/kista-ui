import type { Metadata } from 'next'
import { EditAssetFormBody } from './EditAssetFormBody'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: '자산 수정 | KISTA',
  description: '자산·부채 기록을 수정합니다',
}

export default function EditAssetPage({ params }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <EditAssetFormBody params={params} />
    </div>
  )
}

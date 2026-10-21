import type { Metadata } from 'next'
import { NewAssetFormBody } from './NewAssetFormBody'

interface Props {
  searchParams: Promise<{ duplicateFrom?: string }>
}

export const metadata: Metadata = {
  title: '자산 기록 등록',
  description: '자산·부채 기록을 등록합니다',
}

export default function NewAssetPage({ searchParams }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <NewAssetFormBody searchParams={searchParams} />
    </div>
  )
}

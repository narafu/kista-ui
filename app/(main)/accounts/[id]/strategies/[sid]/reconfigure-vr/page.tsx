import type { Metadata } from 'next'
import { ReconfigureVrFormBody } from './ReconfigureVrFormBody'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export const metadata: Metadata = {
  title: 'VR 재설정 | KISTA',
  description: 'VR 전략의 밴드 폭·주기·램프 파라미터를 재설정하고 자본을 주입합니다',
}

export default function ReconfigureVrPage({ params }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <ReconfigureVrFormBody params={params} />
    </div>
  )
}

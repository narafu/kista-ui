import type { Metadata } from 'next'
import { TITLE_TEMPLATE } from '@shared/lib/metadata'

export const metadata: Metadata = {
  title: { default: '신청 반려', template: TITLE_TEMPLATE },
  description: '가입 신청이 반려되었습니다',
}

export default function RejectedLayout({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>
}

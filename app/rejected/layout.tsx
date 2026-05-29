import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '신청 반려 | KISTA',
  description: '가입 신청이 반려되었습니다',
}

export default function RejectedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

import { redirect } from 'next/navigation'

// "/"는 항상 대시보드로 리다이렉트 — 대시보드는 비회원도 접근 가능 (감사 A-01·S-01 이후 정책 변경)
export default function RootPage() {
  redirect('/dashboard')
}

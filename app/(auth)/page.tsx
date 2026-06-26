import { redirect } from 'next/navigation'

// "/"는 대시보드로 리다이렉트 (proxy.ts가 먼저 처리하지만 폴백으로 유지)
export default function RootPage() {
  redirect('/dashboard')
}

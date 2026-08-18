import { ACTIVE_GROUP_COOKIE } from './cookies'

// 서버 컴포넌트 전용 (next/headers) — getAuthToken()과 동일 패턴.
// 미존재 = 개인 그룹(암묵). ActiveGroupProvider가 클라이언트에서 이 값을 initialGroupId로 이어받는다.
export async function getActiveGroupId(): Promise<string | undefined> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return cookieStore.get(ACTIVE_GROUP_COOKIE)?.value
}

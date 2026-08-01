// kista-api base URL 결정 SSOT. API_BASE_URL(서버 내부용)이 NEXT_PUBLIC_API_BASE_URL(빌드 타임 인라인)보다 우선한다.
// Docker에서는 NEXT_PUBLIC_*만 있으면 ECONNREFUSED가 날 수 있어 API_BASE_URL을 서버 런타임 전용으로 별도 둔다.
export function getApiBaseUrl(): string {
  const url = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL
  if (!url) throw new Error('API_BASE_URL is not configured')
  return url
}

// proxy.ts처럼 미설정 시 throw 대신 null로 처리해 호출부가 실패를 허용하는 경로용
export function getApiBaseUrlOrNull(): string | null {
  return process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || null
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string
  ) {
    super(message ?? `API error ${status}`)
    this.name = 'ApiError'
  }
}

// 동시 다발 401 시 RT를 한 번만 사용하도록 in-flight refresh 단일화
let refreshInFlight: Promise<boolean> | null = null

function tryRefreshToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/auth/refresh', { method: 'POST' })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

async function doLogout(): Promise<never> {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  window.location.href = '/'
  await new Promise(() => {}) // 리다이렉트 완료 전까지 중단
  throw new Error('unreachable')
}

// Client Component 전용 — Route Handler 경유 fetch.
// 401 수신 시 RT로 AT 갱신 후 재시도. 갱신 실패 시 로그아웃.
export async function clientFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options)
  if (res.status === 401) {
    const refreshed = await tryRefreshToken()
    if (!refreshed) return doLogout()
    // 갱신 성공 → 브라우저 쿠키가 이미 교체됐으므로 원래 요청 재시도
    const retry = await fetch(path, options)
    if (retry.status === 401) return doLogout()
    if (!retry.ok) {
      let body: unknown = null
      try { body = await retry.json() } catch {}
      throw new ApiError(retry.status, body)
    }
    if (retry.status === 204 || retry.headers.get('content-length') === '0') return undefined as T
    return retry.json()
  }
  if (!res.ok) {
    let body: unknown = null
    try { body = await res.json() } catch {}
    throw new ApiError(res.status, body)
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T
  return res.json()
}

// Server Component(token 있음)와 Client Component(token 없음)를 한 번에 처리.
export function fetchEither<T>(path: string, options: RequestInit | undefined, token?: string): Promise<T> {
  return token ? apiFetch<T>(path, options ?? {}, token) : clientFetch<T>(path, options)
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken: string
): Promise<T> {
  const baseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured')
  }
  const url = `${baseUrl}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    let body: unknown
    try { body = await response.json() } catch { body = null }
    throw new ApiError(response.status, body)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  return response.json() as Promise<T>
}

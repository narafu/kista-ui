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

async function doLogout(reason?: string): Promise<never> {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  window.location.href = reason ? `/dashboard?error=${reason}` : '/dashboard'
  await new Promise(() => {}) // 리다이렉트 완료 전까지 중단
  throw new Error('unreachable')
}

// 401 body에서 error 코드 추출 (body 소비)
async function readErrorCode(res: Response): Promise<string | null> {
  try {
    const body = await res.json() as { error?: string }
    return body.error ?? null
  } catch {
    return null
  }
}

// Client Component 전용 — Route Handler 경유 fetch.
// 401 수신 시 RT로 AT 갱신 후 재시도. 갱신 실패 시 로그아웃.
export async function clientFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options)
  if (res.status === 401) {
    // body 먼저 읽어서 이유 캡처 — tryRefreshToken 이후엔 body 접근 불가
    const errorCode = await readErrorCode(res)
    const refreshed = await tryRefreshToken()
    if (!refreshed) return doLogout(errorCode === 'TOKEN_BLACKLISTED' ? 'token_blacklisted' : undefined)
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

export function jsonBody(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
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

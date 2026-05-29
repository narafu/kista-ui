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

// Client Component 전용 — Route Handler 경유 fetch.
// 401 수신 시 자동 로그아웃 후 로그인 페이지로 이동.
export async function clientFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options)
  if (res.status === 401) {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    window.location.href = '/'
    await new Promise(() => {}) // 리다이렉트 완료 전까지 중단
  }
  if (!res.ok) throw new ApiError(res.status, null)
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T
  return res.json()
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

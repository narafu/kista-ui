// JWT 서명 끝 20자를 세션 식별자로 사용 — 사용자마다 고유하고 서버에서만 접근
const suffix = (token: string) => token.slice(-20)

export const cacheTags = {
  accounts: (token: string) => `accounts:${suffix(token)}`,
  strategies: (token: string) => `strategies:${suffix(token)}`,
  user: (token: string) => `user:${suffix(token)}`,
}

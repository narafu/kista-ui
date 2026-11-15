// null nickname(카카오 닉네임 미동의)일 때 사용자를 구분할 수 있게 ID 앞 8자로 대신한다.
export function userLabel(nickname: string | null | undefined, userId: string): string {
  return nickname ?? `ID ${userId.slice(0, 8)}`
}

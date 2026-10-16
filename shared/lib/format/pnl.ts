/** 손익(profit/loss) 부호에 따른 텍스트 색 클래스를 반환한다. 0은 오르지도 내리지도 않았으므로 중립색이다. */
export function pnlTextClass(n: number): string {
  if (n > 0) return 'text-pos'
  if (n < 0) return 'text-neg'
  return 'text-muted-foreground'
}

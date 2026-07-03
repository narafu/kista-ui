/** 손익(profit/loss) 부호에 따른 텍스트 색 클래스를 반환한다. */
export function pnlTextClass(n: number): string {
  return n >= 0 ? 'text-pos' : 'text-neg'
}

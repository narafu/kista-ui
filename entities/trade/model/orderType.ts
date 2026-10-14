/** 주문 유형 한국어 라벨 — LOC/MOC/LIMIT는 업계 용어라 코드를 유지하고 설명을 덧붙인다 */
export const ORDER_TYPE_LABEL: Record<string, string> = {
  LOC: 'LOC(종가지정)',
  MOC: 'MOC(종가시장가)',
  LIMIT: 'LIMIT(지정가)',
}

export function orderTypeLabel(orderType: string): string {
  return ORDER_TYPE_LABEL[orderType] ?? orderType
}

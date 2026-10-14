// recharts 기본 툴팁 박스 스타일 — 카드 토큰을 따라 다크 모드에서도 배경·테두리·글자가 맞는다.
// 항목 글자색·계열 색 점은 app/globals.css의 .recharts-tooltip-item 규칙이 처리한다.
export const TOOLTIP_CONTENT_STYLE = {
  fontSize: 12,
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
  borderRadius: 6,
}

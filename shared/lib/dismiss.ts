// 폼 라우트의 종료 방식 — 'push': 일반 페이지 라우트(목록/상세로 이동). 'back': 인터셉팅
// 라우트(@modal)에서 이전 화면으로 복귀. 폼 페이지·인터셉팅 라우트 body가 공유하는 단일 타입.
export type DismissMode = 'push' | 'back'

// 로즈골드 브랜드 그라데이션 CTA 버튼 공용 클래스.
// 적용 기준: "화면(탭)당 유일한 최상위 등록/실행 진입점"에만 쓴다 — 자산/거래/계좌/전략 등록, 바로 주문처럼
// 그 화면의 핵심 리소스를 만들거나 즉시 실행하는 단 하나의 버튼. 설정 화면 안 CRUD 관리 리스트의
// "항목 추가"류(카테고리 추가, 재무계좌 추가, 초대코드 발급, 예산등록, 모두등록 등)는 한 화면에 여러 개가
// 동시에 존재할 수 있어 전부 gradient로 하면 CTA 위계가 무너진다 — 이런 버튼은 아래 BRAND_TINT_BUTTON_CLASS로
// 통일한다.
// 크기·패딩은 각 버튼이 배치되는 맥락에 따라 다르므로 색상·상태 스타일만 여기서 공용화한다.
export const BRAND_GRADIENT_BUTTON_CLASS = 'bg-gradient-to-br from-rose-500 to-rose-700 text-white font-semibold shadow-[0_1px_4px_rgba(225,29,72,0.30)] hover:opacity-90 transition-opacity disabled:opacity-50'

// 로즈 틴트 아웃라인 — 설정 화면 CRUD 관리 리스트의 "항목 추가"류 버튼 전용(2단계 CTA).
// gradient(1단계)보다 강조를 낮추면서도 중립 shadcn 기본 버튼보다는 브랜드와 연결된 느낌을 준다.
// `cn(buttonVariants({ size: 'sm' }), BRAND_TINT_BUTTON_CLASS)`로 적용 — Button/Link/DialogTrigger 등
// 어떤 엘리먼트에 붙이든 buttonVariants가 높이·패딩·radius·포커스링을 통일해준다.
// --rose-50/100/200/300, --brand-fg-soft 전부 다크모드 오버라이드가 이미 정의돼 있다(globals.css).
export const BRAND_TINT_BUTTON_CLASS = 'border-[var(--rose-200)] bg-[var(--rose-50)] text-[var(--brand-fg-soft)] font-semibold transition-colors hover:bg-[var(--rose-100)] hover:border-[var(--rose-300)]'

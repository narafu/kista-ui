// 로즈골드 브랜드 그라데이션 CTA 버튼 공용 클래스.
// 적용 기준: "화면(탭)당 유일한 최상위 등록/실행 진입점"에만 쓴다 — 자산/거래/계좌/전략 등록, 바로 주문처럼
// 그 화면의 핵심 리소스를 만들거나 즉시 실행하는 단 하나의 버튼. 설정 화면 안 CRUD 관리 리스트의
// "항목 추가"류(카테고리 추가, 재무계좌 추가, 초대코드 발급, 예산등록, 모두등록 등)는 한 화면에 여러 개가
// 동시에 존재할 수 있어 전부 gradient로 하면 CTA 위계가 무너진다 — 이런 버튼은 plain(shadcn Button 기본
// variant)으로 통일한다. 예외(예: BudgetManagerDialog가 outline을 쓰는 이유)는 해당 파일에 근거를 주석으로 남긴다.
// 크기·패딩은 각 버튼이 배치되는 맥락에 따라 다르므로 색상·상태 스타일만 여기서 공용화한다.
export const BRAND_GRADIENT_BUTTON_CLASS = 'bg-gradient-to-br from-rose-500 to-rose-700 text-white font-semibold shadow-[0_1px_4px_rgba(225,29,72,0.30)] hover:opacity-90 transition-opacity disabled:opacity-50'

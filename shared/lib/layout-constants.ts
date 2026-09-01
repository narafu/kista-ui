// widgets/layout/MobileBottomNav 실제 렌더 높이(61px, py-2.5+icon 20+gap-1 4+text-xs 16+border-t 1)
// + 기기 하단 안전 영역(env(safe-area-inset-bottom)). 모바일 화면에서 탭바 위에 별도 고정 액션 바
// (등록/저장 버튼 등, p-4 상하 32px + h-14 버튼 56px = 88px)를 띄우는 곳(features/asset/save-asset/AssetForm,
// features/account/edit-account/EditAccountForm, widgets/finance-bulk-register/BulkRegisterForm)이
// 전부 이 두 값을 공유한다 — 각자 다른 값(예: 56px Tailwind bottom-14)을 추정해 쓰면 탭바 실제
// 높이·기기 안전 영역과 어긋나 겹침이 생긴다. MobileBottomNav의 구조가 바뀌면(패딩/폰트 크기 등)
// 이 값도 함께 맞춘다.
//
// Tailwind JIT는 클래스명을 소스 코드의 정적 문자열로만 인식하므로 두 값 모두 템플릿 조합이 아닌
// 완성된 리터럴로 export한다.

// 고정 액션 바 자체를 탭바 위에 띄우는 위치
export const MOBILE_BOTTOM_NAV_OFFSET_CLASS = 'bottom-[calc(61px+env(safe-area-inset-bottom))]'
// 고정 액션 바(88px)에 콘텐츠가 가려지지 않도록 확보하는 하단 여백 (여유분 16px 포함)
export const MOBILE_FIXED_BAR_RESERVE_CLASS = 'pb-[calc(61px+env(safe-area-inset-bottom)+88px+16px)]'

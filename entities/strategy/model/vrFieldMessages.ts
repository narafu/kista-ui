// VR 입력 검증 문구 — 등록·재설정 스키마가 같은 칸·같은 제약에 같은 문장을 쓴다(제약이 다른 문구는 각 스키마에 둔다)
// 칸 아래에 그대로 보이는 문구 — zod 기본 영문이 새지 않게 모든 검사에 붙인다. 비율은 화면 단위(%)로 적는다
export const VR_POSITIVE = '0보다 크게 입력하세요.'
export const VR_NONNEGATIVE = '0 이상으로 입력하세요.'
export const VR_INTEGER = '올바른 정수를 입력하세요.'
export const VR_INITIAL_RATE = '0 초과 100 이하로 입력하세요.'
export const VR_FLOOR_RATE = '0~100 사이로 입력하세요.'
export const VR_G_MAX_BELOW_INITIAL = 'gradient 상한은 초기값 이상이어야 합니다.'

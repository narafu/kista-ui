// API 스펙에서 파생된 enum 타입 — 직접 정의 금지, openapi.json이 SSOT
// 갱신: npm run gen:types (openapi.json 교체 후 실행)
import type { components } from './api-types'

// kista-api ProblemDetail 확장 프로퍼티 code
export type ErrorCode = components['schemas']['ErrorCode']

export type BrokerCode = NonNullable<components['schemas']['AccountRequest']['broker']>

// 메타 brokers[].apiKeyExpirySource — 스펙이 string이라 수기 정의한다(kista-api ApiKeyExpirySource enum과 맞춘다)
export type ApiKeyExpirySource = 'ESTIMATED' | 'NONE'

export type UserStatus = NonNullable<components['schemas']['UserResponse']['status']>
export type UserRole = NonNullable<components['schemas']['UserResponse']['role']>
export type NotificationChannel = NonNullable<components['schemas']['UserResponse']['notificationChannel']>

export type CycleSeedType = NonNullable<components['schemas']['TradingCycleRequest']['cycleSeedType']>
export type StrategyType = NonNullable<components['schemas']['TradingCycleRequest']['type']>
// 전략 행위 enum(allowedActions·blockedActions[].action) — 사유 코드는 서버 메타(strategyActionBlockReasons)가 라벨 SSOT라 string으로 둔다
export type StrategyAction = components['schemas']['BlockedAction']['action']

// 주문 상태는 order 도메인 DTO(TodayOrderItem.status)에 enum 제약이 남아 있어 그쪽에서 파생한다.
export type OrderStatus = NonNullable<components['schemas']['TodayOrderItem']['status']>
// 매수/매도 방향은 일별 체결 응답(ItemDto.direction)의 enum 제약에서 파생한다.
export type OrderDirection = NonNullable<components['schemas']['ItemDto']['direction']>
// 주문 유형은 서버가 order 도메인 응답 DTO에서 enum을 걷어내고 자유 문자열로 직렬화하도록 바뀌었다
// (TodayOrderItem/OrderItem/AdminTradeResponse 모두 String). 스펙에 남은 유일한 enum 앵커는 fida 도메인
// (FidaPlannedOrder.orderType)뿐이라 도메인 결합을 피해 여기서 수기로 정의한다 — 값 집합은 kista-api
// shared.kernel.OrderType과 같게 유지한다(LIMIT_VWAP: PRIVACY 장마감 30분 전 지정가 VWAP, 메리츠·MOCK 전용).
export type OrderType = 'LOC' | 'MOC' | 'LIMIT' | 'MOO' | 'LIMIT_VWAP'

// TodayOrderItem/ItemDto가 order 도메인 DTO라 서버가 Order 스키마에 한 것처럼 enum을 걷어내면
// 위 파생 타입이 소리 없이 string으로 붕괴한다(스키마 제거·개명은 gen:types에서 시끄럽게 깨지지만
// enum만 사라지는 회귀는 조용하다). 값 집합이 바뀌면 typecheck가 깨지도록 컴파일 타임에 고정한다.
type ExactUnion<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never
const _orderEnumPin: [
  ExactUnion<OrderDirection, 'BUY' | 'SELL'>,
  ExactUnion<OrderStatus, 'PLANNED' | 'SUBMITTING' | 'PLACED' | 'FILLED' | 'PARTIALLY_FILLED' | 'FAILED' | 'CANCELLED'>,
] = [true, true]
void _orderEnumPin

export type SkipReason = NonNullable<components['schemas']['NextOrdersResponse']['skipReason']>

// recurringMode는 TradingCycleRequest에는 없다(VR은 recurringAmount의 부호로 방향 전달) —
// 같은 값의 enum 제약은 admin-settings 필드 설정 스키마(FieldRequestRecurringMode)에 있어 그쪽에서 파생한다.
export type RecurringMode = NonNullable<components['schemas']['FieldRequestRecurringMode']['defaultValue']>

export type AssetClass = NonNullable<components['schemas']['AssetSnapshotRequest']['assetClass']>
export type Market = NonNullable<components['schemas']['AssetSnapshotRequest']['market']>
export type FinanceCategoryType = NonNullable<components['schemas']['FinanceCategoryRequest']['type']>
export type FinanceAccountType = NonNullable<components['schemas']['FinanceAccountRequest']['accountType']>

// 모의계좌 — 실제 증권사 연동 없이 DB 기반으로 매매를 시뮬레이션. 계좌 등록·전략 폼·통계 화면 전반의 분기 기준
export function isMockBroker(broker: string | null | undefined): boolean {
  return broker === 'MOCK'
}

export type Currency = 'USD' | 'KRW'

// 앱키 하나에 계좌 하나가 묶여 계좌번호를 받지 않는 broker(메리츠). 계좌 등록 흐름에서 계좌번호 입력을 건너뛰는 기준
export function isKeyOnlyBroker(broker: string | null | undefined): boolean {
  return broker === 'MERITZ'
}

// 계좌 통화 표시 단위 — 서버 Currency 자릿수와 같다(KRW 원 단위, USD 센트)
export const CURRENCY_SCALE: Record<Currency, number> = { KRW: 0, USD: 2 }

// 서버가 통화를 문자열로 내려 모르는 값이 올 수 있다 — Currency로 좁히고 아니면 undefined
export function toCurrency(v: string | null | undefined): Currency | undefined {
  return v === 'USD' || v === 'KRW' ? v : undefined
}

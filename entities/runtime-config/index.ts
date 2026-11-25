// 앱 소비처는 meta로 옮겼다(S7) — T10에서 이 슬라이스·/api/runtime-config 라우트와 함께 삭제할 때까지 유지
/** @public */
export { runtimeConfigKeys, useRuntimeConfigQuery } from './hooks/useRuntimeConfigQuery'
export type {
  RuntimeConfig,
  RuntimeFieldSettings,
  RuntimeBenchmarkFieldSettings,
  RuntimeStrategyType,
  RecurringMode,
} from './model/types'
export { DEFAULT_RUNTIME_BENCHMARKS } from './model/types'

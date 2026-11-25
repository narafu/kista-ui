// 앱 소비처는 meta로 옮겼다(S7·T10) — 남은 소비처는 관리자 설정 편집 타입. 쿼리·/api/runtime-config 라우트는 삭제 대상
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

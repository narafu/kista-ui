'use client'

import { DEFAULT_STRATEGY_SUGGESTIONS, useMeQuery, useUpdateStrategySuggestionsMutation } from '@entities/user'
import { SuggestionListEditor } from '@shared/ui/SuggestionListEditor'
import { Surface } from '@shared/ui/Surface'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { SectionError } from '@shared/ui/SectionError'

// 구 admin/settings 폼의 "자산 등록 폼 추천 목록" 섹션 — 2026-08 admin 전역 설정에서 유저별
// 설정(user_settings.strategy_suggestions)으로 이관됨에 따라 ADMIN 게이트 없이 모든 로그인
// 유저에게 노출한다. /finance 설정 탭(계좌관리 아래) 위치는 유지 — 자산 등록 폼 전용 값이라
// 일반 계정 설정(/settings)보다 finance 도메인에 두는 게 더 자연스럽다.
export function StrategySuggestionManager() {
  const { data: user, isError } = useMeQuery()
  const mutation = useUpdateStrategySuggestionsMutation()

  const strategySuggestions = user?.strategySuggestions ?? DEFAULT_STRATEGY_SUGGESTIONS

  function handleChange(next: string[]) {
    mutation.mutate(next)
  }

  return (
    <Surface as="section" className="p-6">
      <h2 className="text-sm font-bold mb-0.5">운용전략 관리</h2>
      <div className="text-sm text-muted-foreground mb-[18px]">자산 등록 폼의 운용전략 추천 목록을 관리합니다.</div>
      {/* 유저 정보를 못 받은 동안 섹션을 통째로 숨기면 설정 위치를 잃는다 — 제목은 두고 상태를 알린다 */}
      {user ? (
        <SuggestionListEditor
          id="asset-strategy"
          label="운용전략"
          values={strategySuggestions}
          onChange={handleChange}
          disabled={mutation.isPending}
        />
      ) : isError ? (
        <SectionError message="운용전략 목록을 불러오지 못했습니다." />
      ) : (
        <LoadingRow />
      )}
    </Surface>
  )
}

'use client'

import { useMeQuery } from '@entities/user'
import { useAdminSettingsQuery, useUpdateAdminSettingsMutation } from '@entities/admin-settings'
import { DEFAULT_ASSET_FORM_OPTIONS, type RuntimeConfig } from '@entities/runtime-config'
import { SuggestionListEditor } from '@shared/ui/SuggestionListEditor'
import { Surface } from '@shared/ui/Surface'
import { toast } from 'sonner'

// 구 admin/settings 폼의 "자산 등록 폼 추천 목록" 섹션을 여기로 이관 — 계좌관리 아래 배치.
// 그룹 무관 전역 목록(runtime config)이라 계좌·카테고리처럼 그룹 스코프 CRUD가 아니다.
// ADMIN이 아니면 렌더하지 않는다 — 이 위젯은 일반 사용자도 방문하는 /finance 설정 탭에 있다.
export function StrategySuggestionManager() {
  const { data: user } = useMeQuery()
  // ADMIN이 확정되기 전에는 요청 자체를 보내지 않는다 — 일반 사용자 세션마다 admin 전용
  // 엔드포인트에 어차피 버려질 조회가 나가는 걸 막는다.
  const { data: settings } = useAdminSettingsQuery({ enabled: user?.role === 'ADMIN' })
  const mutation = useUpdateAdminSettingsMutation({
    onSuccess: () => { toast.success('운용전략 추천 목록을 저장했습니다') },
  })

  if (user?.role !== 'ADMIN' || !settings) return null

  // entities/admin-settings의 AdminSettings 타입에 assetFormOptions가 누락돼 있어(구조적으로
  // optional이라 컴파일은 통과) AdminSettingsForm과 동일하게 RuntimeConfig로 취급한다.
  const config = settings as RuntimeConfig
  const strategySuggestions = config.assetFormOptions?.strategySuggestions ?? DEFAULT_ASSET_FORM_OPTIONS.strategySuggestions

  function handleChange(next: string[]) {
    // PUT은 전체 설정을 교체한다(부분 갱신 미지원) — 나머지 필드는 조회된 값 그대로 왕복시킨다.
    // 변수에 담지 않고 객체 리터럴을 바로 mutate에 넘기면 TS excess-property-check가 assetFormOptions를
    // 모르는 AdminSettings 타입 기준으로 거부한다 — RuntimeConfig 변수에 먼저 담아 그 체크를 우회한다.
    const payload: RuntimeConfig = { ...config, assetFormOptions: { ...config.assetFormOptions, strategySuggestions: next } }
    mutation.mutate(payload)
  }

  return (
    <Surface as="section" className="p-6">
      <div className="text-sm font-bold mb-0.5">운영전략 관리</div>
      <div className="text-sm text-muted-foreground mb-[18px]">
        자산 등록 폼의 운용전략은 자유 입력을 유지합니다 — 아래 목록은 입력을 돕는 추천값일 뿐 값 자체를 제한하지 않습니다.
      </div>
      <SuggestionListEditor id="asset-strategy" label="운용전략" values={strategySuggestions} onChange={handleChange} />
    </Surface>
  )
}

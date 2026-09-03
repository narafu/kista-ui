import { toast } from 'sonner'

// 한글 받침 유무에 따라 은/는 조사를 고른다(완성형 한글 유니코드 오프셋 % 28 === 0이면 받침 없음).
function topicParticle(label: string): '은' | '는' {
  const code = label.charCodeAt(label.length - 1) - 0xac00
  return code >= 0 && code <= 11171 && code % 28 === 0 ? '는' : '은'
}

// create 계열 뮤테이션(자산/거래/예산)이 shareToGroup:true로 제출했는데 공유 전환이 실패하면
// 항목 자체는 개인 소유로 저장된 채다 — AssetForm/TransactionFormDialog/BudgetFormDialog가
// 동일하게 판정하던 "저장 성공 + 공유 실패" 경고/성공 toast 분기를 통합한다.
export function notifyShareCreateResult(
  saved: { groupId?: string },
  variables: { shareToGroup?: boolean },
  entityLabel: string,
  successMessage: string,
) {
  if (variables.shareToGroup && !saved.groupId) {
    toast.warning(`${entityLabel}${topicParticle(entityLabel)} 저장됐지만 그룹 공유에 실패했습니다 — 목록에서 공유 버튼으로 다시 시도하세요`)
  } else {
    toast.success(successMessage)
  }
}

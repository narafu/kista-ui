'use client'

import { useMemo, useState } from 'react'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@shared/ui/FormDialog'
import { FormActions } from '@shared/ui/FormActions'
import { FormField } from '@shared/ui/form/FormField'
import { useAppForm } from '@shared/ui/form/useAppForm'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import {
  getCascadeLevels,
  useCanShareToGroup,
  useCreateFinanceCategoryMutation,
  useCreateSystemFinanceCategoryMutation,
  useUpdateFinanceCategoryMutation,
  useUpdateSystemFinanceCategoryMutation,
} from '@entities/finance'
import type { FinanceCategory, FinanceCategoryType } from '@entities/finance'
import { ParentCategoryField } from './CategoryParentField'
import { NO_PARENT_VALUE, buildCategoryPayload, initialCategoryName, initialSortOrder, isPersonalParent } from './categoryFormHelpers'

const schema = z.object({
  name: z.string().trim().min(1, '이름을 입력하세요.'),
  sortOrder: z.string(),
  shareToGroup: z.boolean(),
})

interface Props {
  open: boolean
  onClose: () => void
  type: FinanceCategoryType
  /** 부모 선택지 — 생성 모드에서만 사용, 루트 트리(children 포함) 전체를 받아 임의 depth 계단식 선택을 구성한다 */
  l1Categories: FinanceCategory[]
  /** null이면 생성 모드, 값이 있으면 수정 모드(name·sortOrder만 편집 가능) */
  category: FinanceCategory | null
  /** 관리자 전용 시스템 카테고리(`/api/admin/finance/categories`) — 그룹 공유 스위치가 없고 정렬순서 하한이 0이다 */
  system?: boolean
}

// 그룹 스코프 카테고리와 관리자 시스템 카테고리가 겸용하는 추가·수정 대화상자 — 차이는 system 하나뿐이다
export function CategoryFormDialog({ open, onClose, type, l1Categories, category, system = false }: Props) {
  const noun = system ? '가계부 공통 카테고리' : '카테고리'
  const createDescription = system ? '모든 그룹에 공통으로 노출되는 카테고리를 추가합니다.' : '새 카테고리를 추가합니다.'
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={`${noun} ${category ? '수정' : '추가'}`}
      description={category ? '이름과 정렬순서만 수정할 수 있습니다.' : createDescription}
    >
      {(close) => <CategoryForm type={type} l1Categories={l1Categories} category={category} system={system} onDone={close} />}
    </FormDialog>
  )
}

// 훅은 조건부로 부를 수 없어 네 개를 모두 만들고, 스코프·모드로 하나를 고른다
function useCategoryMutation(system: boolean, category: FinanceCategory | null) {
  const groupCreate = useCreateFinanceCategoryMutation()
  const groupUpdate = useUpdateFinanceCategoryMutation(category?.id ?? '')
  const systemCreate = useCreateSystemFinanceCategoryMutation()
  const systemUpdate = useUpdateSystemFinanceCategoryMutation(category?.id ?? '')
  if (system) return category ? systemUpdate : systemCreate
  return category ? groupUpdate : groupCreate
}

function CategoryForm({ type, l1Categories, category, system, onDone }: Omit<Props, 'open' | 'onClose' | 'system'> & { system: boolean; onDone: () => void }) {
  const mode = category ? 'edit' : 'create'
  // 계단식 부모 Select: 각 단에서 선택한 categoryId를 순서대로 담는다. 마지막 값이 실제
  // parentId — 선택한 노드에 children이 있으면 다음 단이 자동으로 추가돼 depth 제한이 없다.
  const [selectedPath, setSelectedPath] = useState<string[]>([])
  const cascadeLevels = useMemo(() => getCascadeLevels(l1Categories, selectedPath), [l1Categories, selectedPath])
  const parentId = selectedPath[selectedPath.length - 1] ?? NO_PARENT_VALUE

  // 그룹 소속일 때만 노출, 기본값 켜짐(그룹 저장 우선) — 수정 모드는 groupId가 이미 고정돼 있어 대상 아님. 시스템 카테고리는 그룹 개념이 없다.
  const canShareToGroup = useCanShareToGroup({ enabled: !system }) && !system
  // 부모가 개인 소유면 그 아래 그룹 공유 카테고리를 만들 수 없다(kista-api 400 — 다른 멤버에게
  // 부모 없는 고아 트리로 보이는 것을 막음). 이 경우 토글을 숨기고 개인 소유로만 생성한다.
  const parentIsPersonal = useMemo(() => isPersonalParent(l1Categories, parentId), [l1Categories, parentId])
  const shareToGroupAllowed = canShareToGroup && !parentIsPersonal

  const form = useAppForm({
    schema,
    defaultValues: { name: initialCategoryName(category), sortOrder: initialSortOrder(category), shareToGroup: true },
    mutation: useCategoryMutation(system, category),
    toPayload: (v) => {
      const payload = buildCategoryPayload(mode, category, parentId, type, v.name, v.sortOrder, system ? 0 : 1)
      return mode === 'create' && !system ? { ...payload, shareToGroup: shareToGroupAllowed && v.shareToGroup } : payload
    },
    successMessage: mode === 'edit' ? '카테고리가 수정되었습니다' : '카테고리가 추가되었습니다',
    onDone,
  })

  return (
    <form onSubmit={form.submit} className="space-y-4">
      {mode === 'create' && (
        <ParentCategoryField id={system ? 'systemCategoryParentId' : undefined} cascadeLevels={cascadeLevels} selectedPath={selectedPath} onPathChange={setSelectedPath} disabled={form.isPending} />
      )}

      <FormField control={form.control} name="name" label="이름" required>
        {(f) => <Input {...f} disabled={form.isPending} maxLength={50} />}
      </FormField>

      <FormField control={form.control} name="sortOrder" label="정렬순서">
        {(f) => <Input {...f} type="number" min={system ? 0 : 1} disabled={form.isPending} />}
      </FormField>

      {mode === 'create' && shareToGroupAllowed && (
        <ShareToGroupSwitch id="categoryShareToGroup" checked={form.watch('shareToGroup')} onCheckedChange={(v) => form.setValue('shareToGroup', v)} disabled={form.isPending} />
      )}
      {mode === 'create' && canShareToGroup && parentIsPersonal && (
        <p className="text-xs text-muted-foreground">개인 카테고리 하위에는 그룹 공유 카테고리를 만들 수 없습니다.</p>
      )}

      <FormActions form={form} onCancel={onDone} label="저장" canSubmit={!!form.watch('name').trim()} className="pt-2" />
    </form>
  )
}

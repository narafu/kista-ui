import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  useCreateAssetSnapshotMutation,
  useCreateFinanceAccountMutation,
  useCreateFinanceBudgetMutation,
  useCreateFinanceTransactionMutation,
  useDeleteFinanceCategoryMutation,
  useUpdateFinanceAccountMutation,
  useDeleteManyAssetSnapshotsMutation,
  useSetMonthlyClosingMutation,
  useUpdateAssetSnapshotMutation,
} from './useFinanceMutations'
import { financeKeys } from '../model/queryKeys'

const {
  useMutationMock,
  useQueryClientMock,
  createAssetSnapshotMock,
  createFinanceAccountMock,
  deleteAssetSnapshotMock,
  setMonthlyClosingMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  useMutationMock: vi.fn((options: unknown) => options),
  useQueryClientMock: vi.fn(),
  createAssetSnapshotMock: vi.fn(),
  createFinanceAccountMock: vi.fn(),
  deleteAssetSnapshotMock: vi.fn(),
  setMonthlyClosingMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}))

vi.mock('sonner', () => ({ toast: { error: toastErrorMock } }))

vi.mock('../api', () => ({
  createAssetSnapshot: createAssetSnapshotMock,
  updateAssetSnapshot: vi.fn(),
  deleteAssetSnapshot: deleteAssetSnapshotMock,
  setMonthlyClosing: setMonthlyClosingMock,
  createFinanceCategory: vi.fn(),
  updateFinanceCategory: vi.fn(),
  deleteFinanceCategory: vi.fn(),
  createFinanceAccount: createFinanceAccountMock,
  updateFinanceAccount: vi.fn(),
  deleteFinanceAccount: vi.fn(),
  removeFinanceGroupMember: vi.fn(),
  createFinanceGroupInvitation: vi.fn(),
  respondToInvitation: vi.fn(),
}))

// useMutation mock이 options를 그대로 반환하므로 훅 결과를 mutation config로 다룬다
type MutationConfig = {
  mutationFn: (variables: unknown) => Promise<unknown>
  onSuccess: (data?: unknown, variables?: unknown) => Promise<void> | void
}

function renderMutation(useMutationHook: () => unknown) {
  return renderHook(useMutationHook).result.current as MutationConfig
}

function fakeQueryClient(existingList?: unknown[]) {
  const setQueryData = vi.fn()
  const fetchQuery = vi.fn()
  const invalidateQueries = vi.fn()
  return {
    getQueryData: vi.fn(() => existingList),
    setQueryData,
    fetchQuery,
    invalidateQueries,
  }
}

describe('useCreateAssetSnapshotMutation', () => {
  it('invalidates the asset snapshot list cache and the server aggregates', async () => {
    const queryClient = fakeQueryClient([{ id: 's1', amount: 1 }])
    useQueryClientMock.mockReturnValue(queryClient)

    const mutation = renderMutation(() => useCreateAssetSnapshotMutation())

    await mutation.onSuccess()

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.assetSnapshotsRoot() })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.aggregatesRoot() })
  })
})

describe('useCreateFinanceAccountMutation', () => {
  it('shareToGroup을 createFinanceAccount로 전달하고 성공 시 accountsRoot를 invalidate한다 (그룹 스코프 upsert 아님)', async () => {
    const queryClient = fakeQueryClient([{ id: 'a1' }])
    useQueryClientMock.mockReturnValue(queryClient)
    createFinanceAccountMock.mockResolvedValueOnce({ id: 'a2', groupId: 'g1' })

    const mutation = renderMutation(() => useCreateFinanceAccountMutation())

    await mutation.mutationFn({ shareToGroup: true, nickname: '주거래', broker: 'BANK', accountNo: '12345678' })
    expect(createFinanceAccountMock).toHaveBeenCalledWith(
      { nickname: '주거래', broker: 'BANK', accountNo: '12345678' },
      { shareToGroup: true },
    )

    await mutation.onSuccess()
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.accountsRoot() })
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({ queryKey: financeKeys.aggregatesRoot() })
    expect(queryClient.setQueryData).not.toHaveBeenCalled()
  })
})

describe('useCreateFinanceBudgetMutation', () => {
  it('예산 변경은 예산 목록과 함께 서버 집계(예산 대비)를 무효화한다', async () => {
    const queryClient = fakeQueryClient()
    useQueryClientMock.mockReturnValue(queryClient)

    const mutation = renderMutation(() => useCreateFinanceBudgetMutation())
    await mutation.onSuccess()

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.budgetsRoot() })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.aggregatesRoot() })
  })
})

describe('집계 원본 mutation의 aggregatesRoot 무효화', () => {
  it('거래 생성은 거래 목록과 서버 집계를 무효화한다', async () => {
    const queryClient = fakeQueryClient()
    useQueryClientMock.mockReturnValue(queryClient)
    await renderMutation(() => useCreateFinanceTransactionMutation()).onSuccess()
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.transactionsRoot() })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.aggregatesRoot() })
  })

  it('카테고리 삭제는 카테고리 트리와 서버 집계를 무효화한다', async () => {
    const queryClient = fakeQueryClient()
    useQueryClientMock.mockReturnValue(queryClient)
    await renderMutation(() => useDeleteFinanceCategoryMutation()).onSuccess()
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.categoriesRoot() })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.aggregatesRoot() })
  })

  it('계좌 수정은 목록을 갱신하고 서버 집계(누락 계좌·미리보기의 계좌명)를 무효화한다', async () => {
    const queryClient = fakeQueryClient([{ id: 'a1', nickname: '구' }])
    useQueryClientMock.mockReturnValue(queryClient)
    const saved = { id: 'a1', nickname: '신' }
    await renderMutation(() => useUpdateFinanceAccountMutation('a1')).onSuccess(saved)
    expect(queryClient.setQueryData).toHaveBeenCalledWith(financeKeys.accounts(), [saved])
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.aggregatesRoot() })
  })
})

describe('useUpdateAssetSnapshotMutation', () => {
  it('upserts the updated snapshot into the list cache and invalidates the server aggregates', async () => {
    const queryClient = fakeQueryClient([{ id: 's1', amount: 1 }])
    useQueryClientMock.mockReturnValue(queryClient)

    const mutation = renderMutation(() => useUpdateAssetSnapshotMutation('s1'))
    const saved = { id: 's1', amount: 9 }

    await mutation.onSuccess(saved)

    expect(queryClient.setQueryData).toHaveBeenCalledWith(financeKeys.assetSnapshots(), [saved])
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.aggregatesRoot() })
  })
})

describe('useDeleteManyAssetSnapshotsMutation', () => {
  it('reports which deletions failed while still calling delete for every id', async () => {
    deleteAssetSnapshotMock.mockImplementation((id: string) => (id === 'bad' ? Promise.reject(new Error('fail')) : Promise.resolve()))
    const queryClient = fakeQueryClient([{ id: 's1' }, { id: 'bad' }])
    useQueryClientMock.mockReturnValue(queryClient)

    const mutation = renderMutation(() => useDeleteManyAssetSnapshotsMutation())

    const outcome = await mutation.mutationFn(['s1', 'bad'])

    expect(outcome).toEqual({ succeededIds: ['s1'], failedCount: 1 })
    expect(deleteAssetSnapshotMock).toHaveBeenCalledTimes(2)

    await mutation.onSuccess(outcome, ['s1', 'bad'])
    expect(queryClient.setQueryData).toHaveBeenCalledWith(financeKeys.assetSnapshots(), [{ id: 'bad' }])
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.aggregatesRoot() })
  })

  it('단건 삭제 전체 실패 시 단수 문구로 에러 toast를 띄운다 (mutationFn이 reject하지 않으므로 onError는 발생하지 않는다)', async () => {
    deleteAssetSnapshotMock.mockRejectedValue(new Error('fail'))
    const queryClient = fakeQueryClient([{ id: 's1' }])
    useQueryClientMock.mockReturnValue(queryClient)

    const mutation = renderMutation(() => useDeleteManyAssetSnapshotsMutation())

    const outcome = await mutation.mutationFn(['s1'])
    expect(outcome).toEqual({ succeededIds: [], failedCount: 1 })

    await mutation.onSuccess(outcome, ['s1'])

    expect(queryClient.setQueryData).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith('자산 기록을 삭제하지 못했습니다.')
  })

  it('다건 선택 삭제 전체 실패 시 건수를 포함한 문구로 에러 toast를 띄운다', async () => {
    deleteAssetSnapshotMock.mockRejectedValue(new Error('fail'))
    const queryClient = fakeQueryClient([{ id: 's1' }, { id: 's2' }])
    useQueryClientMock.mockReturnValue(queryClient)

    const mutation = renderMutation(() => useDeleteManyAssetSnapshotsMutation())

    const outcome = await mutation.mutationFn(['s1', 's2'])
    expect(outcome).toEqual({ succeededIds: [], failedCount: 2 })

    await mutation.onSuccess(outcome, ['s1', 's2'])

    expect(toastErrorMock).toHaveBeenCalledWith('자산 기록 2건을 삭제하지 못했습니다.')
  })
})

describe('useSetMonthlyClosingMutation', () => {
  it('inserts a new month entry when none exists yet', async () => {
    const queryClient = fakeQueryClient([])
    useQueryClientMock.mockReturnValue(queryClient)

    const mutation = renderMutation(() => useSetMonthlyClosingMutation())
    const saved = { month: '2026-08', completed: true }

    await mutation.onSuccess(saved)

    expect(queryClient.setQueryData).toHaveBeenCalledWith(financeKeys.monthlyClosings(), [saved])
  })

  it('replaces an existing month entry', async () => {
    const queryClient = fakeQueryClient([{ month: '2026-08', completed: false }])
    useQueryClientMock.mockReturnValue(queryClient)

    const mutation = renderMutation(() => useSetMonthlyClosingMutation())
    const saved = { month: '2026-08', completed: true }

    await mutation.onSuccess(saved)

    expect(queryClient.setQueryData).toHaveBeenCalledWith(financeKeys.monthlyClosings(), [saved])
  })

  it('does not overwrite the other scope row of the same month', async () => {
    const personal = { month: '2026-08', completed: true, groupId: null }
    const queryClient = fakeQueryClient([personal, { month: '2026-08', completed: false, groupId: 'g1' }])
    useQueryClientMock.mockReturnValue(queryClient)

    const mutation = renderMutation(() => useSetMonthlyClosingMutation())
    const saved = { month: '2026-08', completed: true, groupId: 'g1' }

    await mutation.onSuccess(saved)

    expect(queryClient.setQueryData).toHaveBeenCalledWith(financeKeys.monthlyClosings(), [personal, saved])
  })
})

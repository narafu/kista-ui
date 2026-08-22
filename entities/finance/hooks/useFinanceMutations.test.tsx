import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  useCreateAssetSnapshotMutation,
  useDeleteManyAssetSnapshotsMutation,
  useSetMonthlyClosingMutation,
  useUpdateAssetSnapshotMutation,
} from './useFinanceMutations'
import { financeKeys } from '../model/queryKeys'

const {
  useMutationMock,
  useQueryClientMock,
  createAssetSnapshotMock,
  deleteAssetSnapshotMock,
  setMonthlyClosingMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  useMutationMock: vi.fn((options: unknown) => options),
  useQueryClientMock: vi.fn(),
  createAssetSnapshotMock: vi.fn(),
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
  createFinanceAccount: vi.fn(),
  updateFinanceAccount: vi.fn(),
  deleteFinanceAccount: vi.fn(),
  removeFinanceGroupMember: vi.fn(),
  createFinanceGroupInvitation: vi.fn(),
  respondToInvitation: vi.fn(),
}))

// 활성 그룹 = 개인 그룹(undefined) 고정 — 그룹 전환 자체는 다루지 않는 테스트라 실제 useQuery
// 의존 없이 고정값으로 대체한다(파일 상단의 '@tanstack/react-query' 모킹이 useQuery를 대체하지 않는다).
vi.mock('./useFinanceQueries', () => ({
  useActiveGroupId: () => undefined,
}))

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
  it('invalidates the asset snapshot list cache', async () => {
    const queryClient = fakeQueryClient([{ id: 's1', amount: 1 }])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useCreateAssetSnapshotMutation())

    // @ts-expect-error — 테스트에서 mutation config를 직접 캡처해 호출
    await result.current.onSuccess()

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: financeKeys.assetSnapshotsRoot() })
  })
})

describe('useUpdateAssetSnapshotMutation', () => {
  it('upserts the updated snapshot into the list cache', async () => {
    const queryClient = fakeQueryClient([{ id: 's1', amount: 1 }])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useUpdateAssetSnapshotMutation('s1'))
    const saved = { id: 's1', amount: 9 }

    // @ts-expect-error — 테스트에서 mutation config를 직접 캡처해 호출
    await result.current.onSuccess(saved)

    expect(queryClient.setQueryData).toHaveBeenCalledWith(financeKeys.assetSnapshots(), [saved])
  })
})

describe('useDeleteManyAssetSnapshotsMutation', () => {
  it('reports which deletions failed while still calling delete for every id', async () => {
    deleteAssetSnapshotMock.mockImplementation((id: string) => (id === 'bad' ? Promise.reject(new Error('fail')) : Promise.resolve()))
    const queryClient = fakeQueryClient([{ id: 's1' }, { id: 'bad' }])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useDeleteManyAssetSnapshotsMutation())

    // @ts-expect-error — 테스트에서 mutation config를 직접 캡처해 호출
    const outcome = await result.current.mutationFn(['s1', 'bad'])

    expect(outcome).toEqual({ succeededIds: ['s1'], failedCount: 1 })
    expect(deleteAssetSnapshotMock).toHaveBeenCalledTimes(2)

    // @ts-expect-error
    await result.current.onSuccess(outcome, ['s1', 'bad'])
    expect(queryClient.setQueryData).toHaveBeenCalledWith(financeKeys.assetSnapshots(), [{ id: 'bad' }])
  })

  it('단건 삭제 전체 실패 시 단수 문구로 에러 toast를 띄운다 (mutationFn이 reject하지 않으므로 onError는 발생하지 않는다)', async () => {
    deleteAssetSnapshotMock.mockRejectedValue(new Error('fail'))
    const queryClient = fakeQueryClient([{ id: 's1' }])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useDeleteManyAssetSnapshotsMutation())

    // @ts-expect-error
    const outcome = await result.current.mutationFn(['s1'])
    expect(outcome).toEqual({ succeededIds: [], failedCount: 1 })

    // @ts-expect-error
    await result.current.onSuccess(outcome, ['s1'])

    expect(queryClient.setQueryData).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith('자산 기록을 삭제하지 못했습니다')
  })

  it('다건 선택 삭제 전체 실패 시 건수를 포함한 문구로 에러 toast를 띄운다', async () => {
    deleteAssetSnapshotMock.mockRejectedValue(new Error('fail'))
    const queryClient = fakeQueryClient([{ id: 's1' }, { id: 's2' }])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useDeleteManyAssetSnapshotsMutation())

    // @ts-expect-error
    const outcome = await result.current.mutationFn(['s1', 's2'])
    expect(outcome).toEqual({ succeededIds: [], failedCount: 2 })

    // @ts-expect-error
    await result.current.onSuccess(outcome, ['s1', 's2'])

    expect(toastErrorMock).toHaveBeenCalledWith('자산 기록 2건을 삭제하지 못했습니다')
  })
})

describe('useSetMonthlyClosingMutation', () => {
  it('inserts a new month entry when none exists yet', async () => {
    const queryClient = fakeQueryClient([])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useSetMonthlyClosingMutation())
    const saved = { month: '2026-08', completed: true }

    // @ts-expect-error
    await result.current.onSuccess(saved)

    expect(queryClient.setQueryData).toHaveBeenCalledWith(financeKeys.monthlyClosings(), [saved])
  })

  it('replaces an existing month entry', async () => {
    const queryClient = fakeQueryClient([{ month: '2026-08', completed: false }])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useSetMonthlyClosingMutation())
    const saved = { month: '2026-08', completed: true }

    // @ts-expect-error
    await result.current.onSuccess(saved)

    expect(queryClient.setQueryData).toHaveBeenCalledWith(financeKeys.monthlyClosings(), [saved])
  })
})

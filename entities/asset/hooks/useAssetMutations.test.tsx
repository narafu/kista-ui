import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  useCreateAssetMutation,
  useDeleteManyAssetsMutation,
  useSetAssetMonthlyCheckMutation,
  useUpdateAssetMutation,
} from './useAssetMutations'
import { assetKeys } from '../model/queryKeys'

const {
  useMutationMock,
  useQueryClientMock,
  createAssetMock,
  deleteAssetMock,
  setAssetMonthlyCheckMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  useMutationMock: vi.fn((options: unknown) => options),
  useQueryClientMock: vi.fn(),
  createAssetMock: vi.fn(),
  deleteAssetMock: vi.fn(),
  setAssetMonthlyCheckMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}))

vi.mock('sonner', () => ({ toast: { error: toastErrorMock } }))

vi.mock('../api', () => ({
  createAsset: createAssetMock,
  updateAsset: vi.fn(),
  deleteAsset: deleteAssetMock,
  setAssetMonthlyCheck: setAssetMonthlyCheckMock,
}))

function fakeQueryClient(existingList?: unknown[]) {
  const setQueryData = vi.fn()
  const fetchQuery = vi.fn()
  return {
    getQueryData: vi.fn(() => existingList),
    setQueryData,
    fetchQuery,
  }
}

describe('useCreateAssetMutation', () => {
  it('upserts the created asset into an existing list cache', async () => {
    const queryClient = fakeQueryClient([{ id: 'a1', amount: 1 }])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useCreateAssetMutation())
    const saved = { id: 'a2', amount: 2 }

    // @ts-expect-error — 테스트에서 mutation config를 직접 캡처해 호출
    await result.current.onSuccess(saved)

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      assetKeys.list(),
      [{ id: 'a1', amount: 1 }, saved],
    )
  })
})

describe('useUpdateAssetMutation', () => {
  it('upserts the updated asset into the list cache', async () => {
    const queryClient = fakeQueryClient([{ id: 'a1', amount: 1 }])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useUpdateAssetMutation('a1'))
    const saved = { id: 'a1', amount: 9 }

    // @ts-expect-error — 테스트에서 mutation config를 직접 캡처해 호출
    await result.current.onSuccess(saved)

    expect(queryClient.setQueryData).toHaveBeenCalledWith(assetKeys.list(), [saved])
  })
})

describe('useDeleteManyAssetsMutation', () => {
  it('reports which deletions failed while still calling delete for every id', async () => {
    deleteAssetMock.mockImplementation((id: string) => (id === 'bad' ? Promise.reject(new Error('fail')) : Promise.resolve()))
    const queryClient = fakeQueryClient([{ id: 'a1' }, { id: 'bad' }])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useDeleteManyAssetsMutation())

    // @ts-expect-error — 테스트에서 mutation config를 직접 캡처해 호출
    const outcome = await result.current.mutationFn(['a1', 'bad'])

    expect(outcome).toEqual({ succeededIds: ['a1'], failedCount: 1 })
    expect(deleteAssetMock).toHaveBeenCalledTimes(2)

    // @ts-expect-error
    await result.current.onSuccess(outcome, ['a1', 'bad'])
    expect(queryClient.setQueryData).toHaveBeenCalledWith(assetKeys.list(), [{ id: 'bad' }])
  })

  it('단건 삭제 전체 실패 시 단수 문구로 에러 toast를 띄운다 (mutationFn이 reject하지 않으므로 onError는 발생하지 않는다)', async () => {
    deleteAssetMock.mockRejectedValue(new Error('fail'))
    const queryClient = fakeQueryClient([{ id: 'a1' }])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useDeleteManyAssetsMutation())

    // @ts-expect-error
    const outcome = await result.current.mutationFn(['a1'])
    expect(outcome).toEqual({ succeededIds: [], failedCount: 1 })

    // @ts-expect-error
    await result.current.onSuccess(outcome, ['a1'])

    expect(queryClient.setQueryData).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith('자산 기록을 삭제하지 못했습니다')
  })

  it('다건 선택 삭제 전체 실패 시 건수를 포함한 문구로 에러 toast를 띄운다', async () => {
    deleteAssetMock.mockRejectedValue(new Error('fail'))
    const queryClient = fakeQueryClient([{ id: 'a1' }, { id: 'a2' }])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useDeleteManyAssetsMutation())

    // @ts-expect-error
    const outcome = await result.current.mutationFn(['a1', 'a2'])
    expect(outcome).toEqual({ succeededIds: [], failedCount: 2 })

    // @ts-expect-error
    await result.current.onSuccess(outcome, ['a1', 'a2'])

    expect(toastErrorMock).toHaveBeenCalledWith('자산 기록 2건을 삭제하지 못했습니다')
  })
})

describe('useSetAssetMonthlyCheckMutation', () => {
  it('inserts a new month entry when none exists yet', async () => {
    const queryClient = fakeQueryClient([])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useSetAssetMonthlyCheckMutation())
    const saved = { month: '2026-08', completed: true }

    // @ts-expect-error
    await result.current.onSuccess(saved)

    expect(queryClient.setQueryData).toHaveBeenCalledWith(assetKeys.monthlyChecks(), [saved])
  })

  it('replaces an existing month entry', async () => {
    const queryClient = fakeQueryClient([{ month: '2026-08', completed: false }])
    useQueryClientMock.mockReturnValue(queryClient)

    const { result } = renderHook(() => useSetAssetMonthlyCheckMutation())
    const saved = { month: '2026-08', completed: true }

    // @ts-expect-error
    await result.current.onSuccess(saved)

    expect(queryClient.setQueryData).toHaveBeenCalledWith(assetKeys.monthlyChecks(), [saved])
  })
})

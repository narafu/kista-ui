import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@shared/lib/api-client'
import type { StrategyValidation } from '../model/types'
import { STRATEGY_VALIDATION_DEBOUNCE_MS, useStrategyValidationQuery } from './useStrategyQueries'

const validateStrategyMock = vi.hoisted(() => vi.fn())
vi.mock('../api', () => ({ validateStrategy: validateStrategyMock }))

type Body = { type: string; seed: number }

const result = (detail: string | null, minSeed: number | null = null): StrategyValidation => ({
  fieldErrors: detail ? [{ field: null, detail }] : [],
  warnings: [],
  derived: { basePrice: null, minSeed, skipReason: null, availableCash: null },
})

function renderValidation(initial: Body, keepWhile?: (a: Body, b: Body) => boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(
    ({ body }: { body: Body }) => useStrategyValidationQuery({ kind: 'create', accountId: 'a1' }, body, { enabled: true, keepWhile }),
    { wrapper, initialProps: { body: initial } },
  )
}

// 디바운스 타이머와 응답 Promise를 함께 흘려보낸다
const flush = async (ms = 0) => {
  await act(() => vi.advanceTimersByTimeAsync(ms))
  // 응답 → 캐시 → 렌더 통지가 0ms 타이머로 이어진다
  for (let i = 0; i < 5; i++) await act(() => vi.advanceTimersByTimeAsync(0))
}

describe('useStrategyValidationQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    validateStrategyMock.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('입력이 멈춘 뒤 한 번만 부르고, 디바운스 대기 중에는 current가 없다', async () => {
    validateStrategyMock.mockResolvedValue(result(null))
    const { result: hook, rerender } = renderValidation({ type: 'INFINITE', seed: 1 })
    await flush()
    expect(validateStrategyMock).toHaveBeenCalledTimes(1)
    expect(hook.current.current).toEqual(result(null))

    rerender({ body: { type: 'INFINITE', seed: 2 } })
    await flush(100)
    rerender({ body: { type: 'INFINITE', seed: 3 } })
    await flush(100)
    // 지난 입력의 결과가 남아 있어도 지금 입력의 결과가 아니므로 제출 판정에 쓰지 않는다
    expect(hook.current.current).toBeUndefined()
    expect(validateStrategyMock).toHaveBeenCalledTimes(1)

    await flush(STRATEGY_VALIDATION_DEBOUNCE_MS)
    expect(validateStrategyMock).toHaveBeenCalledTimes(2)
    expect(validateStrategyMock).toHaveBeenLastCalledWith({ kind: 'create', accountId: 'a1' }, { type: 'INFINITE', seed: 3 })
    expect(hook.current.current).toEqual(result(null))
  })

  it('늦게 온 이전 입력의 응답이 최신 입력의 결과를 덮지 않는다', async () => {
    let resolveSlow: (v: StrategyValidation) => void = () => {}
    validateStrategyMock
      .mockImplementationOnce(() => new Promise((r) => { resolveSlow = r }))
      .mockResolvedValueOnce(result(null))
    const { result: hook, rerender } = renderValidation({ type: 'INFINITE', seed: 1 })
    await flush()

    rerender({ body: { type: 'INFINITE', seed: 2 } })
    await flush(STRATEGY_VALIDATION_DEBOUNCE_MS)
    expect(hook.current.current).toEqual(result(null))

    await act(async () => { resolveSlow(result('이전 입력의 거절')) })
    expect(hook.current.current).toEqual(result(null))
    expect(hook.current.data).toEqual(result(null))
  })

  it('keepWhile이 참인 동안만 표시용 data를 이어 쓴다', async () => {
    validateStrategyMock.mockResolvedValueOnce(result(null, 500)).mockReturnValue(new Promise(() => {}))
    const sameType = (a: Body, b: Body) => a.type === b.type
    const { result: hook, rerender } = renderValidation({ type: 'INFINITE', seed: 1 }, sameType)
    await flush()

    rerender({ body: { type: 'INFINITE', seed: 2 } })
    await flush(STRATEGY_VALIDATION_DEBOUNCE_MS) // 새 응답 대기(placeholder)
    expect(hook.current.data?.derived?.minSeed).toBe(500)
    expect(hook.current.current).toBeUndefined()

    rerender({ body: { type: 'PRIVACY', seed: 2 } })
    await flush(100) // 디바운스 대기 — 유형이 바뀌면 이전 유형의 최소 시드를 쓰지 않는다
    expect(hook.current.data).toBeUndefined()
  })

  it('같은 입력의 재조회가 실패해도 받아 둔 거절은 그 입력의 결과로 남는다', async () => {
    validateStrategyMock.mockResolvedValueOnce(result('이미 같은 종목의 전략이 있습니다.')).mockRejectedValue(new ApiError(404, null))
    const { result: hook } = renderValidation({ type: 'INFINITE', seed: 1 })
    await flush()
    expect(hook.current.current?.fieldErrors[0]?.detail).toBe('이미 같은 종목의 전략이 있습니다.')
    await act(async () => { await hook.current.refetch() })
    await flush()
    expect(hook.current.current?.fieldErrors[0]?.detail).toBe('이미 같은 종목의 전략이 있습니다.')
  })

  it('429·503은 한 번 다시 부르고, 404는 다시 부르지 않고 isError가 된다', async () => {
    validateStrategyMock.mockRejectedValueOnce(new ApiError(503, null)).mockResolvedValueOnce(result(null))
    const first = renderValidation({ type: 'INFINITE', seed: 1 })
    await flush(5_000)
    expect(validateStrategyMock).toHaveBeenCalledTimes(2)
    expect(first.result.current.current).toEqual(result(null))

    validateStrategyMock.mockReset()
    validateStrategyMock.mockRejectedValue(new ApiError(404, null))
    const second = renderValidation({ type: 'INFINITE', seed: 9 })
    await flush(5_000)
    expect(validateStrategyMock).toHaveBeenCalledTimes(1)
    expect(second.result.current.isError).toBe(true)
    expect(second.result.current.current).toBeUndefined()
  })
})

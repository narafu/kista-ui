import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useConfirmDialog } from './use-confirm-dialog'

describe('useConfirmDialog', () => {
  it('request 전에는 닫힌 상태다', () => {
    const { result } = renderHook(() => useConfirmDialog<string>())
    expect(result.current.open).toBe(false)
    expect(result.current.target).toBeNull()
  })

  it('request로 target을 설정하면 열린 상태가 된다', () => {
    const { result } = renderHook(() => useConfirmDialog<string>())
    act(() => result.current.request('foo'))
    expect(result.current.open).toBe(true)
    expect(result.current.target).toBe('foo')
  })

  it('onOpenChange(false)는 target을 지워 닫는다', () => {
    const { result } = renderHook(() => useConfirmDialog<string>())
    act(() => result.current.request('foo'))
    act(() => result.current.onOpenChange(false))
    expect(result.current.open).toBe(false)
    expect(result.current.target).toBeNull()
  })

  it('close()는 onOpenChange(false)와 동일하게 동작한다', () => {
    const { result } = renderHook(() => useConfirmDialog<string>())
    act(() => result.current.request('foo'))
    act(() => result.current.close())
    expect(result.current.open).toBe(false)
    expect(result.current.target).toBeNull()
  })
})

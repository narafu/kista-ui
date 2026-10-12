import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 모듈 스토어가 첫 조회 시 localStorage를 캐시하므로 테스트마다 모듈을 새로 불러온다
async function loadHook() {
  vi.resetModules()
  return (await import('./use-amount-hidden')).useAmountHiddenPreference
}

describe('useAmountHiddenPreference', () => {
  beforeEach(() => window.localStorage.clear())

  it('저장된 설정이 켜져 있으면 금액을 가린다', async () => {
    window.localStorage.setItem('kista-amount-hidden', '1')
    const useAmountHiddenPreference = await loadHook()
    const { result } = renderHook(() => useAmountHiddenPreference())

    expect(result.current.masked).toBe(true)
    expect(result.current.maskIfHidden('1,234원')).toBe('●,●●●원')
  })

  it('일시 공개는 같은 스토어를 쓰는 다른 소비자에도 반영되고, 설정을 바꾸면 초기화된다', async () => {
    window.localStorage.setItem('kista-amount-hidden', '1')
    const useAmountHiddenPreference = await loadHook()
    const header = renderHook(() => useAmountHiddenPreference())
    const widget = renderHook(() => useAmountHiddenPreference())

    act(() => header.result.current.setAmountRevealed(true))
    expect(widget.result.current.maskIfHidden('1,234원')).toBe('1,234원')

    act(() => header.result.current.setAmountHidden(true))
    expect(widget.result.current.masked).toBe(true)
    expect(window.localStorage.getItem('kista-amount-hidden')).toBe('1')
  })

  it('다른 탭에서 설정을 바꾸면 storage 이벤트로 즉시 반영한다', async () => {
    const useAmountHiddenPreference = await loadHook()
    const { result } = renderHook(() => useAmountHiddenPreference())
    expect(result.current.masked).toBe(false)

    act(() => {
      window.localStorage.setItem('kista-amount-hidden', '1')
      window.dispatchEvent(new StorageEvent('storage', { key: 'kista-amount-hidden', newValue: '1' }))
    })
    expect(result.current.masked).toBe(true)
  })

  it('설정이 꺼져 있으면 그대로 표시한다', async () => {
    const useAmountHiddenPreference = await loadHook()
    const { result } = renderHook(() => useAmountHiddenPreference())

    expect(result.current.masked).toBe(false)
    expect(result.current.maskIfHidden('1,234원')).toBe('1,234원')
  })
})

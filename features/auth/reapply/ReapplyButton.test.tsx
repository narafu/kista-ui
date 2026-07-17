import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReapplyButton } from './ReapplyButton'

const { reapplyMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  reapplyMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}))

vi.mock('@entities/user', () => ({
  reapply: reapplyMock,
}))

// jsdom 환경에 window.localStorage가 제공되지 않아 in-memory 구현으로 대체
function createLocalStorageStub(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

describe('ReapplyButton', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageStub())
    reapplyMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
  })

  it('requests reapproval and records the cooldown timestamp', async () => {
    reapplyMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ReapplyButton />)

    await user.click(screen.getByRole('button', { name: '승인 재요청' }))

    expect(reapplyMock).toHaveBeenCalled()
    expect(toastSuccessMock).toHaveBeenCalledWith('승인 재요청이 완료되었습니다')
    expect(localStorage.getItem('reapply_last_requested_at')).not.toBeNull()
  })

  it('blocks a repeat request during the cooldown window without calling reapply', async () => {
    localStorage.setItem('reapply_last_requested_at', Date.now().toString())
    const user = userEvent.setup()
    render(<ReapplyButton />)

    const button = screen.getByRole('button', { name: /분 후 재요청 가능/ })
    await user.click(button)

    expect(reapplyMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining('분 후 다시 요청할 수 있습니다'))
  })
})

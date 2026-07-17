import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RejectedReapplyButton } from './RejectedReapplyButton'

const reapplyMock = vi.fn()
const routerPushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
}))

vi.mock('@entities/user', () => ({
  reapply: () => reapplyMock(),
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

describe('RejectedReapplyButton', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageStub())
    reapplyMock.mockReset()
    routerPushMock.mockReset()
  })

  it('navigates to the pending page after a successful reapply request', async () => {
    reapplyMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<RejectedReapplyButton />)

    await user.click(screen.getByRole('button', { name: '승인 재신청' }))

    expect(reapplyMock).toHaveBeenCalled()
    expect(routerPushMock).toHaveBeenCalledWith('/pending')
  })

  it('shows an error message and stays on the page when the request fails', async () => {
    reapplyMock.mockRejectedValue(new Error('network error'))
    const user = userEvent.setup()
    render(<RejectedReapplyButton />)

    await user.click(screen.getByRole('button', { name: '승인 재신청' }))

    expect(await screen.findByText('재신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')).toBeInTheDocument()
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('disables the button and blocks the request while the 24-hour cooldown is active', () => {
    localStorage.setItem('reapply_rejected_last_at', Date.now().toString())
    render(<RejectedReapplyButton />)

    expect(screen.getByRole('button', { name: /후 재신청 가능/ })).toBeDisabled()
  })
})

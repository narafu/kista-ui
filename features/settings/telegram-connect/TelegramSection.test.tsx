import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TelegramSection } from './TelegramSection'

const updateMutateMock = vi.fn()
const deleteMutateMock = vi.fn()
const updateChannelMutateMock = vi.fn()
const routerRefreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@entities/user', () => ({
  useUpdateTelegramMutation: () => ({ mutate: updateMutateMock, isPending: false }),
  useDeleteTelegramMutation: () => ({ mutate: deleteMutateMock, isPending: false }),
  useUpdateNotificationChannelMutation: () => ({ mutate: updateChannelMutateMock, isPending: false }),
}))

describe('TelegramSection', () => {
  it('blocks submission and shows field errors when bot token and chat id are empty', async () => {
    const user = userEvent.setup()
    render(<TelegramSection hasTelegram={false} telegramBotUsername={null} currentChannel="NONE" />)

    await user.click(screen.getByRole('button', { name: '연결하기' }))

    expect(screen.getByText('Bot Token을 입력해주세요')).toBeInTheDocument()
    expect(screen.getByText('Chat ID를 입력해주세요')).toBeInTheDocument()
    expect(updateMutateMock).not.toHaveBeenCalled()
  })

  it('submits the trimmed bot token and chat id when connecting', async () => {
    const user = userEvent.setup()
    render(<TelegramSection hasTelegram={false} telegramBotUsername={null} currentChannel="NONE" />)

    await user.type(screen.getByPlaceholderText('123456:ABC-DEF...'), ' 123456:ABC ')
    await user.type(screen.getByPlaceholderText('-100123456789'), ' -100123456789 ')
    await user.click(screen.getByRole('button', { name: '연결하기' }))

    expect(updateMutateMock).toHaveBeenCalledWith(
      { botToken: '123456:ABC', chatId: '-100123456789' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    )
  })

  it('disconnects the linked chat when already connected', async () => {
    const user = userEvent.setup()
    render(<TelegramSection hasTelegram telegramBotUsername="kista_bot" currentChannel="TELEGRAM" />)

    await user.click(screen.getByRole('button', { name: '연결 해제' }))

    expect(deleteMutateMock).toHaveBeenCalled()
  })
})

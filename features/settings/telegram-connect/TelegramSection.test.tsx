import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { NotificationChannel } from '@entities/user'
import { mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { PendingTelegramConnect } from './PendingTelegramConnect'
import { TelegramSection } from './TelegramSection'

const handlers = () => ({
  'PUT /api/settings/telegram': undefined as never,
  'PATCH /api/settings/notification-channel': undefined as never,
})

async function fillAndSubmit(button: string) {
  await userEvent.type(screen.getByPlaceholderText('123456:ABC-DEF...'), ' 123456:ABC ')
  await userEvent.type(screen.getByPlaceholderText('-100123456789'), ' -100123456789 ')
  await userEvent.click(screen.getByRole('button', { name: button }))
}

describe('TelegramSection', () => {
  it('blocks submission and shows field errors when bot token and chat id are empty', async () => {
    const { requests } = mockApi(handlers())
    renderApp(<TelegramSection hasTelegram={false} telegramBotUsername={null} currentChannel="NONE" />)

    await userEvent.click(screen.getByRole('button', { name: '연결하기' }))

    expect(await screen.findByText('Bot Token을 입력하세요')).toBeInTheDocument()
    expect(screen.getByText('Chat ID를 입력하세요')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('PUTs the trimmed bot token and chat id when connecting', async () => {
    const { requests } = mockApi(handlers())
    renderApp(<TelegramSection hasTelegram={false} telegramBotUsername={null} currentChannel="TELEGRAM" />)

    await fillAndSubmit('연결하기')

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0]).toMatchObject({ method: 'PUT', path: '/api/settings/telegram', body: { botToken: '123456:ABC', chatId: '-100123456789' } })
    // 입력은 연결 뒤 비운다
    await waitFor(() => expect(screen.getByPlaceholderText('123456:ABC-DEF...')).toHaveValue(''))
  })

  it.each<[NotificationChannel, string | null]>([['NONE', 'TELEGRAM'], ['FCM', 'ALL'], ['TELEGRAM', null], ['ALL', null]])(
    '연결 성공 뒤 알림 수단이 %s이면 %s로 바꾼다',
    async (current, next) => {
      const { requests } = mockApi(handlers())
      renderApp(<TelegramSection hasTelegram={false} telegramBotUsername={null} currentChannel={current} />)

      await fillAndSubmit('연결하기')

      await waitFor(() => expect(requests.some((r) => r.method === 'PUT')).toBe(true))
      const patch = requests.find((r) => r.method === 'PATCH')
      if (next) await waitFor(() => expect(requests.find((r) => r.method === 'PATCH')?.body).toEqual({ channel: next }))
      else expect(patch).toBeUndefined()
    },
  )

  it('disconnects the linked chat only after confirming', async () => {
    const { requests } = mockApi({ 'DELETE /api/settings/telegram': undefined as never })
    renderApp(<TelegramSection hasTelegram telegramBotUsername="kista_bot" currentChannel="TELEGRAM" />)

    await userEvent.click(screen.getByRole('button', { name: '연결 해제' }))
    expect(requests).toHaveLength(0)

    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '연결 해제' }))
    await waitFor(() => expect(requests).toHaveLength(1))
  })
})

describe('PendingTelegramConnect', () => {
  it('폼을 열어 연결하면 PUT하고 폼을 닫는다', async () => {
    const { requests } = mockApi(handlers())
    renderApp(<PendingTelegramConnect hasTelegram={false} currentChannel="NONE" />)

    await userEvent.click(screen.getByRole('button', { name: '텔레그램 봇 연결하기' }))
    await fillAndSubmit('저장')

    await waitFor(() => expect(screen.getByRole('button', { name: '텔레그램 봇 연결하기' })).toBeInTheDocument())
    expect(requests.find((r) => r.method === 'PUT')).toMatchObject({ path: '/api/settings/telegram', body: { botToken: '123456:ABC', chatId: '-100123456789' } })
    expect(requests.find((r) => r.method === 'PATCH')?.body).toEqual({ channel: 'TELEGRAM' })
  })

  it('빈 값은 요청 없이 오류를 보이고, 취소하면 입력을 비우고 닫는다', async () => {
    const { requests } = mockApi(handlers())
    renderApp(<PendingTelegramConnect hasTelegram={false} currentChannel="NONE" />)

    await userEvent.click(screen.getByRole('button', { name: '텔레그램 봇 연결하기' }))
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByText('Bot Token을 입력하세요')).toBeInTheDocument()
    expect(requests).toHaveLength(0)

    await userEvent.type(screen.getByPlaceholderText('123456:ABC-DEF...'), 'x')
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    await userEvent.click(screen.getByRole('button', { name: '텔레그램 봇 연결하기' }))
    expect(screen.getByPlaceholderText('123456:ABC-DEF...')).toHaveValue('')
  })
})

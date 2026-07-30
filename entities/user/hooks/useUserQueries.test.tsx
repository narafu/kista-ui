import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { User } from '../model/types'
import { userKeys } from '../model/queryKeys'
import {
  useDeleteTelegramMutation,
  useMeQuery,
  useUpdateNicknameMutation,
  useUpdateNotificationChannelMutation,
  useUpdateTelegramMutation,
} from './useUserQueries'

const {
  getMeClientMock,
  updateNicknameMock,
  updateNotificationChannelMock,
  updateTelegramMock,
  deleteTelegramMock,
} = vi.hoisted(() => ({
  getMeClientMock: vi.fn(),
  updateNicknameMock: vi.fn(),
  updateNotificationChannelMock: vi.fn(),
  updateTelegramMock: vi.fn(),
  deleteTelegramMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api', () => ({
  getMeClient: getMeClientMock,
  updateNickname: updateNicknameMock,
  updateNotificationChannel: updateNotificationChannelMock,
  updateTelegram: updateTelegramMock,
  deleteTelegram: deleteTelegramMock,
  deleteMe: vi.fn(),
  updateBalanceCheckEnabled: vi.fn(),
  updateNotificationPref: vi.fn(),
}))

const baseUser: User = {
  id: 'user-1',
  nickname: 'narafu',
  status: 'ACTIVE',
  role: 'USER',
  hasTelegram: false,
  balanceCheckEnabled: true,
  notificationChannel: 'NONE',
  notificationPrefs: {},
}

let serverUser: User

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderUserHooks(queryClient: QueryClient) {
  return renderHook(() => ({
    me: useMeQuery(),
    updateNickname: useUpdateNicknameMutation(),
    updateChannel: useUpdateNotificationChannelMutation(),
    updateTelegram: useUpdateTelegramMutation(),
    deleteTelegram: useDeleteTelegramMutation(),
  }), {
    wrapper: createWrapper(queryClient),
  })
}

async function expectMutationToAwaitVisibleUserUpdate(
  queryClient: QueryClient,
  mutate: () => Promise<unknown>,
) {
  let refreshStarted = false
  let resolveRefresh: (user: User) => void = () => undefined
  const refresh = new Promise<User>((resolve) => {
    resolveRefresh = resolve
  })
  getMeClientMock.mockImplementationOnce(() => {
    refreshStarted = true
    return refresh
  })

  const mutation = mutate()
  await waitFor(() => expect(refreshStarted).toBe(true))

  let settled = false
  void mutation.then(() => { settled = true })
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(settled).toBe(false)

  resolveRefresh(serverUser)
  await mutation
  expect(queryClient.getQueryData<User>(userKeys.me())).toEqual(serverUser)
}

describe('user query ownership', () => {
  beforeEach(() => {
    serverUser = baseUser
    getMeClientMock.mockReset().mockImplementation(() => Promise.resolve(serverUser))
    updateNicknameMock.mockReset().mockImplementation((nickname: string) => {
      serverUser = { ...serverUser, nickname }
      return Promise.resolve()
    })
    updateNotificationChannelMock.mockReset().mockImplementation((notificationChannel: User['notificationChannel']) => {
      serverUser = { ...serverUser, notificationChannel }
      return Promise.resolve()
    })
    updateTelegramMock.mockReset().mockImplementation(() => {
      serverUser = { ...serverUser, hasTelegram: true, telegramBotUsername: 'kista_bot' }
      return Promise.resolve()
    })
    deleteTelegramMock.mockReset().mockImplementation(() => {
      serverUser = { ...serverUser, hasTelegram: false, telegramBotUsername: null }
      return Promise.resolve()
    })
  })

  it('shows a changed nickname in the me cache before the mutation resolves', async () => {
    const queryClient = createTestQueryClient()
    const { result } = renderUserHooks(queryClient)
    await waitFor(() => expect(result.current.me.data).toEqual(baseUser))

    await expectMutationToAwaitVisibleUserUpdate(queryClient, () =>
      result.current.updateNickname.mutateAsync('cache owner'),
    )

    expect(queryClient.getQueryData<User>(userKeys.me())?.nickname).toBe('cache owner')
  })

  it('shows the connected Telegram state in the me cache before the mutation resolves', async () => {
    const queryClient = createTestQueryClient()
    const { result } = renderUserHooks(queryClient)
    await waitFor(() => expect(result.current.me.data).toEqual(baseUser))

    await expectMutationToAwaitVisibleUserUpdate(queryClient, () =>
      result.current.updateTelegram.mutateAsync({ botToken: 'token', chatId: 'chat' }),
    )

    expect(queryClient.getQueryData<User>(userKeys.me())).toMatchObject({
      hasTelegram: true,
      telegramBotUsername: 'kista_bot',
    })
  })

  it('shows the disconnected Telegram state in the me cache before the mutation resolves', async () => {
    serverUser = { ...baseUser, hasTelegram: true, telegramBotUsername: 'kista_bot' }
    const queryClient = createTestQueryClient()
    const { result } = renderUserHooks(queryClient)
    await waitFor(() => expect(result.current.me.data).toEqual(serverUser))

    await expectMutationToAwaitVisibleUserUpdate(queryClient, () => result.current.deleteTelegram.mutateAsync())

    expect(queryClient.getQueryData<User>(userKeys.me())).toMatchObject({
      hasTelegram: false,
      telegramBotUsername: null,
    })
  })

  it('shows a changed notification channel in the me cache before the mutation resolves', async () => {
    const queryClient = createTestQueryClient()
    const { result } = renderUserHooks(queryClient)
    await waitFor(() => expect(result.current.me.data).toEqual(baseUser))

    await expectMutationToAwaitVisibleUserUpdate(queryClient, () => result.current.updateChannel.mutateAsync('FCM'))

    expect(queryClient.getQueryData<User>(userKeys.me())?.notificationChannel).toBe('FCM')
  })
})

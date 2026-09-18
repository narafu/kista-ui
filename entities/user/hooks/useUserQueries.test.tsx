import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { User } from '../model/types'
import { userKeys } from '../model/queryKeys'
import {
  useDeleteTelegramMutation,
  useMeQuery,
  useUpdateBalanceCheckEnabledMutation,
  useUpdateNicknameMutation,
  useUpdateNotificationChannelMutation,
  useUpdateNotificationPrefMutation,
  useUpdateTelegramMutation,
} from './useUserQueries'

const {
  getMeClientMock,
  updateNicknameMock,
  updateNotificationChannelMock,
  updateTelegramMock,
  deleteTelegramMock,
  updateBalanceCheckEnabledMock,
  updateNotificationPrefMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  getMeClientMock: vi.fn(),
  updateNicknameMock: vi.fn(),
  updateNotificationChannelMock: vi.fn(),
  updateTelegramMock: vi.fn(),
  deleteTelegramMock: vi.fn(),
  updateBalanceCheckEnabledMock: vi.fn(),
  updateNotificationPrefMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: toastErrorMock },
}))

vi.mock('../api', () => ({
  getMeClient: getMeClientMock,
  updateNickname: updateNicknameMock,
  updateNotificationChannel: updateNotificationChannelMock,
  updateTelegram: updateTelegramMock,
  deleteTelegram: deleteTelegramMock,
  deleteMe: vi.fn(),
  updateBalanceCheckEnabled: updateBalanceCheckEnabledMock,
  updateNotificationPref: updateNotificationPrefMock,
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
  strategySuggestions: [],
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
    updateBalanceCheckEnabled: useUpdateBalanceCheckEnabledMutation(),
    updateNotificationPref: useUpdateNotificationPrefMutation(),
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
    updateBalanceCheckEnabledMock.mockReset().mockImplementation((enabled: boolean) => {
      serverUser = { ...serverUser, balanceCheckEnabled: enabled }
      return Promise.resolve()
    })
    updateNotificationPrefMock.mockReset().mockImplementation((type: string, enabled: boolean) => {
      serverUser = { ...serverUser, notificationPrefs: { ...serverUser.notificationPrefs, [type]: enabled } }
      return Promise.resolve()
    })
    toastErrorMock.mockReset()
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

describe('optimistic toggle mutations', () => {
  beforeEach(() => {
    serverUser = baseUser
    getMeClientMock.mockReset().mockImplementation(() => Promise.resolve(serverUser))
  })

  it('flips balanceCheckEnabled in the me cache before the mutation resolves, then keeps it on success', async () => {
    const queryClient = createTestQueryClient()
    const { result } = renderUserHooks(queryClient)
    await waitFor(() => expect(result.current.me.data).toEqual(baseUser))

    let resolveUpdate: () => void = () => undefined
    updateBalanceCheckEnabledMock.mockReset().mockImplementation(() => new Promise<void>((resolve) => { resolveUpdate = resolve }))

    let mutation: Promise<unknown>
    act(() => {
      mutation = result.current.updateBalanceCheckEnabled.mutateAsync(false)
    })
    await waitFor(() => expect(queryClient.getQueryData<User>(userKeys.me())?.balanceCheckEnabled).toBe(false))

    serverUser = { ...serverUser, balanceCheckEnabled: false }
    resolveUpdate()
    await mutation!
    expect(queryClient.getQueryData<User>(userKeys.me())?.balanceCheckEnabled).toBe(false)
  })

  it('rolls back balanceCheckEnabled in the me cache when the mutation fails', async () => {
    const queryClient = createTestQueryClient()
    const { result } = renderUserHooks(queryClient)
    await waitFor(() => expect(result.current.me.data).toEqual(baseUser))

    updateBalanceCheckEnabledMock.mockReset().mockRejectedValue(new Error('network error'))

    await act(async () => {
      await result.current.updateBalanceCheckEnabled.mutateAsync(false).catch(() => undefined)
    })

    expect(queryClient.getQueryData<User>(userKeys.me())?.balanceCheckEnabled).toBe(true)
    expect(toastErrorMock).toHaveBeenCalled()
  })

  it('rolls back a notification pref in the me cache when the mutation fails', async () => {
    const queryClient = createTestQueryClient()
    const { result } = renderUserHooks(queryClient)
    await waitFor(() => expect(result.current.me.data).toEqual(baseUser))

    updateNotificationPrefMock.mockReset().mockRejectedValue(new Error('network error'))

    await act(async () => {
      await result.current.updateNotificationPref.mutateAsync({ type: 'TRADING_ALERT', enabled: false }).catch(() => undefined)
    })

    expect(queryClient.getQueryData<User>(userKeys.me())?.notificationPrefs).toEqual({})
    expect(toastErrorMock).toHaveBeenCalled()
  })

  it('does not clobber a sibling toggle mutation that already succeeded when this one rolls back', async () => {
    const queryClient = createTestQueryClient()
    const { result } = renderUserHooks(queryClient)
    await waitFor(() => expect(result.current.me.data).toEqual(baseUser))

    // TRADING_ALERT는 실패, MARKET_ALERT는 그 사이 먼저 성공 — 실패한 쪽의 롤백이 성공한
    // 다른 토글 값까지 예전 스냅샷으로 되돌리면 안 된다.
    let rejectTradingAlert: (err: Error) => void = () => undefined
    updateNotificationPrefMock.mockReset().mockImplementation((type: string) => {
      if (type === 'TRADING_ALERT') {
        return new Promise((_resolve, reject) => { rejectTradingAlert = reject })
      }
      serverUser = { ...serverUser, notificationPrefs: { ...serverUser.notificationPrefs, [type]: true } }
      return Promise.resolve()
    })

    let tradingAlertMutation: Promise<unknown>
    act(() => {
      tradingAlertMutation = result.current.updateNotificationPref
        .mutateAsync({ type: 'TRADING_ALERT', enabled: false })
        .catch(() => undefined)
    })
    await waitFor(() => expect(queryClient.getQueryData<User>(userKeys.me())?.notificationPrefs?.TRADING_ALERT).toBe(false))

    await act(async () => {
      await result.current.updateNotificationPref.mutateAsync({ type: 'MARKET_ALERT', enabled: true })
    })
    expect(queryClient.getQueryData<User>(userKeys.me())?.notificationPrefs?.MARKET_ALERT).toBe(true)

    act(() => { rejectTradingAlert(new Error('network error')) })
    await act(async () => { await tradingAlertMutation })

    expect(queryClient.getQueryData<User>(userKeys.me())?.notificationPrefs?.MARKET_ALERT).toBe(true)
  })
})

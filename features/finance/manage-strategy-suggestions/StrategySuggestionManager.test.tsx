import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeConfig } from '@entities/runtime-config'
import { StrategySuggestionManager } from './StrategySuggestionManager'

const { mutateMock, adminSettingsState, meState } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  adminSettingsState: { data: undefined as RuntimeConfig | undefined },
  meState: { data: undefined as { role: string } | undefined },
}))

vi.mock('@entities/admin-settings', () => ({
  useAdminSettingsQuery: () => ({ data: adminSettingsState.data }),
  useUpdateAdminSettingsMutation: () => ({ mutate: mutateMock, isPending: false }),
}))
vi.mock('@entities/user', () => ({
  useMeQuery: () => ({ data: meState.data }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

const settings: RuntimeConfig = {
  auth: { approvalRequired: true },
  brokers: { KIS: { enabled: true }, TOSS: { enabled: true }, MOCK: { enabled: true } },
  strategies: {
    INFINITE: { enabled: true, fields: { ticker: { customizable: true, allowedValues: ['SOXL'], defaultValue: 'SOXL' } } },
    PRIVACY: { enabled: true, fields: { ticker: { customizable: false, allowedValues: ['SOXL'], defaultValue: 'SOXL' } } },
    VR: { enabled: true, fields: { ticker: { customizable: false, allowedValues: ['TQQQ'], defaultValue: 'TQQQ' } } },
  },
  assetFormOptions: { strategySuggestions: ['VR', 'INFINITE'] },
}

describe('StrategySuggestionManager', () => {
  beforeEach(() => {
    mutateMock.mockReset()
    adminSettingsState.data = settings
    meState.data = { role: 'ADMIN' }
  })

  it('ADMIN이 아니면 렌더링하지 않는다', () => {
    meState.data = { role: 'USER' }
    const { container } = render(<StrategySuggestionManager />)
    expect(container).toBeEmptyDOMElement()
  })

  it('새 운용전략을 추가하면 나머지 설정을 그대로 왕복시켜 전체 저장한다', async () => {
    const user = userEvent.setup()
    render(<StrategySuggestionManager />)

    await user.type(screen.getByLabelText('운용전략 추가'), 'DCA-PLUS')
    await user.click(screen.getByLabelText('운용전략 추가 확정'))

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      auth: settings.auth,
      brokers: settings.brokers,
      assetFormOptions: { strategySuggestions: ['VR', 'INFINITE', 'DCA-PLUS'] },
    }))
  })
})

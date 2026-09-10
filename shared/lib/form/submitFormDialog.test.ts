import { describe, it, expect, vi } from 'vitest'
import { submitFormDialog } from './submitFormDialog'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('submitFormDialog', () => {
  it('create 모드는 createExtra를 병합해 createMutation을 호출하고 onSuccess를 부른다', () => {
    const createMutation = { mutate: vi.fn((_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()) }
    const updateMutation = { mutate: vi.fn() }
    const onSuccess = vi.fn()

    submitFormDialog<{ name: string }, { name: string; shareToGroup: boolean }>({
      mode: 'create',
      payload: { name: 'foo' },
      createMutation,
      updateMutation,
      createExtra: { shareToGroup: true },
      messages: { create: '등록됨', edit: '수정됨' },
      onSuccess,
    })

    expect(createMutation.mutate).toHaveBeenCalledWith(
      { name: 'foo', shareToGroup: true },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(updateMutation.mutate).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('edit 모드는 createExtra 없이 updateMutation을 호출하고 onSuccess를 부른다', () => {
    const createMutation = { mutate: vi.fn() }
    const updateMutation = { mutate: vi.fn((_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()) }
    const onSuccess = vi.fn()

    submitFormDialog<{ name: string }, { name: string; shareToGroup: boolean }>({
      mode: 'edit',
      payload: { name: 'foo' },
      createMutation,
      updateMutation,
      createExtra: { shareToGroup: true },
      messages: { create: '등록됨', edit: '수정됨' },
      onSuccess,
    })

    expect(updateMutation.mutate).toHaveBeenCalledWith(
      { name: 'foo' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(createMutation.mutate).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('mode에 맞는 메시지로 toast.success를 부른다', async () => {
    const { toast } = await import('sonner')
    const createMutation = { mutate: vi.fn((_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()) }
    const updateMutation = { mutate: vi.fn() }

    submitFormDialog({
      mode: 'create',
      payload: {},
      createMutation,
      updateMutation,
      messages: { create: '등록됨', edit: '수정됨' },
      onSuccess: vi.fn(),
    })

    expect(toast.success).toHaveBeenCalledWith('등록됨')
  })
})

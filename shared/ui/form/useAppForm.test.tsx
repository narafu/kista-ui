import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { ApiError, clientFetch } from '@shared/lib/api-client'
import { apiError, mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { FormActions } from '../FormActions'
import { FormField } from './FormField'
import { serverFieldErrors, useAppForm } from './useAppForm'

const schema = z.object({ name: z.string().trim().min(1, '이름을 입력하세요.'), sortOrder: z.string() })

function CategoryForm({ onDone }: { onDone: () => void }) {
  const mutation = useMutation({
    mutationFn: (body: { name: string; sortOrder: number; type: 'EXPENSE' }) =>
      clientFetch('/api/finance/categories', { method: 'POST', body: JSON.stringify(body) }),
  })
  const form = useAppForm({
    schema,
    defaultValues: { name: '', sortOrder: '3' },
    mutation,
    toPayload: (v) => ({ name: v.name, sortOrder: Number(v.sortOrder), type: 'EXPENSE' as const }),
    successMessage: '카테고리를 추가했습니다',
    onDone,
  })
  return (
    <form onSubmit={form.submit}>
      <FormField control={form.control} name="name" label="이름" required hint="50자까지">
        {(field) => <Input {...field} disabled={form.isPending} />}
      </FormField>
      <FormActions form={form} label="추가" />
    </form>
  )
}

describe('useAppForm', () => {
  it('제출하면 toPayload 결과를 보내고, 성공하면 토스트와 onDone을 부른다', async () => {
    const { requests } = mockApi({ 'POST /api/finance/categories': { id: 'c1' } as never })
    const onDone = vi.fn()
    renderApp(<CategoryForm onDone={onDone} />)

    await userEvent.type(screen.getByLabelText('이름'), ' 식비 ')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce())
    expect(requests.map((r) => r.body)).toEqual([{ name: '식비', sortOrder: 3, type: 'EXPENSE' }])
    expect(toast.success).toHaveBeenCalledWith('카테고리를 추가했습니다')
  })

  it('진행 중에는 제출 버튼이 "추가 중…"으로 잠긴다', async () => {
    let release!: () => void
    mockApi({ 'POST /api/finance/categories': () => new Promise((r) => { release = () => r({ id: 'c1' } as never) }) })
    renderApp(<CategoryForm onDone={() => {}} />)

    await userEvent.type(screen.getByLabelText('이름'), '식비')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))

    expect(await screen.findByRole('button', { name: '추가 중…' })).toBeDisabled()
    release()
    expect(await screen.findByRole('button', { name: '추가' })).toBeEnabled()
  })

  it('형식 오류는 필드에 붙이고 요청을 보내지 않는다', async () => {
    const { requests } = mockApi({})
    renderApp(<CategoryForm onDone={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: '추가' }))

    const input = screen.getByLabelText('이름')
    expect(await screen.findByRole('alert')).toHaveTextContent('이름을 입력하세요.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input.getAttribute('aria-describedby')).toBe('name-hint name-error')
    expect(requests).toHaveLength(0)
  })

  it('서버 fieldErrors는 이름이 같은 필드에 붙이고 포커스한다. 성공 처리는 하지 않는다', async () => {
    mockApi({ 'POST /api/finance/categories': apiError(400, { detail: '입력값을 확인해 주세요.', fieldErrors: [{ field: 'name', detail: '이미 있는 이름입니다.' }] }) })
    const onDone = vi.fn()
    renderApp(<CategoryForm onDone={onDone} />)

    const input = screen.getByLabelText('이름')
    await userEvent.type(input, '식비')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 있는 이름입니다.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(input).toHaveFocus())
    expect(onDone).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('폼에 없는 이름·field null은 버튼 위 한 줄로 모으고, 다음 제출 때 지운다', async () => {
    const fail = apiError(400, { detail: '입력값을 확인해 주세요.', fieldErrors: [{ field: 'sortOrder', detail: '순서가 너무 큽니다.' }, { field: null, detail: '조합이 맞지 않습니다.' }] })
    let calls = 0
    mockApi({ 'POST /api/finance/categories': () => (++calls === 1 ? fail : ({ id: 'c1' } as never)) })
    renderApp(<CategoryForm onDone={() => {}} />)

    await userEvent.type(screen.getByLabelText('이름'), '식비')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('순서가 너무 큽니다. 조합이 맞지 않습니다.')
    expect(screen.getByLabelText('이름')).not.toHaveAttribute('aria-invalid', 'true')

    await userEvent.click(screen.getByRole('button', { name: '추가' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})

function ServerBackedForm({ name }: { name: string }) {
  const mutation = useMutation({ mutationFn: async (_body: { name: string; sortOrder: string }) => {} })
  const form = useAppForm({ schema, values: { name, sortOrder: '1' }, resetOptions: { keepDirtyValues: true }, mutation })
  return (
    <form onSubmit={form.submit}>
      <FormField control={form.control} name="name" label="이름">
        {(field) => <Input {...field} />}
      </FormField>
    </form>
  )
}

describe('useAppForm 옵션 통과', () => {
  it('values·resetOptions를 useForm에 넘겨 서버값을 따라가되 편집한 값은 남긴다', async () => {
    const { rerender } = renderApp(<ServerBackedForm name="식비" />)
    const input = screen.getByLabelText('이름')
    expect(input).toHaveValue('식비')

    rerender(<ServerBackedForm name="교통" />)
    await waitFor(() => expect(input).toHaveValue('교통'))

    await userEvent.clear(input)
    await userEvent.type(input, '외식')
    rerender(<ServerBackedForm name="주거" />)
    await waitFor(() => expect(input).toHaveValue('외식'))
  })
})

describe('serverFieldErrors', () => {
  it('fieldErrors의 배열 경로를 RHF 이름으로 바꾸고 field null은 남긴다', () => {
    const err = new ApiError(400, { fieldErrors: [
      { field: 'dca.rules[0].amount', detail: '금액은 0보다 커야 합니다.' },
      { field: null, detail: '조합이 맞지 않습니다.' },
      { field: 'x', detail: 1 },
    ] })
    expect(serverFieldErrors(err)).toEqual([
      { field: 'dca.rules.0.amount', message: '금액은 0보다 커야 합니다.' },
      { field: null, message: '조합이 맞지 않습니다.' },
    ])
  })

  it('ApiError가 아니거나 fieldErrors가 없으면 빈 배열', () => {
    expect(serverFieldErrors(new Error('x'))).toEqual([])
    expect(serverFieldErrors(new ApiError(400, { detail: 'x' }))).toEqual([])
    expect(serverFieldErrors(new ApiError(500, null))).toEqual([])
  })
})

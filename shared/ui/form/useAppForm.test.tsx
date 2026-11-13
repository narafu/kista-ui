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
    successMessage: '카테고리가 추가되었습니다',
    onDone,
  })
  return (
    <form onSubmit={form.submit}>
      <FormField control={form.control} name="name" label="이름" required hint="50자까지">
        {(field) => <Input {...field} />}
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
    expect(toast.success).toHaveBeenCalledWith('카테고리가 추가되었습니다')
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

  it('서버 실패면 onDone·성공 토스트 없이 폼을 남긴다(fieldErrors 매핑은 api T7 전까지 꺼짐)', async () => {
    mockApi({ 'POST /api/finance/categories': apiError(400, { detail: '중복', fieldErrors: [{ field: 'name', detail: '이미 있는 이름입니다.' }] }) })
    const onDone = vi.fn()
    renderApp(<CategoryForm onDone={onDone} />)

    await userEvent.type(screen.getByLabelText('이름'), '식비')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))

    expect(await screen.findByRole('button', { name: '추가' })).toBeEnabled()
    expect(onDone).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.queryByText('이미 있는 이름입니다.')).not.toBeInTheDocument()
  })
})

describe('serverFieldErrors', () => {
  it('ProblemDetail의 fieldErrors를 필드 오류로 바꾼다', () => {
    const err = new ApiError(400, { fieldErrors: [{ field: 'name', detail: '이미 있는 이름입니다.' }, { field: 1, detail: 'x' }] })
    expect(serverFieldErrors(err)).toEqual([{ field: 'name', message: '이미 있는 이름입니다.' }])
  })

  it('ApiError가 아니거나 fieldErrors가 없으면 빈 배열', () => {
    expect(serverFieldErrors(new Error('x'))).toEqual([])
    expect(serverFieldErrors(new ApiError(400, { detail: 'x' }))).toEqual([])
    expect(serverFieldErrors(new ApiError(500, null))).toEqual([])
  })
})

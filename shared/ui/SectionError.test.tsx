import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, SERVER_RESTART_MESSAGE } from '@shared/lib/api-client'
import { SectionError } from './SectionError'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

function FailingSection({ queryFn }: { queryFn: () => Promise<string> }) {
  const { data, isError } = useQuery({ queryKey: ['section'], queryFn, retry: false })
  if (isError) return <SectionError message="불러오지 못했습니다." />
  return <p>{data ?? 'loading'}</p>
}

describe('SectionError', () => {
  it.each([
    ['503', new ApiError(503, { error: 'Failed' }), SERVER_RESTART_MESSAGE],
    ['502', new ApiError(502, null), SERVER_RESTART_MESSAGE],
    ['message만 있는 503', new ApiError(503, { message: 'Connection pool exhausted' }), SERVER_RESTART_MESSAGE],
    ['서버 문구가 있는 503', new ApiError(503, { code: 'BROKER_UNAVAILABLE', detail: '증권사 장애' }), '불러오지 못했습니다.'],
    ['엔진 재시작 503', new ApiError(503, { code: 'ENGINE_RESTARTING', detail: '매매 서버를 재시작하는 중입니다.' }), '매매 서버를 재시작하는 중입니다.'],
    ['500', new ApiError(500, null), '불러오지 못했습니다.'],
  ])('%s 실패의 문구', (_name, error, expected) => {
    render(<SectionError message="불러오지 못했습니다." error={error} />)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('조회 실패 문구는 상태 오류 색이다', () => {
    render(<SectionError message="불러오지 못했습니다." />)
    expect(screen.getByText('불러오지 못했습니다.')).toHaveClass('text-status-error')
  })

  it('재시작 안내는 실패 색이 아니다', () => {
    render(<SectionError message="불러오지 못했습니다." error={new ApiError(503, null)} />)
    expect(screen.getByText(SERVER_RESTART_MESSAGE)).not.toHaveClass('text-status-error')
  })

  it('refetches failed active queries when retry is clicked', async () => {
    const queryFn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('ok')
    render(
      <QueryClientProvider client={new QueryClient()}>
        <FailingSection queryFn={queryFn} />
      </QueryClientProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }))

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())
    expect(queryFn).toHaveBeenCalledTimes(2)
  })

  it('hides the retry button outside a QueryClientProvider', () => {
    render(<SectionError message="불러오지 못했습니다." />)

    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
  })

  it('refreshes the server tree when serverRetry is set', () => {
    render(<SectionError message="불러오지 못했습니다." serverRetry />)

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(refresh).toHaveBeenCalledTimes(1)
  })
})

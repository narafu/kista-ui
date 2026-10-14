import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { SectionError } from './SectionError'

function FailingSection({ queryFn }: { queryFn: () => Promise<string> }) {
  const { data, isError } = useQuery({ queryKey: ['section'], queryFn, retry: false })
  if (isError) return <SectionError message="불러오지 못했습니다" />
  return <p>{data ?? 'loading'}</p>
}

describe('SectionError', () => {
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
    render(<SectionError message="불러오지 못했습니다" />)

    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
  })
})

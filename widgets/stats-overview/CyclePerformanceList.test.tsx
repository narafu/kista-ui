import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CyclePerformanceList } from './CyclePerformanceList'

const useStatsCyclesQueryMock = vi.fn()

vi.mock('@entities/stats', () => ({
  useStatsCyclesQuery: () => useStatsCyclesQueryMock(),
}))

describe('CyclePerformanceList', () => {
  it('shows an error fallback instead of treating a failed request as empty cycle performance', () => {
    useStatsCyclesQueryMock.mockReturnValue({
      cycles: [],
      isLoading: false,
      isError: true,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })

    render(<CyclePerformanceList />)

    expect(screen.getByText('사이클 성과를 불러오지 못했습니다')).toBeInTheDocument()
    expect(screen.queryByText('사이클 내역이 없습니다.')).not.toBeInTheDocument()
  })
})

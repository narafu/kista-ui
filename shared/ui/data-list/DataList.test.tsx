import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataList, useDataListSort, type DataListColumn } from './DataList'

interface Row { id: string; name: string; day: string; value: number | null }

const columns: DataListColumn<Row>[] = [
  { key: 'name', header: '이름', cell: (r) => r.name, mobile: 'title', sortBy: (r) => r.name },
  { key: 'state', header: '상태', cell: () => '정상', mobile: 'badge' },
  { key: 'value', header: '값', cell: (r) => r.value ?? '-', numeric: true, sortBy: (r) => r.value },
  { key: 'pcOnly', header: 'PC전용', cell: () => 'pc', mobile: 'hidden' },
]

const rows: Row[] = [
  { id: '1', name: '나', day: '07-01', value: 2 },
  { id: '2', name: '가', day: '07-01', value: null },
  { id: '3', name: '다', day: '06-30', value: 3 },
]

const base = { label: '목록', columns, rowKey: (r: Row) => r.id, errorMessage: '실패했습니다.', empty: '없습니다.' }

function Sorted() {
  const sort = useDataListSort(rows, columns)
  return <DataList {...base} rows={sort.rows} sort={sort.control} />
}

const bodyNames = () => within(screen.getByRole('table')).getAllByRole('row').slice(1).map((r) => r.querySelector('td')?.textContent)

describe('DataList', () => {
  it('로딩, 실패, 빈 상태 순으로 판정한다', () => {
    const { rerender } = render(<DataList {...base} rows={[]} isLoading isError />)
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
    rerender(<DataList {...base} rows={[]} isError />)
    expect(screen.getByText('실패했습니다.')).toBeInTheDocument()
    rerender(<DataList {...base} rows={[]} />)
    expect(screen.getByText('없습니다.')).toBeInTheDocument()
  })

  it('초기에는 응답 순서를 유지하고, 값 없는 행은 방향과 무관하게 맨 아래에 둔다', async () => {
    const user = userEvent.setup()
    render(<Sorted />)
    expect(bodyNames()).toEqual(['나', '가', '다'])

    const valueSort = within(screen.getByRole('columnheader', { name: '값' })).getByRole('button')
    await user.click(valueSort)
    expect(bodyNames()).toEqual(['다', '나', '가'])
    await user.click(valueSort)
    expect(bodyNames()).toEqual(['나', '다', '가'])
  })

  it('문자열은 한국어 순서로 정렬한다', async () => {
    const user = userEvent.setup()
    render(<Sorted />)
    const nameSort = within(screen.getByRole('columnheader', { name: '이름' })).getByRole('button')
    await user.click(nameSort)
    await user.click(nameSort)
    expect(bodyNames()).toEqual(['가', '나', '다'])
  })

  it('더 보기를 누르면 다음 페이지를 부르고, 실패 안내는 재조회 중에 숨긴다', async () => {
    const onLoadMore = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<DataList {...base} rows={rows} loadMore={{ hasMore: true, isError: true, onLoadMore }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('다음 내역을 불러오지 못했습니다.')
    await user.click(screen.getByRole('button', { name: '더 보기' }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)

    rerender(<DataList {...base} rows={rows} loadMore={{ hasMore: true, isError: true, isFetching: true, onLoadMore }} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '불러오는 중…' })).toBeDisabled()

    rerender(<DataList {...base} rows={rows} loadMore={{ hasMore: false, onLoadMore }} />)
    expect(screen.queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument()
  })

  it('날짜 그룹은 PC에서 rowSpan 행 헤더, 모바일에서 그룹 라벨로 그린다', () => {
    render(<DataList {...base} rows={rows} groupBy={{ header: '날짜', key: (r) => r.day }} />)
    expect(screen.getByRole('columnheader', { name: '날짜' })).toBeInTheDocument()
    expect(screen.getAllByRole('rowheader').map((c) => c.getAttribute('rowspan'))).toEqual(['2', '1'])
    expect(within(screen.getByRole('list', { name: '07-01' })).getAllByRole('listitem')).toHaveLength(2)
    expect(within(screen.getByRole('list', { name: '06-30' })).getAllByRole('listitem')).toHaveLength(1)
  })

  it('표 컨테이너는 키보드로 스크롤할 수 있는 region이다', () => {
    render(<DataList {...base} rows={rows} />)
    expect(screen.getByRole('region', { name: '목록 표' })).toHaveAttribute('tabindex', '0')
  })

  it('모바일 카드는 역할대로 그리고 hidden 항목을 뺀다', () => {
    render(<DataList {...base} rows={rows} />)
    const [shown] = within(screen.getByRole('list', { name: '목록' })).getAllByRole('listitem')

    expect(within(shown).getByText('나')).toBeInTheDocument()
    expect(within(shown).getByText('정상')).toBeInTheDocument()
    expect(within(shown).queryByText('이름')).not.toBeInTheDocument()
    expect(within(shown).queryByText('상태')).not.toBeInTheDocument()
    expect(within(shown).getByText('값')).toBeInTheDocument()
    expect(within(shown).queryByText('PC전용')).not.toBeInTheDocument()
  })

  it('titleBadge는 모바일 제목만 배지로 그리고 PC 셀은 그대로 둔다', () => {
    const badgeColumns: DataListColumn<Row>[] = [{ ...columns[0], mobile: 'titleBadge' }, columns[2]]
    render(<DataList {...base} columns={badgeColumns} rows={[rows[0]]} />)

    const mobile = within(screen.getByRole('list', { name: '목록' })).getByText('나')
    const desktop = within(screen.getByRole('table')).getByText('나')
    expect(mobile).toHaveClass('font-bold')
    expect(desktop).not.toHaveClass('font-bold')
  })

  it('날짜 그룹 카드는 라벨과 값을 한 줄에 두고 값을 굵게 그린다', () => {
    // PC용 굵기를 준 컬럼도 카드에서는 같은 굵기로 보인다
    const weighted = columns.map((c) => (c.key === 'value' ? { ...c, className: 'font-medium' } : c))
    render(<DataList {...base} columns={weighted} rows={[rows[0]]} groupBy={{ header: '날짜', key: (r) => r.day }} />)

    const value = within(screen.getByRole('list', { name: '07-01' })).getByText('2')
    expect(value).toHaveClass('font-semibold')
    expect(value.parentElement).toHaveClass('flex')
  })
})

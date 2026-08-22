import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetRecordList } from './AssetRecordList'
import type { AssetSnapshot } from '@entities/finance'

const { useAssetSnapshotsQueryMock, useFinanceCategoriesQueryMock, deleteManyMutateMock, shareMutateMock, unshareMutateMock } = vi.hoisted(() => ({
  useAssetSnapshotsQueryMock: vi.fn(),
  useFinanceCategoriesQueryMock: vi.fn(() => ({ data: [] })),
  deleteManyMutateMock: vi.fn(),
  shareMutateMock: vi.fn(),
  unshareMutateMock: vi.fn(),
}))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useAssetSnapshotsQuery: useAssetSnapshotsQueryMock,
    useFinanceCategoriesQuery: useFinanceCategoriesQueryMock,
    useDeleteManyAssetSnapshotsMutation: () => ({ mutate: deleteManyMutateMock, isPending: false }),
    useShareAssetSnapshotMutation: () => ({ mutate: shareMutateMock, isPending: false }),
    useUnshareAssetSnapshotMutation: () => ({ mutate: unshareMutateMock, isPending: false }),
    useCanShareToGroup: () => false,
  }
})

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: { assetClasses: [{ code: 'EQUITY', label: '미국주식' }], markets: [{ code: 'GLOBAL', label: '해외' }] },
    labelOf: (_category: string, code: string) => ({ EQUITY: '미국주식', GLOBAL: '해외' } as Record<string, string>)[code] ?? code,
  }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const { toastSuccessMock, toastWarningMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastWarningMock: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { success: toastSuccessMock, warning: toastWarningMock, error: vi.fn() } }))

const SYSTEM_INVESTMENT_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000403'

function snapshot(overrides: Partial<AssetSnapshot>): AssetSnapshot {
  return {
    id: 'a1',
    categoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
    rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
    categoryName: '투자',
    accountName: '미래에셋증권',
    entryDate: '2026-08-01',
    assetClass: 'EQUITY',
    market: 'GLOBAL',
    amount: 1_000_000,
    ...overrides,
  }
}

describe('AssetRecordList', () => {
  beforeEach(() => {
    deleteManyMutateMock.mockClear()
    toastSuccessMock.mockClear()
    toastWarningMock.mockClear()
  })

  it('로딩 중에는 로딩 문구를 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<AssetRecordList />)
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('조회 실패 시 에러 섹션을 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<AssetRecordList />)
    expect(screen.getByText('자산 기록을 불러오지 못했습니다')).toBeInTheDocument()
  })

  it('기록이 없으면 빈 상태를 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<AssetRecordList />)
    expect(screen.getByText(/등록된 자산 기록이 없습니다/)).toBeInTheDocument()
  })

  it('금액과 카테고리를 포맷팅해 표시하고 수정·복제 링크를 연결한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: [snapshot({})], isLoading: false, isError: false })
    render(<AssetRecordList />)

    expect(screen.getAllByText('1,000,000원').length).toBeGreaterThan(0)
    expect(screen.getAllByText('투자').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: '수정' })[0]).toHaveAttribute('href', '/finance/a1/edit')
    expect(screen.getAllByRole('link', { name: '복제' })[0]).toHaveAttribute('href', '/finance/new?duplicateFrom=a1')
  })

  it('컬럼 순서(기준일·카테고리·자산군·시장·운용전략·계좌·금액)대로 값을 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [snapshot({ categoryName: '일반계좌', assetClass: 'EQUITY', market: 'GLOBAL', strategy: 'VR', accountName: '미래에셋증권' })],
      isLoading: false,
      isError: false,
    })
    render(<AssetRecordList />)

    const desktopTable = screen.getByRole('table', { name: '자산 기록' })
    const dataRow = within(desktopTable).getAllByRole('row')[1]
    const cellTexts = within(dataRow).getAllByRole('cell').map((cell) => cell.textContent)

    // [체크박스, 기준일, 카테고리, 자산군, 시장, 운용전략, 계좌, 금액, 작업]
    expect(cellTexts[2]).toBe('일반계좌')
    expect(cellTexts[3]).toBe('미국주식')
    expect(cellTexts[4]).toBe('해외')
    expect(cellTexts[5]).toBe('VR')
    expect(cellTexts[6]).toBe('미래에셋증권')
  })

  it('운용전략·계좌가 없으면 해당 컬럼에 — 로 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [snapshot({ strategy: undefined, accountName: undefined })],
      isLoading: false,
      isError: false,
    })
    render(<AssetRecordList />)

    const desktopTable = screen.getByRole('table', { name: '자산 기록' })
    const dataRow = within(desktopTable).getAllByRole('row')[1]
    const cellTexts = within(dataRow).getAllByRole('cell').map((cell) => cell.textContent)

    expect(cellTexts[5]).toBe('—')
    expect(cellTexts[6]).toBe('—')
  })

  it('작업 버튼은 복제·수정·삭제 순서로 배치된다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: [snapshot({})], isLoading: false, isError: false })
    render(<AssetRecordList />)

    const desktopTable = screen.getByRole('table', { name: '자산 기록' })
    const dataRow = within(desktopTable).getAllByRole('row')[1]
    const actionCell = within(dataRow).getAllByRole('cell').at(-1) as HTMLElement
    const labels = within(actionCell).getAllByRole('link').map((el) => el.textContent)
      .concat(within(actionCell).getAllByRole('button').map((el) => el.textContent))

    expect(labels).toEqual(['복제', '수정', '삭제'])
  })

  it('행을 선택하면 선택 삭제 바가 나타나고, 확인 시 선택 id로 삭제 mutation을 호출한다', async () => {
    const user = userEvent.setup()
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [snapshot({ id: 'a1' }), snapshot({ id: 'a2', categoryName: '정기예금' })],
      isLoading: false,
      isError: false,
    })
    render(<AssetRecordList />)

    const desktopTable = screen.getByRole('table', { name: '자산 기록' })
    const rowCheckboxes = within(desktopTable).getAllByRole('checkbox').filter((el) => el.getAttribute('aria-label')?.includes('선택'))
    // 첫 번째는 헤더(전체 선택) 체크박스이므로 두 번째부터가 실제 행
    await user.click(rowCheckboxes[1])

    expect(screen.getByText('1건 선택됨')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '선택 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제' }))

    expect(deleteManyMutateMock).toHaveBeenCalledWith(['a1'], expect.objectContaining({ onSuccess: expect.any(Function) }))
  })

  it('행 단위 삭제 버튼은 해당 id 하나만으로 삭제 mutation을 호출한다', async () => {
    const user = userEvent.setup()
    useAssetSnapshotsQueryMock.mockReturnValue({ data: [snapshot({ id: 'a1' })], isLoading: false, isError: false })
    render(<AssetRecordList />)

    await user.click(screen.getAllByRole('button', { name: '삭제' })[0])
    await user.click(screen.getByRole('button', { name: '삭제' }))

    expect(deleteManyMutateMock).toHaveBeenCalledWith(['a1'], expect.objectContaining({ onSuccess: expect.any(Function) }))
  })

  it('기준일 헤더를 클릭하면 정렬 방향이 토글된다', async () => {
    const user = userEvent.setup()
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [
        snapshot({ id: 'a-old', entryDate: '2026-01-01', categoryName: '오래된기록' }),
        snapshot({ id: 'a-new', entryDate: '2026-08-01', categoryName: '최신기록' }),
      ],
      isLoading: false,
      isError: false,
    })
    render(<AssetRecordList />)

    const desktopTable = screen.getByRole('table', { name: '자산 기록' })
    const rows = () => within(desktopTable).getAllByRole('row').slice(1)

    // 기본 정렬: 기준일 내림차순(최신 먼저)
    expect(within(rows()[0]).getByText('최신기록')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /기준일/ }))

    expect(within(rows()[0]).getByText('오래된기록')).toBeInTheDocument()
  })

  it('전체 성공 시 성공 toast를 띄우고 선택을 비운다 — 전체 실패(succeededIds 빈 배열)는 건드리지 않는다', async () => {
    const user = userEvent.setup()
    useAssetSnapshotsQueryMock.mockReturnValue({ data: [snapshot({ id: 'a1' })], isLoading: false, isError: false })
    render(<AssetRecordList />)

    await user.click(screen.getAllByRole('button', { name: '삭제' })[0])
    await user.click(screen.getByRole('button', { name: '삭제' }))

    const onSuccess = deleteManyMutateMock.mock.calls.at(-1)?.[1]?.onSuccess as (result: { succeededIds: string[]; failedCount: number }) => void
    act(() => onSuccess({ succeededIds: ['a1'], failedCount: 0 }))

    expect(toastSuccessMock).toHaveBeenCalledWith('자산 기록을 삭제했습니다')
    expect(screen.queryByText(/선택됨/)).not.toBeInTheDocument()
  })

  it('부분 실패 시 성공·실패 건수를 함께 안내한다', async () => {
    const user = userEvent.setup()
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [snapshot({ id: 'a1' }), snapshot({ id: 'a2', categoryName: '정기예금' })],
      isLoading: false,
      isError: false,
    })
    render(<AssetRecordList />)

    const desktopTable = screen.getByRole('table', { name: '자산 기록' })
    const rowCheckboxes = within(desktopTable).getAllByRole('checkbox').filter((el) => el.getAttribute('aria-label')?.includes('선택'))
    await user.click(rowCheckboxes[1])
    await user.click(rowCheckboxes[2])
    await user.click(screen.getByRole('button', { name: '선택 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제' }))

    const onSuccess = deleteManyMutateMock.mock.calls.at(-1)?.[1]?.onSuccess as (result: { succeededIds: string[]; failedCount: number }) => void
    act(() => onSuccess({ succeededIds: ['a1'], failedCount: 1 }))

    expect(toastWarningMock).toHaveBeenCalledWith('1건 삭제, 1건 실패')
  })
})

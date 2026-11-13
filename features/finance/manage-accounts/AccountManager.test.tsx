import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountManager } from './AccountManager'
import type { FinanceAccount } from '@entities/finance'

const {
  createMutateMock,
  updateMutateMock,
  deleteMutateMock,
  shareMutateMock,
  unshareMutateMock,
  canShareState,
} = vi.hoisted(() => ({
  createMutateMock: vi.fn(),
  updateMutateMock: vi.fn(),
  deleteMutateMock: vi.fn(),
  shareMutateMock: vi.fn(),
  unshareMutateMock: vi.fn(),
  canShareState: { value: true },
}))

const accounts: FinanceAccount[] = [
  { id: 'acc-3', accountType: 'SECURITIES', name: '삼성증권' },
  { id: 'acc-1', accountType: 'SECURITIES', name: '미래에셋증권', institution: '미래에셋', accountNo: '1234567890', owner: '홍길동', memo: '주 계좌' },
  { id: 'acc-2', accountType: 'BANK', name: '국민은행', groupId: 'group-1' },
]

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceAccountsQuery: () => ({ data: accounts }),
    useCreateFinanceAccountMutation: () => ({ mutate: createMutateMock, isPending: false }),
    useUpdateFinanceAccountMutation: () => ({ mutate: updateMutateMock, isPending: false }),
    useDeleteFinanceAccountMutation: () => ({ mutate: deleteMutateMock, isPending: false }),
    useCanShareToGroup: () => canShareState.value,
    useShareFinanceAccountMutation: () => ({ mutate: shareMutateMock, isPending: false }),
    useUnshareFinanceAccountMutation: () => ({ mutate: unshareMutateMock, isPending: false }),
  }
})

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      financeAccountTypes: [
        { code: 'SECURITIES', label: '증권사' },
        { code: 'BANK', label: '은행' },
        { code: 'INSURANCE', label: '보험' },
        { code: 'EXCHANGE', label: '거래소' },
      ],
    },
  }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

function rowOf(name: string): HTMLElement {
  return screen.getByText(name).closest('li') as HTMLElement
}

function ariaLabelsOf(row: HTMLElement): (string | null)[] {
  return Array.from(row.querySelectorAll('[aria-label]')).map((el) => el.getAttribute('aria-label'))
}

describe('AccountManager', () => {
  beforeEach(() => {
    createMutateMock.mockClear()
    updateMutateMock.mockClear()
    deleteMutateMock.mockClear()
    shareMutateMock.mockClear()
    unshareMutateMock.mockClear()
    canShareState.value = true
  })

  it('계좌 목록을 유형·이름과 함께 렌더한다', () => {
    render(<AccountManager />)

    expect(screen.getByText('미래에셋증권')).toBeInTheDocument()
    expect(screen.getAllByText('증권사').length).toBeGreaterThan(0)
    expect(screen.getByText('국민은행')).toBeInTheDocument()
    expect(screen.getByText('은행')).toBeInTheDocument()
  })

  it('그룹 소유 계좌에만 공유 배지를 붙인다(그룹 미소속이어도 groupId 기준)', () => {
    canShareState.value = false
    render(<AccountManager />)

    expect(within(screen.getByText('국민은행').closest('li') as HTMLElement).getByText('공유')).toBeInTheDocument()
    expect(within(screen.getByText('삼성증권').closest('li') as HTMLElement).queryByText('공유')).not.toBeInTheDocument()
  })

  it('계좌번호를 뒷자리만 남기고 마스킹해 보여준다', () => {
    render(<AccountManager />)

    expect(screen.getByText('••••7890')).toBeInTheDocument()
    expect(screen.queryByText('1234567890')).not.toBeInTheDocument()
  })

  it('기관·소유자를 계좌번호·메모와 함께 부가정보 줄에 보여준다', () => {
    render(<AccountManager />)

    const details = screen.getByText('••••7890').parentElement as HTMLElement
    expect(details).toHaveTextContent('미래에셋 · ••••7890 · 홍길동 · 주 계좌')
  })

  it('삭제 버튼을 누르면 확인 다이얼로그가 뜬다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    await user.click(within(rowOf('미래에셋증권')).getByRole('button', { name: '삭제' }))

    expect(screen.getByText('미래에셋증권 계좌를 삭제하시겠습니까?')).toBeInTheDocument()
    expect(
      screen.getByText('이 계좌를 사용한 자산 기록이 있으면 삭제할 수 없습니다. 먼저 해당 기록의 계좌 매핑을 해제해주세요.')
    ).toBeInTheDocument()
  })

  it('그룹 소속이면 개인 소유 계좌엔 공유→수정→삭제, 그룹 소유 계좌엔 귀속→수정→삭제 순서로 버튼을 배치한다', () => {
    render(<AccountManager />)

    expect(ariaLabelsOf(rowOf('미래에셋증권'))).toEqual(['공유', '수정', '삭제'])
    expect(ariaLabelsOf(rowOf('국민은행'))).toEqual(['귀속', '수정', '삭제'])
  })

  it('그룹 미소속이면 공유·귀속 버튼이 노출되지 않는다', () => {
    canShareState.value = false
    render(<AccountManager />)

    expect(ariaLabelsOf(rowOf('미래에셋증권'))).toEqual(['수정', '삭제'])
  })

  it('공유 버튼을 누르면 해당 계좌 id로 공유 mutation을 호출한다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    await user.click(within(rowOf('미래에셋증권')).getByRole('button', { name: '공유' }))

    expect(shareMutateMock).toHaveBeenCalledWith('acc-1', expect.anything())
  })

  it('귀속 버튼을 누르면 해당 계좌 id로 귀속 mutation을 호출한다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    await user.click(within(rowOf('국민은행')).getByRole('button', { name: '귀속' }))

    expect(unshareMutateMock).toHaveBeenCalledWith('acc-2', expect.anything())
  })

  it('계좌 유형 필터를 적용하면 목록이 좁혀진다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    await user.click(screen.getByRole('combobox', { name: '계좌 유형 필터' }))
    await user.click(await screen.findByRole('option', { name: '은행' }))

    expect(screen.getByText('국민은행')).toBeInTheDocument()
    expect(screen.queryByText('미래에셋증권')).not.toBeInTheDocument()
    expect(screen.queryByText('삼성증권')).not.toBeInTheDocument()
  })

  it('이름순 정렬을 적용하면 유형 그룹 내부 순서가 가나다순으로 바뀐다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    // 유형별로 묶여 표시된다(meta.financeAccountTypes 순서: 증권사 -> 은행) — 기본(등록순)은
    // 그룹 내부에서 서버 응답 순서(삼성증권 -> 미래에셋증권) 그대로.
    const namesInOrder = () => screen.getAllByRole('listitem').map((li) => (li.textContent?.includes('국민은행')
      ? '국민은행'
      : li.textContent?.includes('미래에셋증권')
        ? '미래에셋증권'
        : '삼성증권'))
    expect(namesInOrder()).toEqual(['삼성증권', '미래에셋증권', '국민은행'])

    await user.click(screen.getByRole('combobox', { name: '정렬 기준' }))
    await user.click(await screen.findByRole('option', { name: '이름순' }))

    // 증권사 그룹 내부가 가나다순(미래에셋 -> 삼성)으로 바뀌고, 은행 그룹은 여전히 뒤에 온다.
    expect(namesInOrder()).toEqual(['미래에셋증권', '삼성증권', '국민은행'])
  })
})

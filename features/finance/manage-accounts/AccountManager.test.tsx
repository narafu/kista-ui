import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountManager } from './AccountManager'
import { AccountFormDialog } from './AccountFormDialog'
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
  { id: 'acc-1', accountType: 'SECURITIES', name: '미래에셋증권', accountNo: '1234567890', memo: '주 계좌' },
  { id: 'acc-2', accountType: 'BANK', name: '국민은행', groupId: 'group-1' },
  { id: 'acc-3', accountType: 'SECURITIES', name: '삼성증권' },
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

  it('계좌번호를 뒷자리만 남기고 마스킹해 보여준다', () => {
    render(<AccountManager />)

    expect(screen.getByText('••••7890')).toBeInTheDocument()
    expect(screen.queryByText('1234567890')).not.toBeInTheDocument()
  })

  it('삭제 버튼을 누르면 확인 다이얼로그가 뜬다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    await user.click(within(rowOf('미래에셋증권')).getByRole('button', { name: '삭제' }))

    expect(screen.getByText('미래에셋증권 계좌를 삭제하시겠습니까?')).toBeInTheDocument()
    expect(screen.getByText('이 계좌를 사용한 자산 기록은 계좌 미지정 상태로 남습니다.')).toBeInTheDocument()
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

    expect(shareMutateMock).toHaveBeenCalledWith('acc-1')
  })

  it('귀속 버튼을 누르면 해당 계좌 id로 귀속 mutation을 호출한다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    await user.click(within(rowOf('국민은행')).getByRole('button', { name: '귀속' }))

    expect(unshareMutateMock).toHaveBeenCalledWith('acc-2')
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

  it('이름순 정렬을 적용하면 목록 순서가 가나다순으로 바뀐다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    // 기본(등록순)은 서버 응답 순서 그대로: 미래에셋증권, 국민은행, 삼성증권
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)[0]).toContain('미래에셋증권')

    await user.click(screen.getByRole('combobox', { name: '정렬 기준' }))
    await user.click(await screen.findByRole('option', { name: '이름순' }))

    const namesInOrder = screen.getAllByRole('listitem').map((li) => (li.textContent?.includes('국민은행')
      ? '국민은행'
      : li.textContent?.includes('미래에셋증권')
        ? '미래에셋증권'
        : '삼성증권'))
    expect(namesInOrder).toEqual(['국민은행', '미래에셋증권', '삼성증권'])
  })

  it('생성 모드는 그룹 소속일 때 기본 켜짐 상태의 "그룹으로 저장" 스위치를 보여준다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    await user.click(screen.getByRole('button', { name: '계좌 추가' }))

    expect(screen.getByRole('switch', { name: '그룹으로 저장' })).toBeChecked()
  })

  it('"그룹으로 저장" 스위치가 켜진 채 제출하면 shareToGroup: true로 생성 mutation을 호출한다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    await user.click(screen.getByRole('button', { name: '계좌 추가' }))
    await user.type(screen.getByLabelText('계좌 이름'), '새 계좌')
    await user.click(screen.getAllByRole('button', { name: '저장' })[0])

    expect(createMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: '새 계좌', shareToGroup: true }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('"그룹으로 저장" 스위치를 끄고 제출하면 shareToGroup: false로 생성 mutation을 호출한다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    await user.click(screen.getByRole('button', { name: '계좌 추가' }))
    await user.type(screen.getByLabelText('계좌 이름'), '새 계좌')
    await user.click(screen.getByRole('switch', { name: '그룹으로 저장' }))
    await user.click(screen.getAllByRole('button', { name: '저장' })[0])

    expect(createMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: '새 계좌', shareToGroup: false }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('그룹 미소속이면 생성 모드에도 "그룹으로 저장" 스위치가 없다', async () => {
    canShareState.value = false
    const user = userEvent.setup()
    render(<AccountManager />)

    await user.click(screen.getByRole('button', { name: '계좌 추가' }))

    expect(screen.queryByRole('switch', { name: '그룹으로 저장' })).not.toBeInTheDocument()
  })

  it('계좌번호 입력은 숫자 외 문자를 제거한다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    await user.click(screen.getByRole('button', { name: '계좌 추가' }))
    const accountNoInput = screen.getByLabelText('계좌번호 (선택)')
    await user.type(accountNoInput, '12ab-34')

    expect(accountNoInput).toHaveValue('1234')
  })

  it('수정 모드는 마이그레이션되지 않은 legacy accountNo(비숫자 포함)를 초기값부터 정규화해 다른 필드만 바꿔도 숫자만 제출한다', async () => {
    const user = userEvent.setup()
    const legacyAccount: FinanceAccount = { id: 'acc-legacy', accountType: 'BANK', name: '하나은행', accountNo: '123-456-789' }
    render(<AccountFormDialog open onOpenChange={() => {}} account={legacyAccount} />)

    // accountNo 필드는 건드리지 않고 이름만 바꿔 제출한다 — 초기 state부터 숫자만 정규화돼 있어야
    // 서버의 accountNo 숫자 전용 검증(신규/수정 요청 강제)에 걸리지 않는다. clear()로 비웠다가
    // 다시 채우면 그 사이 canSubmit=false(저장 버튼 disabled)인 구간이 생겨 click이 그 타이밍에
    // 걸리면 핸들러가 호출되지 않는 flaky 실패가 났다 — append로 바꿔 이름이 비는 구간 자체를 없앤다.
    const nameInput = screen.getByLabelText('계좌 이름')
    await user.type(nameInput, ' 변경')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(updateMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ accountNo: '123456789' }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })
})

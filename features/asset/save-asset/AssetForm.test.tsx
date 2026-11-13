import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { todayKst } from '@shared/lib/format'
import { mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { AssetForm } from './AssetForm'
import { SYSTEM_INVESTMENT_CATEGORY_ID, SYSTEM_SAVINGS_CATEGORY_ID } from '@entities/finance'
import type { AssetSnapshot, FinanceAccount, FinanceCategory, MonthlyClosing } from '@entities/finance'

const categories: FinanceCategory[] = [
  {
    id: SYSTEM_SAVINGS_CATEGORY_ID,
    type: 'ASSET',
    name: '예적금',
    sortOrder: 10,
    system: true,
    children: [],
  },
  {
    id: SYSTEM_INVESTMENT_CATEGORY_ID,
    type: 'ASSET',
    name: '투자',
    sortOrder: 30,
    system: true,
    children: [{
      id: 'cat-l2-general',
      parentId: SYSTEM_INVESTMENT_CATEGORY_ID,
      groupId: 'group-1',
      type: 'ASSET',
      name: '일반계좌',
      sortOrder: 10,
      system: false,
      children: [],
    }],
  },
]

const accounts: FinanceAccount[] = [{ id: 'acc-1', accountType: 'SECURITIES', name: '미래에셋증권', institution: '미래에셋', owner: '홍길동', memo: '주거래' }]

const onSuccess = vi.fn()
const onCancel = vi.fn()

interface SetupOptions { closings?: MonthlyClosing[]; groups?: { id: string }[]; handlers?: Parameters<typeof mockApi>[0] }

function setup({ closings = [], groups = [], handlers = {} }: SetupOptions = {}) {
  return mockApi({
    'GET /api/finance/categories': categories,
    'GET /api/finance/accounts': accounts as never,
    'GET /api/finance/monthly-closings': closings as never,
    'GET /api/finance/asset-snapshots': [] as never,
    'GET /api/finance/groups': groups as never,
    'GET /api/auth/me': {} as never,
    ...handlers,
  })
}

function renderForm(mode: 'create' | 'edit' | 'duplicate', initial?: AssetSnapshot) {
  return renderApp(<AssetForm mode={mode} initial={initial} onSuccess={onSuccess} onCancel={onCancel} />)
}

const existing: AssetSnapshot = {
  id: 'snap-1',
  categoryId: 'cat-l2-general',
  rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
  categoryName: '일반계좌',
  accountId: 'acc-1',
  accountName: '미래에셋증권',
  entryDate: '2026-08-01',
  assetClass: 'EQUITY',
  market: 'GLOBAL',
  strategy: 'VR',
  memo: '해외ETF 적립',
  amount: 1_000_000,
}

const memoLabel = /^메모( \(선택\))?$/
const accountLabel = /^계좌( \(선택\))?$/
const strategyLabel = /^운용전략( \(선택\))?$/

async function pick(user: ReturnType<typeof userEvent.setup>, combobox: string, option: string) {
  await user.click(await screen.findByRole('combobox', { name: combobox }))
  await user.click(await screen.findByRole('option', { name: option }))
}

// 카테고리 쿼리는 비동기로 도착한다 — 수정·복제 폼은 경로가 복원돼 제출이 열릴 때까지 기다린다
async function submitButton(name: string) {
  const button = screen.getAllByRole('button', { name })[0]
  await waitFor(() => expect(button).toBeEnabled())
  return button
}

describe('AssetForm', () => {
  beforeEach(() => {
    onSuccess.mockClear()
    onCancel.mockClear()
  })

  it('금액을 천단위 콤마로 표시한다', async () => {
    setup()
    renderForm('create')

    await userEvent.type(screen.getByLabelText('금액'), '1234567')

    expect(screen.getByLabelText('금액')).toHaveValue('1,234,567')
  })

  it('create 모드는 카테고리 미선택 상태로 시작해 제출 버튼이 비활성화된다', async () => {
    setup()
    renderForm('create')

    await userEvent.type(screen.getByLabelText('금액'), '1000')

    // 기준일은 오늘 날짜로 기본 채워지지만 카테고리를 아직 선택하지 않았다
    expect(screen.getAllByRole('button', { name: '등록' })[0]).toBeDisabled()
  })

  it('등록: 그룹 소속이면 "그룹으로 저장"이 기본 켜져 shareToGroup=true로 POST한다', async () => {
    const { requests } = setup({ groups: [{ id: 'g1' }], handlers: { 'POST /api/finance/asset-snapshots': existing as never } })
    const user = userEvent.setup()
    renderForm('create')

    await pick(user, '카테고리', '예적금')
    await user.type(screen.getByLabelText('금액'), '5000')
    await user.click(await submitButton('등록'))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    const posts = requests.filter((r) => r.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0].query.get('shareToGroup')).toBe('true')
    expect(posts[0].body).toEqual({ categoryId: SYSTEM_SAVINGS_CATEGORY_ID, entryDate: todayKst(), assetClass: 'CASH', market: 'DOMESTIC', amount: 5000 })
    expect(toast.success).toHaveBeenCalledWith('자산 기록이 등록되었습니다')
  })

  it('등록: 그룹 스위치를 끄면 shareToGroup 쿼리 없이 POST한다', async () => {
    const { requests } = setup({ groups: [{ id: 'g1' }], handlers: { 'POST /api/finance/asset-snapshots': existing as never } })
    const user = userEvent.setup()
    renderForm('create')

    await pick(user, '카테고리', '예적금')
    await user.type(screen.getByLabelText('금액'), '5000')
    await user.click(await screen.findByRole('switch', { name: '그룹으로 저장' }))
    await user.click(await submitButton('등록'))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(requests.find((r) => r.method === 'POST')?.query.has('shareToGroup')).toBe(false)
  })

  it('그룹에 속하지 않으면 "그룹으로 저장" 스위치가 없고 쿼리도 없다', async () => {
    const { requests } = setup({ handlers: { 'POST /api/finance/asset-snapshots': existing as never } })
    const user = userEvent.setup()
    renderForm('create')

    await pick(user, '카테고리', '예적금')
    await user.type(screen.getByLabelText('금액'), '5000')
    expect(screen.queryByRole('switch', { name: '그룹으로 저장' })).not.toBeInTheDocument()
    await user.click(await submitButton('등록'))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(requests.find((r) => r.method === 'POST')?.query.has('shareToGroup')).toBe(false)
  })

  it('edit 모드에서는 초기값을 채우고 PUT으로 수정한다(그룹 스위치·shareToGroup 없음)', async () => {
    const { requests } = setup({ groups: [{ id: 'g1' }], handlers: { 'PUT /api/finance/asset-snapshots/{id}': existing as never } })
    const user = userEvent.setup()
    renderForm('edit', existing)

    expect(screen.getByLabelText('기준일')).toHaveValue('2026-08-01')
    expect(screen.getByLabelText('금액')).toHaveValue('1,000,000')
    expect(screen.queryByRole('switch', { name: '그룹으로 저장' })).not.toBeInTheDocument()

    await user.click(await submitButton('수정'))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    const puts = requests.filter((r) => r.method === 'PUT')
    expect(puts).toHaveLength(1)
    expect(puts[0].path).toBe('/api/finance/asset-snapshots/snap-1')
    expect(puts[0].query.has('shareToGroup')).toBe(false)
    expect(puts[0].body).toEqual({
      categoryId: 'cat-l2-general', accountId: 'acc-1', entryDate: '2026-08-01', assetClass: 'EQUITY', market: 'GLOBAL',
      strategy: 'VR', memo: '해외ETF 적립', amount: 1_000_000,
    })
    expect(requests.some((r) => r.method === 'POST')).toBe(false)
    expect(toast.success).toHaveBeenCalledWith('자산 기록이 수정되었습니다')
  })

  it('메모 입력 필드는 카테고리 선택 여부와 무관하게 항상 노출된다', () => {
    setup()
    renderForm('create')
    expect(screen.getByLabelText(memoLabel)).toBeInTheDocument()
  })

  it('edit 모드에서는 메모 초기값을 채우고, 값을 바꾸면 PUT 바디에 반영한다', async () => {
    const { requests } = setup({ handlers: { 'PUT /api/finance/asset-snapshots/{id}': existing as never } })
    const user = userEvent.setup()
    renderForm('edit', existing)

    const memoInput = screen.getByLabelText(memoLabel)
    expect(memoInput).toHaveValue('해외ETF 적립')

    await user.clear(memoInput)
    await user.type(memoInput, '변경된 메모')
    await user.click(await submitButton('수정'))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(requests.find((r) => r.method === 'PUT')?.body).toMatchObject({ memo: '변경된 메모' })
  })

  it('계좌 Select 옵션 라벨은 계좌명 · 기관 · 소유자로 표시한다', async () => {
    setup()
    renderForm('create')

    await userEvent.click(screen.getByRole('combobox', { name: accountLabel }))

    expect(await screen.findByRole('option', { name: '미래에셋증권 · 미래에셋 · 홍길동' })).toBeInTheDocument()
  })

  it('기준일을 비우면 제출 버튼이 비활성화된다', async () => {
    setup()
    renderForm('edit', existing)

    await submitButton('수정')
    await userEvent.clear(screen.getByLabelText('기준일'))
    expect(screen.getAllByRole('button', { name: '수정' })[0]).toBeDisabled()
  })

  it('duplicate 모드는 금액을 포함한 초기값을 채우고, POST로 새로 등록한다', async () => {
    const { requests } = setup({ groups: [{ id: 'g1' }], handlers: { 'POST /api/finance/asset-snapshots': existing as never } })
    const user = userEvent.setup()
    renderForm('duplicate', existing)

    expect(screen.getByLabelText('금액')).toHaveValue('1,000,000')
    await user.click(await submitButton('복제 등록'))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(requests.some((r) => r.method === 'PUT')).toBe(false)
    const post = requests.find((r) => r.method === 'POST')
    expect(post?.query.get('shareToGroup')).toBe('true')
    expect(post?.body).toEqual({
      categoryId: 'cat-l2-general', accountId: 'acc-1', entryDate: '2026-08-01', assetClass: 'EQUITY', market: 'GLOBAL',
      strategy: 'VR', memo: '해외ETF 적립', amount: 1_000_000,
    })
    expect(toast.success).toHaveBeenCalledWith('자산 기록이 복제되었습니다')
  })

  it('카테고리 미선택 상태에서는 운용전략 입력을 숨긴다', () => {
    setup()
    renderForm('create')
    expect(screen.queryByLabelText(strategyLabel)).not.toBeInTheDocument()
  })

  it('투자 카테고리를 선택하면 운용전략 입력을 보여준다', async () => {
    setup()
    renderForm('create')

    await pick(userEvent.setup(), '카테고리', '투자')

    expect(screen.getByLabelText(strategyLabel)).toBeInTheDocument()
  })

  it('운용전략 자유 입력은 영문도 그대로 허용한다', async () => {
    setup()
    const user = userEvent.setup()
    renderForm('create')

    await pick(user, '카테고리', '투자')
    const strategyInput = screen.getByLabelText(strategyLabel)
    await user.type(strategyInput, 'VR메모')

    expect(strategyInput).toHaveValue('VR메모')
  })

  it('투자 카테고리 선택 후 다른 카테고리로 바꾸면 운용전략 입력이 사라지고 값도 리셋된다', async () => {
    setup()
    const user = userEvent.setup()
    renderForm('create')

    await pick(user, '카테고리', '투자')
    await user.type(screen.getByLabelText(strategyLabel), 'VR메모')

    await user.click(screen.getAllByRole('combobox', { name: '카테고리' })[0])
    await user.click(await screen.findByRole('option', { name: '예적금' }))

    expect(screen.queryByLabelText(strategyLabel)).not.toBeInTheDocument()

    // 다시 투자로 되돌리면 리셋된 빈 값으로 재노출된다(이전 입력이 실수로 남아있지 않음)
    await user.click(screen.getAllByRole('combobox', { name: '카테고리' })[0])
    await user.click(await screen.findByRole('option', { name: '투자' }))
    expect(screen.getByLabelText(strategyLabel)).toHaveValue('')
  })

  it('예적금을 고르면 자산군·시장 Select를 숨기고 CASH/DOMESTIC으로 보낸다', async () => {
    const { requests } = setup({ handlers: { 'POST /api/finance/asset-snapshots': existing as never } })
    const user = userEvent.setup()
    renderForm('create')

    expect(screen.getByRole('combobox', { name: '시장' })).toBeInTheDocument()
    await pick(user, '시장', '해외')
    await pick(user, '카테고리', '예적금')
    expect(screen.queryByRole('combobox', { name: '시장' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('금액'), '10')
    await user.click(await submitButton('등록'))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(requests.find((r) => r.method === 'POST')?.body).toMatchObject({ assetClass: 'CASH', market: 'DOMESTIC' })
  })

  it('기록 점검 완료된 달이면 저장 버튼 위에 잠김 안내를 표시하고 제출을 막는다', async () => {
    setup({ closings: [{ month: '2026-08', completed: true }] })
    renderForm('edit', existing)

    const notice = (await screen.findByText('기록 점검이 완료되어 잠겨 있습니다.')).closest('p') as HTMLElement
    expect(notice).toHaveTextContent('기록 점검이 완료되어 잠겨 있습니다. 자산 탭 기록 점검에서 완료를 해제하세요.')
    // 안내가 버튼 영역 바로 앞에 온다.
    const submit = screen.getByRole('button', { name: '수정' })
    expect(notice.nextElementSibling).toBe(submit.parentElement)
    expect(submit).toBeDisabled()
  })
})

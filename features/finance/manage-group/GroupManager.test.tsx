import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GroupManager } from './GroupManager'
import type { FinanceGroup, FinanceGroupMember } from '@entities/finance'

const { toastSuccessMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
}))

const sharedGroup: FinanceGroup = { id: 'group-shared' }
const me = { id: 'user-me' }

// 1인 1그룹 정책 — groups는 0개(개인) 또는 1개(그룹 소속)뿐이다.
let groups: FinanceGroup[] = [sharedGroup]
let members: FinanceGroupMember[] = []

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceGroupsQuery: () => ({ data: groups }),
    useActiveGroupId: () => sharedGroup.id,
    useSetActiveGroupId: () => vi.fn(),
    useFinanceGroupMembersQuery: () => ({ data: members }),
    useRemoveFinanceGroupMemberMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useCreateFinanceGroupInvitationMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useRespondToInvitationMutation: () => ({ mutate: vi.fn(), isPending: false }),
  }
})

vi.mock('@entities/user', async () => {
  const actual = await vi.importActual<typeof import('@entities/user')>('@entities/user')
  return { ...actual, useMeQuery: () => ({ data: me }) }
})

vi.mock('sonner', () => ({ toast: { success: toastSuccessMock, error: vi.fn() } }))

describe('GroupManager', () => {
  beforeEach(() => {
    toastSuccessMock.mockClear()
    groups = [sharedGroup]
  })

  it('OWNER에게는 초대코드 발급 버튼과 그룹 탈퇴 버튼을 모두 보여준다', () => {
    members = [
      { userId: me.id, role: 'OWNER' },
      { userId: 'user-other', role: 'MEMBER' },
    ]
    render(<GroupManager />)

    expect(screen.getByRole('button', { name: '초대코드 발급' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '그룹 탈퇴' })).toBeInTheDocument()
  })

  it('일반 멤버에게는 그룹 탈퇴 버튼을 보여주고 초대코드 발급 버튼은 숨긴다', () => {
    members = [
      { userId: 'user-owner', role: 'OWNER' },
      { userId: me.id, role: 'MEMBER' },
    ]
    render(<GroupManager />)

    expect(screen.getByRole('button', { name: '그룹 탈퇴' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '초대코드 발급' })).not.toBeInTheDocument()
  })

  it('무그룹(개인) 상태에서는 초대코드 발급 버튼만 보여주고 멤버/탈퇴 UI는 없다(그룹 생성의 유일한 경로)', () => {
    groups = []
    members = []
    render(<GroupManager />)

    expect(screen.getByRole('button', { name: '초대코드 발급' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '그룹 탈퇴' })).not.toBeInTheDocument()
  })

  it('멤버 목록에 nickname 미제공 시 userId 앞 8자와 role, 나 배지를 보여준다', () => {
    members = [
      { userId: me.id, role: 'OWNER' },
      { userId: 'user-other-uuid', role: 'MEMBER' },
    ]
    render(<GroupManager />)

    expect(screen.getByText(me.id.slice(0, 8))).toBeInTheDocument()
    expect(screen.getByText('나')).toBeInTheDocument()
    expect(screen.getByText('user-oth')).toBeInTheDocument()
  })
})

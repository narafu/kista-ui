import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GroupManager } from './GroupManager'
import type { FinanceGroup, FinanceGroupMember } from '@entities/finance'

const { respondMutateMock, toastSuccessMock } = vi.hoisted(() => ({
  respondMutateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

const personalGroup: FinanceGroup = { id: 'group-personal', name: '내 개인 그룹', personal: true }
const sharedGroup: FinanceGroup = { id: 'group-shared', name: '가족 재무', personal: false }
const me = { id: 'user-me' }

let groups: FinanceGroup[] = [personalGroup, sharedGroup]
let members: FinanceGroupMember[] = []
let activeGroupId: string | undefined = sharedGroup.id

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceGroupsQuery: () => ({ data: groups }),
    useActiveGroupId: () => activeGroupId,
    useSetActiveGroupId: () => vi.fn(),
    useFinanceGroupMembersQuery: () => ({ data: members }),
    useRemoveFinanceGroupMemberMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useCreateFinanceGroupInvitationMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useRespondToInvitationMutation: () => ({ mutate: respondMutateMock, isPending: false }),
  }
})

vi.mock('@entities/user', async () => {
  const actual = await vi.importActual<typeof import('@entities/user')>('@entities/user')
  return { ...actual, useMeQuery: () => ({ data: me }) }
})

vi.mock('sonner', () => ({ toast: { success: toastSuccessMock, error: vi.fn() } }))

describe('GroupManager', () => {
  beforeEach(() => {
    respondMutateMock.mockClear()
    toastSuccessMock.mockClear()
    groups = [personalGroup, sharedGroup]
    activeGroupId = sharedGroup.id
  })

  it('OWNER에게는 초대하기 버튼과 그룹 탈퇴 버튼을 모두 보여준다', () => {
    members = [
      { userId: me.id, role: 'OWNER' },
      { userId: 'user-other', role: 'MEMBER' },
    ]
    render(<GroupManager />)

    expect(screen.getByRole('button', { name: '초대하기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '그룹 탈퇴' })).toBeInTheDocument()
  })

  it('일반 멤버에게는 그룹 탈퇴 버튼을 보여주고 초대하기 버튼은 숨긴다', () => {
    members = [
      { userId: 'user-owner', role: 'OWNER' },
      { userId: me.id, role: 'MEMBER' },
    ]
    render(<GroupManager />)

    expect(screen.getByRole('button', { name: '그룹 탈퇴' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '초대하기' })).not.toBeInTheDocument()
  })

  it('개인 그룹의 OWNER는 초대하기 버튼을 볼 수 있지만(그룹 생성의 유일한 경로) 탈퇴 버튼은 숨긴다(서버가 409)', () => {
    activeGroupId = undefined
    members = [{ userId: me.id, role: 'OWNER' }]
    render(<GroupManager />)

    expect(screen.getByRole('button', { name: '초대하기' })).toBeInTheDocument()
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

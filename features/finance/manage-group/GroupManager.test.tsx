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
let groups: FinanceGroup[] | undefined = [sharedGroup]
let groupsError = false
let members: FinanceGroupMember[] = []

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceGroupsQuery: () => ({ data: groups, isError: groupsError }),
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
    groupsError = false
  })

  it('OWNER에게는 초대 코드 발급 버튼과 그룹 탈퇴 버튼을 모두 보여준다', () => {
    members = [
      { userId: me.id, role: 'OWNER' },
      { userId: 'user-other', role: 'MEMBER' },
    ]
    render(<GroupManager />)

    expect(screen.getByRole('button', { name: '초대 코드 발급' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '그룹 탈퇴' })).toBeInTheDocument()
  })

  it('일반 멤버에게는 그룹 탈퇴 버튼을 보여주고 초대 코드 발급 버튼은 숨긴다', () => {
    members = [
      { userId: 'user-owner', role: 'OWNER' },
      { userId: me.id, role: 'MEMBER' },
    ]
    render(<GroupManager />)

    expect(screen.getByRole('button', { name: '그룹 탈퇴' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '초대 코드 발급' })).not.toBeInTheDocument()
  })

  it('무그룹(개인) 상태에서는 초대 코드 발급 버튼만 보여주고 멤버/탈퇴 UI는 없다(그룹 생성의 유일한 경로)', () => {
    groups = []
    members = []
    render(<GroupManager />)

    expect(screen.getByRole('button', { name: '초대 코드 발급' })).toBeInTheDocument()
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
    // role 코드 원문 대신 라벨을 보여준다
    expect(screen.getByText('소유자')).toBeInTheDocument()
    // 섹션 라벨 "멤버"와 역할 배지 "멤버"가 함께 있다
    expect(screen.getAllByText('멤버')).toHaveLength(2)
    expect(screen.queryByText('OWNER')).not.toBeInTheDocument()
  })

  it('그룹 목록 로딩 중에는 로딩 표시만 하고 다른 그룹 참여 폼을 띄우지 않는다', () => {
    groups = undefined
    render(<GroupManager />)

    expect(screen.getByRole('heading', { name: '그룹' })).toBeInTheDocument()
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
    expect(screen.queryByText('다른 그룹 초대 코드로 참여')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '참여' })).not.toBeInTheDocument()
  })

  it('그룹 목록 조회에 실패하면 오류를 표시하고 다른 그룹 참여 폼을 띄우지 않는다', () => {
    groups = undefined
    groupsError = true
    render(<GroupManager />)

    expect(screen.getByText('그룹 정보를 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.queryByText('다른 그룹 초대 코드로 참여')).not.toBeInTheDocument()
  })
})

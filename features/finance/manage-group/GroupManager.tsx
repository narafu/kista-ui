'use client'

import { useActiveGroupId, useFinanceGroupMembersQuery, useFinanceGroupsQuery } from '@entities/finance'
import { useMeQuery } from '@entities/user'
import { cn } from '@shared/lib/utils'
import { AcceptInvitationForm } from './AcceptInvitationForm'
import { GroupMemberList } from './GroupMemberList'
import { GroupSwitcher } from './GroupSwitcher'
import { InviteDialog } from './InviteDialog'
import { LeaveGroupDialog } from './LeaveGroupDialog'

const cardClass = 'bg-card rounded-[1.25rem] py-7 px-6 shadow-[var(--sh-card)] border border-border'

// 그룹은 생성/삭제 API가 없다 — 초대 수락으로만 개인 그룹이 공유 그룹으로 전환된다(그룹 만들기
// 버튼이 없는 게 의도적). 멤버 조회는 이 컴포넌트가 한 번만 수행해 GroupMemberList에는
// 결과를 그대로 내려준다(내 role 판별과 목록 렌더가 같은 데이터를 쓰므로 중복 조회하지 않는다).
function GroupSection({ groupId, isPersonal, myUserId }: { groupId: string; isPersonal: boolean; myUserId?: string }) {
  const { data: members = [] } = useFinanceGroupMembersQuery(groupId)
  const isOwner = members.some((m) => m.userId === myUserId && m.role === 'OWNER')

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold">멤버</p>
      <GroupMemberList groupId={groupId} members={members} isPersonal={isPersonal} isOwner={isOwner} myUserId={myUserId} />

      {!isPersonal && (
        <div className="flex gap-2">
          {isOwner && <InviteDialog groupId={groupId} />}
          {myUserId && <LeaveGroupDialog groupId={groupId} isPersonal={isPersonal} myUserId={myUserId} />}
        </div>
      )}
    </div>
  )
}

export function GroupManager() {
  const { data: groups } = useFinanceGroupsQuery()
  const { data: me } = useMeQuery()
  const activeGroupId = useActiveGroupId()
  const groupId = activeGroupId ?? groups?.find((g) => g.personal)?.id
  const isPersonal = groups?.find((g) => g.id === groupId)?.personal ?? true

  return (
    <div className={cn(cardClass, 'space-y-6')}>
      <div className="space-y-2">
        <p className="text-sm font-semibold">그룹</p>
        <GroupSwitcher />
      </div>

      {/* groups 로딩 전에는 isPersonal을 판정할 수 없다(위 기본값 true는 로드 완료 후에만 신뢰 가능) —
          초대/탈퇴 버튼이 잘못된 상태로 반짝였다가 바뀌는 걸 막기 위해 groups 로드 후에만 렌더한다. */}
      {groups && groupId && <GroupSection groupId={groupId} isPersonal={isPersonal} myUserId={me?.id} />}

      <div className="space-y-2 border-t border-border pt-6">
        <p className="text-sm font-semibold">다른 그룹 초대 코드로 참여</p>
        <AcceptInvitationForm />
      </div>
    </div>
  )
}

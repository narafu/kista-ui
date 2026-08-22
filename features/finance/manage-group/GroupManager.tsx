'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  useActiveGroupId,
  useFinanceGroupMembersQuery,
  useFinanceGroupsQuery,
  useRemoveFinanceGroupMemberMutation,
  useSetActiveGroupId,
} from '@entities/finance'
import { useMeQuery } from '@entities/user'
import { cn } from '@shared/lib/utils'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import { AcceptInvitationForm } from './AcceptInvitationForm'
import { GroupMemberList } from './GroupMemberList'
import { GroupSwitcher } from './GroupSwitcher'
import { InviteDialog } from './InviteDialog'
import { LeaveGroupDialog } from './LeaveGroupDialog'

const cardClass = 'bg-card rounded-[1.25rem] py-7 px-6 shadow-[var(--sh-card)] border border-border'

interface GroupSectionProps {
  groupId: string
  myUserId?: string
  // GroupManager가 이미 useActiveGroupId/useSetActiveGroupId를 구독하고 있어 여기서 다시
  // 구독하지 않고 그대로 물려받는다.
  activeGroupId: string | undefined
  setActiveGroupId: (groupId: string | undefined) => void
}

// 그룹은 생성/삭제/이름변경 API가 없다 — 초대 발급으로만 생긴다(무그룹 유저가 초대를 발급하면
// kista-api가 그 자리에서 새 그룹을 만들고 본인을 OWNER로 등록한다). 멤버 조회는 이 컴포넌트가
// 한 번만 수행해 GroupMemberList에는 결과를 그대로 내려준다.
function GroupSection({ groupId, myUserId, activeGroupId, setActiveGroupId }: GroupSectionProps) {
  const { data: members = [] } = useFinanceGroupMembersQuery(groupId)
  const isOwner = members.some((m) => m.userId === myUserId && m.role === 'OWNER')

  const leaveDialog = useConfirmDialog<true>()
  const leaveMutation = useRemoveFinanceGroupMemberMutation(groupId)

  function handleLeave() {
    if (!myUserId) return
    leaveMutation.mutate(myUserId, {
      onSuccess: () => {
        toast.success('그룹에서 탈퇴했습니다')
        leaveDialog.close()
        // 지금 보고 있던 그룹에서 탈퇴하면 존재하지 않는 그룹을 계속 조회하지 않도록 개인 상태로 되돌린다.
        if (activeGroupId === groupId) setActiveGroupId(undefined)
      },
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold">멤버</p>
      <GroupMemberList groupId={groupId} members={members} isOwner={isOwner} myUserId={myUserId} />

      <div className="flex gap-2">
        {isOwner && <InviteDialog groupId={groupId} />}
        {myUserId && (
          <Button
            type="button"
            variant="outline"
            onClick={() => leaveDialog.request(true)}
            disabled={leaveMutation.isPending}
            className="text-destructive hover:text-destructive border-destructive/40"
          >
            {leaveMutation.isPending ? '처리 중...' : '그룹 탈퇴'}
          </Button>
        )}
      </div>

      <LeaveGroupDialog
        open={leaveDialog.open}
        onOpenChange={leaveDialog.onOpenChange}
        isPending={leaveMutation.isPending}
        onConfirm={handleLeave}
      />
    </div>
  )
}

export function GroupManager() {
  const { data: groups } = useFinanceGroupsQuery()
  const { data: me } = useMeQuery()
  const activeGroupId = useActiveGroupId()
  const setActiveGroupId = useSetActiveGroupId()
  // 1인 1그룹 정책 — groups는 0개(개인) 또는 1개(그룹 소속)뿐이다.
  const group = groups?.[0]

  return (
    <div className={cn(cardClass, 'space-y-6')}>
      <div className="space-y-2">
        <p className="text-sm font-semibold">그룹</p>
        <GroupSwitcher group={group} />
      </div>

      {groups && group && (
        <GroupSection groupId={group.id} myUserId={me?.id} activeGroupId={activeGroupId} setActiveGroupId={setActiveGroupId} />
      )}
      {groups && !group && me?.id && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">아직 소속된 그룹이 없습니다. 초대 코드를 발급하면 그룹이 만들어집니다.</p>
          <InviteDialog groupId={me.id} />
        </div>
      )}

      {/* 1인 1그룹 정책상 이미 그룹에 소속돼 있으면 다른 그룹 초대를 수락할 수 없다(서버가 거부) —
          그룹이 없을 때만 노출한다. */}
      {!group && (
        <div className="space-y-2 border-t border-border pt-6">
          <p className="text-sm font-semibold">다른 그룹 초대 코드로 참여</p>
          <AcceptInvitationForm />
        </div>
      )}
    </div>
  )
}

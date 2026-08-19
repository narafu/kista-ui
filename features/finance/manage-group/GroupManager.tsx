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
  isPersonal: boolean
  myUserId?: string
  // GroupManager가 이미 useActiveGroupId/useSetActiveGroupId를 구독하고 있어(GroupSwitcher의
  // value prop과 동일한 이유) 여기서 다시 구독하지 않고 그대로 물려받는다.
  activeGroupId: string | undefined
  setActiveGroupId: (groupId: string | undefined) => void
}

// 그룹은 생성/삭제 API가 없다 — 초대 수락으로만 개인 그룹이 공유 그룹으로 전환된다(그룹 만들기
// 버튼이 없는 게 의도적). 멤버 조회는 이 컴포넌트가 한 번만 수행해 GroupMemberList에는
// 결과를 그대로 내려준다(내 role 판별과 목록 렌더가 같은 데이터를 쓰므로 중복 조회하지 않는다).
function GroupSection({ groupId, isPersonal, myUserId, activeGroupId, setActiveGroupId }: GroupSectionProps) {
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
        // 지금 보고 있던 그룹에서 탈퇴하면 존재하지 않는 그룹을 계속 조회하지 않도록 개인 그룹으로 되돌린다.
        if (activeGroupId === groupId) setActiveGroupId(undefined)
      },
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold">멤버</p>
      <GroupMemberList groupId={groupId} members={members} isPersonal={isPersonal} isOwner={isOwner} myUserId={myUserId} />

      {/* 초대는 개인 그룹에서도 발급 가능하다(kista-api가 personal 여부를 검사하지 않음) —
          그룹 생성 API가 없어 "개인 그룹에서 초대 → 수락" 경로가 공유 그룹을 만드는 유일한
          방법이라, 여기서 isPersonal로 막으면 아무도 그룹을 만들 수 없게 된다. 탈퇴만 개인
          그룹에서 서버가 409로 거부하므로 그 버튼만 !isPersonal로 숨긴다. */}
      <div className="flex gap-2">
        {isOwner && <InviteDialog groupId={groupId} />}
        {!isPersonal && myUserId && (
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
        isPersonal={isPersonal}
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
  const groupId = activeGroupId ?? groups?.find((g) => g.personal)?.id
  const isPersonal = groups?.find((g) => g.id === groupId)?.personal ?? true

  return (
    <div className={cn(cardClass, 'space-y-6')}>
      <div className="space-y-2">
        <p className="text-sm font-semibold">그룹</p>
        <GroupSwitcher groups={groups ?? []} value={groupId} />
      </div>

      {/* groups 로딩 전에는 isPersonal을 판정할 수 없다(위 기본값 true는 로드 완료 후에만 신뢰 가능) —
          초대/탈퇴 버튼이 잘못된 상태로 반짝였다가 바뀌는 걸 막기 위해 groups 로드 후에만 렌더한다. */}
      {groups && groupId && (
        <GroupSection
          groupId={groupId}
          isPersonal={isPersonal}
          myUserId={me?.id}
          activeGroupId={activeGroupId}
          setActiveGroupId={setActiveGroupId}
        />
      )}

      <div className="space-y-2 border-t border-border pt-6">
        <p className="text-sm font-semibold">다른 그룹 초대 코드로 참여</p>
        <AcceptInvitationForm />
      </div>
    </div>
  )
}

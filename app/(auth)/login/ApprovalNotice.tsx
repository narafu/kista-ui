'use client'

import { useRuntimeConfigQuery } from '@entities/runtime-config'

export function ApprovalNotice() {
  const { data } = useRuntimeConfigQuery()

  if (data?.auth.approvalRequired !== true) return null

  return (
    <div
      className="mb-5 px-3.5 py-2.5 rounded-[10px] text-center text-sm font-medium"
      style={{
        background: 'var(--rose-50)',
        border: '1px solid var(--rose-100)',
        color: 'var(--rose-700)',
      }}
    >
      가입 후 관리자 승인이 필요합니다.
    </div>
  )
}

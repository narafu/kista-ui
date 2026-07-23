'use client'

import { useRuntimeConfigQuery } from '@entities/runtime-config'

export function ApprovalNotice() {
  const { data } = useRuntimeConfigQuery()

  if (data?.auth.approvalRequired !== true) return null

  return (
    <div
      className="flex items-center justify-center gap-2 mb-5 px-3.5 py-2.5 rounded-[10px] text-center text-sm font-medium"
      style={{
        background: 'var(--rose-50)',
        border: '1px solid var(--rose-100)',
        color: 'var(--rose-700)',
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      가입 후 관리자 승인이 필요합니다.
    </div>
  )
}

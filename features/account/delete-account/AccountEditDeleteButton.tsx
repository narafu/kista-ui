'use client'

import { useState } from 'react'
import { DeleteAccountDialog } from './DeleteAccountDialog'

interface Props {
  accountId: string
  nickname: string
}

export function AccountEditDeleteButton({ accountId, nickname }: Props) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDelete(true)}
        className="px-4 py-2 rounded-[var(--r-md)] border border-neg/50 text-neg text-sm font-semibold hover:bg-neg/10 transition-colors"
      >
        계좌 삭제
      </button>
      {showDelete && (
        <DeleteAccountDialog
          accountId={accountId}
          nickname={nickname}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  )
}

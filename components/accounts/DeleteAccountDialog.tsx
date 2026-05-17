'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAccount } from '@/lib/api/accounts'

interface Props {
  accountId: string
  nickname: string
  onClose: () => void
}

export function DeleteAccountDialog({ accountId, nickname, onClose }: Props) {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canDelete = confirm === nickname

  async function handleDelete() {
    setLoading(true)
    setError('')
    try {
      await deleteAccount(accountId)
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card rounded-[var(--r-xl)] border border-border p-6 shadow-[var(--sh-pop)]">
        <h2 className="font-bold text-lg text-neg mb-1">계좌 삭제</h2>
        <p className="text-sm text-muted-foreground mb-5">
          삭제하면 모든 거래 내역이 함께 삭제됩니다. 되돌릴 수 없습니다.
        </p>
        <p className="text-sm mb-2">
          계속하려면 계좌 별칭 <strong className="text-foreground">{nickname}</strong>을 입력하세요.
        </p>
        <input
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder={nickname}
          className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-neg mb-4"
        />
        {error && <p className="text-sm text-neg mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 h-10 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors">
            취소
          </button>
          <button
            disabled={!canDelete || loading}
            onClick={handleDelete}
            className="flex-1 h-10 rounded-[var(--r-md)] bg-neg text-white text-sm font-semibold hover:bg-neg/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}

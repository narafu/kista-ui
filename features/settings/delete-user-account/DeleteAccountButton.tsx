'use client'

import { useState } from 'react'
import { useDeleteMeMutation } from '@entities/user'

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false)
  const mutation = useDeleteMeMutation()

  async function handleDelete() {
    try {
      await mutation.mutateAsync()
      window.location.href = '/'
    } catch {
      alert('탈퇴 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-[var(--r-md)] border border-neg/50 text-neg text-sm font-semibold hover:bg-neg/5 transition-colors"
      >
        회원 탈퇴
      </button>
      <p className="text-xs text-muted-foreground mt-2">
        탈퇴 시 모든 계좌·거래 데이터가 즉시 삭제됩니다
      </p>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-[var(--r-lg)] p-6 w-[320px] shadow-lg">
            <h3 className="text-base font-bold text-neg mb-2">정말 탈퇴하시겠습니까?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              모든 계좌, 거래 내역, 설정이 즉시 삭제되며 복구할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={mutation.isPending}
                className="flex-1 py-2 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={mutation.isPending}
                className="flex-1 py-2 rounded-[var(--r-md)] bg-neg text-white text-sm font-semibold hover:bg-neg/90 disabled:opacity-60 transition-colors"
              >
                {mutation.isPending ? '처리 중...' : '탈퇴 확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'
import { useUpdateNicknameMutation } from '@entities/user'

const NICKNAME_REGEX = /^[\p{L}\d ]{1,10}$/u

interface Props {
  initialNickname: string
}

export function NicknameEditor({ initialNickname }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialNickname)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const mutation = useUpdateNicknameMutation()

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEdit() {
    setValue(initialNickname)
    setError('')
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setError('')
  }

  function save() {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('닉네임을 입력해 주세요.')
      return
    }
    if (!NICKNAME_REGEX.test(trimmed)) {
      setError('한글·영문·숫자·공백 1~10자로 입력해 주세요.')
      return
    }
    mutation.mutate(trimmed, {
      onSuccess: () => { setEditing(false); router.refresh() },
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[13.5px] font-semibold">{initialNickname || '-'}</span>
        <button
          type="button"
          onClick={startEdit}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="닉네임 편집"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => { setValue(e.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          maxLength={10}
          placeholder="1~10자"
          disabled={mutation.isPending}
          className="w-32 h-7 px-2 text-[13px] rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="button"
          onClick={save}
          disabled={mutation.isPending}
          className="text-[var(--status-ok)] hover:opacity-70 transition-opacity disabled:opacity-50"
          aria-label="저장"
        >
          <Check className="size-4" />
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={mutation.isPending}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          aria-label="취소"
        >
          <X className="size-4" />
        </button>
      </div>
      {error && <p className="text-[11px] text-[var(--status-error)]">{error}</p>}
    </div>
  )
}

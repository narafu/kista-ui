'use client'

import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { useUpdateNicknameMutation } from '@entities/user'
import { Input } from '@/components/ui/input'
import { IconButton } from '@shared/ui/IconButton'

const NICKNAME_REGEX = /^[\p{L}\d ]{1,10}$/u

interface Props {
  initialNickname: string
}

export function NicknameEditor({ initialNickname }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialNickname)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const mutation = useUpdateNicknameMutation()

  useEffect(() => {
    // eslint-disable-next-line react-doctor/no-event-handler
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
      setError('닉네임을 입력하세요.')
      return
    }
    if (!NICKNAME_REGEX.test(trimmed)) {
      setError('한글·영문·숫자·공백 1~10자로 입력하세요.')
      return
    }
    mutation.mutate(trimmed, { onSuccess: () => setEditing(false) })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{initialNickname || '-'}</span>
        <IconButton onClick={startEdit} aria-label="닉네임 수정">
          <Pencil className="size-3.5" />
        </IconButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => { setValue(e.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          maxLength={10}
          placeholder="1~10자"
          aria-label="닉네임"
          disabled={mutation.isPending}
          className="w-32"
        />
        <IconButton onClick={save} disabled={mutation.isPending} aria-label="저장" className="text-[var(--status-ok)] hover:text-[var(--status-ok)]">
          <Check className="size-4" />
        </IconButton>
        <IconButton onClick={cancel} disabled={mutation.isPending} aria-label="취소">
          <X className="size-4" />
        </IconButton>
      </div>
      {error && <p className="text-sm text-[var(--status-error)]">{error}</p>}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { z } from 'zod'
import { useUpdateNicknameMutation } from '@entities/user'
import { Input } from '@/components/ui/input'
import { IconButton } from '@shared/ui/IconButton'
import { useAppForm } from '@shared/ui/form/useAppForm'

// 길이·문자 제한은 trim한 값 기준이다
const schema = z.object({
  nickname: z.string().trim().min(1, '닉네임을 입력하세요.').regex(/^[\p{L}\d ]{1,10}$/u, '한글·영문·숫자·공백 1~10자로 입력하세요.'),
})

interface Props {
  initialNickname: string
}

// 인라인 편집이라 보이는 라벨이 없어 FormField 대신 register로 입력을 잇는다
export function NicknameEditor({ initialNickname }: Props) {
  const [editing, setEditing] = useState(false)
  const mutation = useUpdateNicknameMutation()
  const form = useAppForm({
    schema,
    defaultValues: { nickname: initialNickname },
    mutation,
    toPayload: ({ nickname }) => nickname,
    onDone: () => setEditing(false),
  })
  const error = form.formState.errors.nickname?.message

  const { setFocus } = form
  useEffect(() => {
    // eslint-disable-next-line react-doctor/no-event-handler
    if (editing) setFocus('nickname')
  }, [editing, setFocus])

  function startEdit() {
    form.reset({ nickname: initialNickname })
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    form.clearErrors()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
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
    <form onSubmit={form.submit} className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Input
          {...form.register('nickname')}
          type="text"
          onKeyDown={handleKeyDown}
          maxLength={10}
          placeholder="1~10자"
          aria-label="닉네임"
          aria-invalid={!!error}
          disabled={form.isPending}
          className="w-32"
        />
        <IconButton type="submit" disabled={form.isPending} aria-label="저장" className="text-[var(--status-ok)] hover:text-[var(--status-ok)]">
          <Check className="size-4" />
        </IconButton>
        <IconButton onClick={cancel} disabled={form.isPending} aria-label="취소">
          <X className="size-4" />
        </IconButton>
      </div>
      {error && <p role="alert" className="text-sm text-[var(--status-error)]">{error}</p>}
    </form>
  )
}

// 소수점 N자리까지 입력을 허용하는 컨트롤드 텍스트 인풋 훅.
// "12." 같은 입력 중간 상태(소수점만 입력된 상태)를 number로는 표현할 수 없어 문자열 버퍼로 표시값을 관리하고,
// value가 외부에서 바뀐 경우에만(이 훅이 스스로 emit한 변경은 제외) 버퍼를 되돌린다.

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

interface UseDecimalAmountTextOptions {
  value: number | null
  onChange: (v: number | null) => void
  maxDecimals?: number
  // true면 '-' 입력을 허용해 음수를 그대로 zod 검증(nonnegative 등)에 넘긴다.
  // false(기본)면 '-'를 애초에 입력 불가로 막는다 — 필드 자체에 음수 의미가 없어
  // 별도 에러 메시지를 보여줄 UI가 없는 경우에 적합.
  allowNegative?: boolean
}

export function useDecimalAmountText({ value, onChange, maxDecimals = 2, allowNegative = false }: UseDecimalAmountTextOptions) {
  const pattern = useMemo(
    () => new RegExp(`^${allowNegative ? '-?' : ''}\\d*\\.?\\d{0,${maxDecimals}}$`),
    [allowNegative, maxDecimals],
  )
  const allowedChars = useMemo(() => new RegExp(`[^\\d.${allowNegative ? '-' : ''}]`, 'g'), [allowNegative])
  const [text, setText] = useState(value !== null ? String(value) : '')
  const lastEmitted = useRef(value)

  // "12." 같은 입력 중간 상태는 number로 표현 불가해 text가 value의 순수 파생값일 수 없다.
  // value가 이 훅 스스로 emit한 게 아니라 외부(폼 reset 등)에서 바뀐 경우에만 되돌리는
  // 하이브리드 컨트롤드 인풋 — key 리마운트는 매 키 입력마다 value가 바뀌어 포커스가 끊긴다.
  useEffect(() => {
    if (value === lastEmitted.current) return
    lastEmitted.current = value
    // eslint-disable-next-line react-doctor/no-derived-state
    setText(value !== null ? String(value) : '')
  }, [value])

  function handleChange(raw: string) {
    const sanitized = raw.replace(allowedChars, '')
    if (!pattern.test(sanitized)) return
    setText(sanitized)
    const next = sanitized === '' || sanitized === '-' || sanitized === '.' ? null : Number(sanitized)
    lastEmitted.current = next
    onChange(next)
  }

  return { text, handleChange }
}

// 소수점 N자리까지 입력을 허용하는 컨트롤드 텍스트 인풋 훅.
// "12." 같은 입력 중간 상태(소수점만 입력된 상태)를 number로는 표현할 수 없어 문자열 버퍼로 표시값을 관리하고,
// value가 외부에서 바뀐 경우에만(이 훅이 스스로 emit한 변경은 제외) 버퍼를 되돌린다.

'use client'

import { useEffect, useRef, useState } from 'react'

interface UseDecimalAmountTextOptions {
  value: number | null
  onChange: (v: number | null) => void
  maxDecimals?: number
}

export function useDecimalAmountText({ value, onChange, maxDecimals = 2 }: UseDecimalAmountTextOptions) {
  const pattern = useRef(new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`)).current
  const [text, setText] = useState(value !== null ? String(value) : '')
  const lastEmitted = useRef(value)

  useEffect(() => {
    if (value === lastEmitted.current) return
    lastEmitted.current = value
    setText(value !== null ? String(value) : '')
  }, [value])

  function handleChange(raw: string) {
    const sanitized = raw.replace(/[^\d.]/g, '')
    if (!pattern.test(sanitized)) return
    setText(sanitized)
    const next = sanitized === '' || sanitized === '.' ? null : Number(sanitized)
    lastEmitted.current = next
    onChange(next)
  }

  return { text, handleChange }
}

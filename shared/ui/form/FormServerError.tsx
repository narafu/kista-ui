// 폼 필드와 이름이 맞지 않는 서버 fieldErrors(field null·요청 바디에만 있는 필드)를 버튼 위 한 줄로 보인다.
// useAppForm이 'root.server'에 모으고, 다음 제출 때 RHF handleSubmit이 root 오류를 지운다.
// FormActions가 그리므로 FormActions를 쓰지 않는 폼만 직접 둔다
import type { GlobalError } from 'react-hook-form'

// AppForm<T>마다 errors 타입이 달라 root만 구조로 받는다
export type WithServerError = { formState?: { errors: { root?: Record<string, GlobalError> } } }

export function FormServerError({ form }: { form?: WithServerError }) {
  const message = form?.formState?.errors.root?.server?.message
  return message ? <p role="alert" className="text-sm text-status-error">{message}</p> : null
}

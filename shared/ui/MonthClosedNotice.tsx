import { cn } from '@shared/lib/utils'

interface Props {
  /** 앞에 붙일 대상 표기(예: "2026년 8월은 ") — 단건 폼은 입력 날짜 바로 아래라 생략한다 */
  subject?: string
  /** 다음 행동 안내 — 화면마다 고를 수 있는 대안이 달라 덮어쓸 수 있다 */
  hint?: string
  className?: string
}

// 기록 점검 완료(마감)로 저장이 막힌 이유를 알리는 공용 안내 — 자산·거래내역 폼과 일괄 등록이
// 같은 상태를 서로 다른 모양으로 보여주던 것을 하나로 맞춘다. 문장 단위 inline-block이라
// 줄바꿈되면 문장마다 끊긴다.
export function MonthClosedNotice({ subject = '', hint = '자산 탭 기록 점검에서 완료를 해제하세요.', className }: Props) {
  return (
    <p className={cn('rounded-[var(--r-md)] border border-[var(--warn)] bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]', className)}>
      <span className="inline-block">{subject}기록 점검이 완료되어 잠겨 있습니다.</span>{' '}
      <span className="inline-block">{hint}</span>
    </p>
  )
}

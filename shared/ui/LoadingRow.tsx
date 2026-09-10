/** 목록/테이블 위젯의 로딩 상태 한 줄 표시. 문구는 필요 시 override. */
export function LoadingRow({ label = '불러오는 중…' }: { label?: string } = {}) {
  return <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{label}</div>
}

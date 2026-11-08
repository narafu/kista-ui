import { Button } from '@/components/ui/button'

// 일시중지·재개 버튼 + 한 줄 설명 — 보관·삭제 버튼과 같은 열 구조라 부모는 items-start 그리드여야 한다
export function StrategyToggleButton({ active, loading, label, onClick }: { active: boolean; loading: boolean; label: string; onClick: () => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Button variant="outline" size="sm" className="w-full" disabled={loading} onClick={onClick}>
        {label}
      </Button>
      <p className="text-xs text-muted-foreground">{active ? '매매만 멈춤, 재개 가능' : '매매를 다시 시작'}</p>
    </div>
  )
}

// SegmentedToggle(값 선택)·SegmentedTabs(내용 전환 탭)·SectionTabBar(라우트 내비)가 공유하는 세그먼트 시각.
// 역할마다 의미(aria-pressed / tab / aria-current)는 다르지만 생김새는 같아야 해서 클래스만 여기 둔다.
export const SEGMENT_LIST_CLASS = 'rounded-md border border-border p-0.5'

export const SEGMENT_ACTIVE_CLASS = 'bg-[var(--brand-fg-soft)] text-[var(--background)]'

export const SEGMENT_INACTIVE_CLASS = 'text-muted-foreground hover:text-foreground hover:bg-accent'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetaProvider } from '@entities/meta'
import { testMeta } from '@entities/meta/__fixtures__/testMeta'
import type { NextOrderPreview } from '@entities/order'
import type { Strategy } from '@entities/strategy'
import { StrategyMetaSection } from './StrategyMetaSection'

const strategy = { id: 's1', type: 'INFINITE', status: 'ACTIVE', cycleSeedType: 'MAX', divisionCount: 40 } as unknown as Strategy
const strategyType = { code: 'INFINITE', label: '무한매수', divisionCounts: [20, 40] }

function renderSection(preview: Partial<NextOrderPreview> | undefined, o: { loading?: boolean; error?: boolean } = {}) {
  return render(
    <MetaProvider meta={{ ...testMeta, strategyTypes: [strategyType] as unknown as typeof testMeta.strategyTypes }}>
      <StrategyMetaSection
        strategy={strategy}
        preview={preview as NextOrderPreview | undefined}
        isLoadingPreview={o.loading ?? false}
        isPreviewError={o.error ?? false}
      />
    </MetaProvider>,
  )
}

describe('StrategyMetaSection PositionGrid', () => {
  it('미리보기는 왔는데 position·사유가 없으면 타일을 "-"로 남긴다', () => {
    renderSection({ position: null, skipReason: null })
    expect(screen.getByText('회차(T)')).toBeInTheDocument()
    expect(screen.getAllByText('-')).toHaveLength(4)
  })

  it('조회 오류나 skipReason이 있으면 타일을 그리지 않는다', () => {
    renderSection(undefined, { error: true })
    expect(screen.queryByText('회차(T)')).toBeNull()
  })

  it('skipReason이 있으면 타일을 그리지 않는다', () => {
    renderSection({ position: null, skipReason: 'CYCLE_ENDED' } as Partial<NextOrderPreview>)
    expect(screen.queryByText('회차(T)')).toBeNull()
  })

  it('로딩 중이면 라벨은 보이고 값은 "-"가 아니다', () => {
    renderSection(undefined, { loading: true })
    expect(screen.getByText('회차(T)')).toBeInTheDocument()
    expect(screen.queryByText('-')).toBeNull()
  })
})

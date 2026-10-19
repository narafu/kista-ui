'use client'

import { useCryptoMarketIndicatorsQuery } from '@entities/market'
import type { CryptoMarketIndicators } from '@entities/market'
import { Surface } from '@shared/ui/Surface'
import { SegmentedTabs } from '@shared/ui/SegmentedTabs'
import { cn } from '@shared/lib/utils'
import { Button } from '@/components/ui/button'
import { FundingRateCard, KimchiPremiumCard, OpenInterestCard } from './CryptoIndicatorCards'

// 응답은 200이어도 모든 종목의 모든 섹션이 null이면(종목이 없어도) 카드로 보여줄 게 없어 전체 조회 불가로 본다.
// 테더 프리미엄은 김프 카드 안의 분해 표시로만 쓰여 단독으로는 보여줄 자리가 없다
function isAllFailed(data: CryptoMarketIndicators) {
  return data.tickers.every((t) => !t.kimchiPremium && !t.fundingRate && !t.openInterest)
}

const fmtKstDateTime = (instant: string) =>
  new Date(instant).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

function Message({ text, onRetry, retrying }: { text: string; onRetry?: () => void; retrying?: boolean }) {
  return (
    <Surface className={cn('flex h-[200px] flex-col items-center justify-center gap-3 p-5 text-sm', onRetry ? 'text-warn' : 'text-muted-foreground')}>
      {text}
      {onRetry && (
        // 재조회 중에도 isError가 유지되므로 진행 상태를 보여주고 중복 요청을 막는다(SectionError와 같은 aria-disabled 가드)
        <Button variant="outline" size="sm" className="aria-disabled:opacity-50" aria-disabled={retrying} onClick={() => { if (!retrying) onRetry() }}>
          {retrying ? '불러오는 중…' : '다시 시도'}
        </Button>
      )}
    </Surface>
  )
}

// 대시보드 시장 패널 그리드(lg 3열)에서 한 줄 전체를 차지한다. 종목 탭 안에 김프·펀딩비·OI 카드 3개
export function CryptoMarketSection() {
  const { data, isError, isFetching, refetch } = useCryptoMarketIndicatorsQuery()

  return (
    <section aria-labelledby="crypto-market-indicators-title" className="flex flex-col gap-3 lg:col-span-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2 id="crypto-market-indicators-title" className="text-sm font-semibold text-foreground">코인 시장 지표</h2>
        {data && <span className="text-xs text-muted-foreground">{fmtKstDateTime(data.asOf)} KST 기준</span>}
      </div>
      {data && !isAllFailed(data) ? (
        <SegmentedTabs
          aria-label="코인 시장 지표 종목"
          defaultValue={data.tickers[0]?.ticker ?? ''}
          className="flex flex-col gap-3"
          listClassName="self-start"
          options={data.tickers.map((t) => ({
            value: t.ticker,
            label: t.ticker,
            content: (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <KimchiPremiumCard ticker={t.ticker} data={t.kimchiPremium} usdtPremium={data.usdtPremium?.current ?? null} />
                <FundingRateCard ticker={t.ticker} data={t.fundingRate} />
                <OpenInterestCard ticker={t.ticker} data={t.openInterest} />
              </div>
            ),
          }))}
        />
      ) : data || isError ? (
        // 전체 실패(200 + 전부 null)는 서버가 캐시하지 않아 재조회로 회복될 수 있다 — retry=0이라 버튼으로 다시 부른다
        <Message text="코인 시장 지표를 불러오지 못했습니다." onRetry={() => void refetch()} retrying={isFetching} />
      ) : (
        <Message text="불러오는 중…" />
      )}
    </section>
  )
}

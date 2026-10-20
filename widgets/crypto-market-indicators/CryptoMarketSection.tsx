'use client'

import { useCryptoMarketIndicatorsQuery } from '@entities/market'
import type { CryptoMarketIndicators } from '@entities/market'
import { Surface } from '@shared/ui/Surface'
import { SegmentedTabs } from '@shared/ui/SegmentedTabs'
import { cn } from '@shared/lib/utils'
import { Button } from '@/components/ui/button'
import { AltcoinSeasonCard, BtcDominanceCard, CoinbasePremiumCard, HashRibbonsCard, FundingRateCard, KimchiPremiumCard, HalvingSummary, LongShortRatioCard, OpenInterestCard, ValuationCard } from './CryptoIndicatorCards'

// 모든 종목의 모든 섹션이 null이면(종목이 없어도) 종목 탭에 보여줄 게 없다.
// 테더 프리미엄은 김프 카드 안의 분해 표시로만 쓰여 단독으로는 보여줄 자리가 없다. 반감기는 탭 밖 제목 줄의 참고 정보라 판정에서 뺀다 — 다른 지표가 전부 실패해도 제목 줄에는 그대로 보인다
function isTickersFailed(data: CryptoMarketIndicators) {
  return data.tickers.every((t) => !t.kimchiPremium && !t.coinbasePremium && !t.fundingRate && !t.openInterest && !t.valuation && !t.longShortRatio)
}

// 시장 전체 지표 줄(도미넌스·알트 시즌·Hash Ribbons)은 셋 다 null일 때만 숨긴다 — 하나라도 있으면 나머지는 카드별 안내로 둔다
function isMarketFailed(data: CryptoMarketIndicators) {
  return !data.btcDominance && !data.altcoinSeason && !data.hashRibbons
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

// 대시보드 시장 차트 아래 셋째 줄(DashboardMarkets bottomPanels). 탭 위에 시장 전체 지표 카드 3개, 종목 탭 안에 카드 6개, BTC 반감기는 제목 줄 오른쪽(실패하면 숨긴다).
// PC 3열에서 첫 줄은 현물 수요·가격(김프·Coinbase 프리미엄·밸류에이션), 둘째 줄은 선물 포지션(펀딩비·롱/숏·미결제약정)으로 묶는다
export function CryptoMarketSection() {
  const { data, isError, isFetching, refetch } = useCryptoMarketIndicatorsQuery()
  const tickersFailed = data ? isTickersFailed(data) : true
  const marketFailed = data ? isMarketFailed(data) : true

  return (
    <section aria-labelledby="crypto-market-indicators-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 id="crypto-market-indicators-title" className="text-sm font-semibold text-foreground">크립토 시장 지표</h2>
        {data && <span className="text-xs text-muted-foreground">{fmtKstDateTime(data.asOf)} KST 기준</span>}
        {data?.halving && (
          // 모바일은 제목·기준 시각만으로 한 줄이 차 둘째 줄 왼쪽으로 내려가고, sm 이상에서는 제목 줄 오른쪽 끝에 붙는다
          <div className="w-full sm:ml-auto sm:w-auto">
            <HalvingSummary data={data.halving} asOf={data.asOf} />
          </div>
        )}
      </div>
      {data && !(tickersFailed && marketFailed) ? (
        <>
          {!marketFailed && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <BtcDominanceCard data={data.btcDominance} />
              <AltcoinSeasonCard data={data.altcoinSeason} />
              <HashRibbonsCard data={data.hashRibbons} />
            </div>
          )}
          {tickersFailed ? (
            // 일부라도 성공한 응답은 서버가 캐시해 바로 다시 불러도 같은 결과라 재시도 버튼을 두지 않는다
            <Message text="종목별 지표를 불러오지 못했습니다." />
          ) : (
            <SegmentedTabs
              aria-label="크립토 시장 지표 종목"
              defaultValue={data.tickers[0]?.ticker ?? ''}
              className="flex flex-col gap-3"
              listClassName="self-start"
              options={data.tickers.map((t) => ({
                value: t.ticker,
                label: t.ticker,
                content: (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <KimchiPremiumCard ticker={t.ticker} data={t.kimchiPremium} usdtPremium={data.usdtPremium?.current ?? null} />
                    <CoinbasePremiumCard ticker={t.ticker} data={t.coinbasePremium} />
                    <ValuationCard ticker={t.ticker} data={t.valuation} />
                    <FundingRateCard ticker={t.ticker} data={t.fundingRate} />
                    <LongShortRatioCard ticker={t.ticker} data={t.longShortRatio} />
                    <OpenInterestCard ticker={t.ticker} data={t.openInterest} />
                  </div>
                ),
              }))}
            />
          )}
        </>
      ) : data || isError ? (
        // 전체 실패(200 + 전부 null)는 서버가 캐시하지 않아 재조회로 회복될 수 있다 — retry=0이라 버튼으로 다시 부른다
        <Message text="크립토 시장 지표를 불러오지 못했습니다." onRetry={() => void refetch()} retrying={isFetching} />
      ) : (
        <Message text="불러오는 중…" />
      )}
    </section>
  )
}

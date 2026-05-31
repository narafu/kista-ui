"use client";

import {useState, useEffect} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {PortfolioChart} from "./PortfolioChart";
import {getAccountProfit, getPortfolioSnapshots} from "@/lib/api/trades";
import type {ProfitSummary, PortfolioSnapshot} from "@/types/trade";

type Period = 7 | 30 | 90;

interface Props {
  accountId: string;
}

function getDateRange(days: Period): {from: string; to: string} {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    from: start.toISOString().split("T")[0],
    to: end.toISOString().split("T")[0],
  };
}

export function ProfitStatsCard({accountId}: Props) {
  const [period, setPeriod] = useState<Period>(30);
  const [profit, setProfit] = useState<ProfitSummary | null>(null);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const dateRange = getDateRange(period);
        const [profitData, snapshotData] = await Promise.all([
          getAccountProfit(accountId, dateRange).catch(() => null),
          getPortfolioSnapshots({
            from: dateRange.from,
            to: dateRange.to,
          }).catch((): PortfolioSnapshot[] => []),
        ]);

        if (!cancelled) {
          setProfit(profitData);
          setSnapshots(snapshotData);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accountId, period]);

  return (
    <Card className="min-h-[240px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">수익/손실 통계</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              최근 {period}일 포트폴리오 추이
            </p>
          </div>
          <div className="flex gap-0.5 rounded-lg bg-muted p-1 shrink-0">
            {([7, 30, 90] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                  period === p
                    ? "bg-background text-rose-600 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}일
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
            로딩 중...
          </div>
        ) : (
          <>
            {profit &&
              (() => {
                const totalPL =
                  profit.totalProfitLoss ?? profit.totalRealizedProfit ?? 0;
                const totalRate =
                  profit.totalProfitLossRate ?? profit.totalReturnRate ?? 0;
                const latestSnapshot = snapshots.length
                  ? snapshots.reduce((a, b) =>
                      a.createdAt > b.createdAt ? a : b,
                    )
                  : null;
                const realized =
                  profit.totalRealizedProfit ?? profit.totalProfitLoss ?? 0;
                const unrealized = latestSnapshot
                  ? (latestSnapshot.marketValueUsd ?? 0) -
                    (latestSnapshot.avgPrice ?? 0) *
                      (latestSnapshot.holdings ?? 0)
                  : 0;
                return (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">기간 손익</p>
                      <p
                        className="text-lg font-bold"
                        style={{
                          color: totalPL >= 0 ? "var(--pos)" : "var(--neg)",
                        }}
                      >
                        {totalPL >= 0 ? "+" : ""}${totalPL.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">수익률</p>
                      <p
                        className="text-lg font-bold"
                        style={{
                          color: totalRate >= 0 ? "var(--pos)" : "var(--neg)",
                        }}
                      >
                        {totalRate >= 0 ? "+" : ""}
                        {totalRate.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">실현 손익</p>
                      <p
                        className="text-lg font-bold"
                        style={{
                          color: realized >= 0 ? "var(--pos)" : "var(--neg)",
                        }}
                      >
                        {realized >= 0 ? "+" : ""}${realized.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">평가 손익</p>
                      <p
                        className="text-lg font-bold"
                        style={{
                          color: unrealized >= 0 ? "var(--pos)" : "var(--neg)",
                        }}
                      >
                        {unrealized >= 0 ? "+" : ""}${unrealized.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })()}
            <PortfolioChart snapshots={snapshots} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

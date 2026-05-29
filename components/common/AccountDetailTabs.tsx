"use client";

import {useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {KpiCard} from "./KpiCard";
import {cn} from "@/lib/utils";
import {ReservationOrdersCard} from "./ReservationOrdersCard";
import {NextOrderPreviewCard} from "./NextOrderPreviewCard";
import {StrategyList} from "@/components/strategies/StrategyList";
import type {Account} from "@/types/account";
import type {Execution, PortfolioSnapshot} from "@/types/trade";
import type {Strategy} from "@/types/strategy";

type Tab = "summary" | "preview" | "reservation" | "trades";

interface Props {
  account: Account;
  trades: Execution[];
  portfolio: PortfolioSnapshot | null;
  strategies: Strategy[];
  usdDeposit: number;
}

export function AccountDetailTabs({
  account,
  trades,
  portfolio,
  strategies,
  usdDeposit,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const activeStrategy = strategies.find((s) => s.status === "ACTIVE") ?? strategies[0];

  return (
    <div className="space-y-4">
      {/* 모바일 탭 헤더 */}
      <div className="flex lg:hidden gap-1 border-b overflow-x-auto">
        {(["summary", "preview", "reservation", "trades"] as Tab[]).map(
          (tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {tab === "summary"
                ? "요약"
                : tab === "preview"
                  ? "다음 주문"
                  : tab === "reservation"
                    ? "예약 주문"
                    : "거래 내역"}
            </button>
          ),
        )}
      </div>

      {/* 모바일: 탭 콘텐츠 */}
      <div className="lg:hidden">
        {activeTab === "summary" && (
          <div className="space-y-4">
            <AccountSummaryCard
              account={account}
              portfolio={portfolio}
              usdDeposit={usdDeposit}
              hasStrategy={strategies.length > 0}
            />
            <StrategyList accountId={account.id} strategies={strategies} />
          </div>
        )}
        {activeTab === "preview" && (
          <NextOrderPreviewCard
            accountId={account.id}
            strategyType={activeStrategy?.type}
            initialUsdDeposit={activeStrategy?.initialUsdDeposit}
          />
        )}
        {activeTab === "reservation" && (
          <ReservationOrdersCard accountId={account.id} />
        )}
        {activeTab === "trades" && <TradesTab trades={trades} />}
      </div>

      {/* 데스크탑: 전체 레이아웃 */}
      <div className="hidden lg:block space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <AccountSummaryCard
            account={account}
            portfolio={portfolio}
            usdDeposit={usdDeposit}
            hasStrategy={strategies.length > 0}
          />
          <StrategyList accountId={account.id} strategies={strategies} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <TradesTab trades={trades} />
          <ReservationOrdersCard accountId={account.id} />
        </div>
        <NextOrderPreviewCard
          accountId={account.id}
          strategyType={activeStrategy?.type}
          initialUsdDeposit={activeStrategy?.initialUsdDeposit}
        />
      </div>
    </div>
  );
}

function AccountSummaryCard({
  account,
  portfolio,
  usdDeposit,
  hasStrategy,
}: {
  account: Account;
  portfolio: PortfolioSnapshot | null;
  usdDeposit: number;
  hasStrategy: boolean;
}) {
  const cost = portfolio
    ? (portfolio.avgPrice ?? 0) * (portfolio.holdings ?? 0)
    : 0;
  const unrealized = portfolio ? (portfolio.marketValueUsd ?? 0) - cost : 0;
  const rate = cost > 0 ? (unrealized / cost) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">계좌 요약</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="계좌번호"
            value={
              <span className="font-mono tracking-wider">
                {account.accountNoMasked}
              </span>
            }
          />
          <KpiCard label="예수금" value={`$${(usdDeposit ?? 0).toFixed(2)}`} />
          {hasStrategy && portfolio && (
            <>
              <KpiCard label="종목" value={portfolio.ticker} />
              <KpiCard
                label="현재가"
                value={`$${(portfolio.currentPrice ?? 0).toFixed(2)}`}
              />
              <KpiCard label="보유 수량" value={`${portfolio.holdings}주`} />
              <KpiCard
                label="평균 단가"
                value={`$${(portfolio.avgPrice ?? 0).toFixed(2)}`}
              />
              <KpiCard
                label="평가 금액"
                value={`$${(portfolio.marketValueUsd ?? 0).toFixed(2)}`}
              />
              <KpiCard
                label="평가 손익"
                variant="default"
                value={
                  <span
                    style={{
                      color: unrealized >= 0 ? "var(--pos)" : "var(--neg)",
                    }}
                  >
                    {unrealized >= 0 ? "+" : ""}${unrealized.toFixed(2)} (
                    {rate >= 0 ? "+" : ""}
                    {rate.toFixed(2)}%)
                  </span>
                }
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TradesTab({trades}: {trades: Execution[]}) {
  const [filter, setFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const filtered =
    filter === "ALL" ? trades : trades.filter((t) => t.direction === filter);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">거래 내역</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              최근 30일 ·{" "}
              {filter === "ALL"
                ? `총 ${trades.length}건`
                : `${filtered.length}/${trades.length}건`}
            </p>
          </div>
          <div className="flex gap-1.5">
            {(["ALL", "BUY", "SELL"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                  filter === f
                    ? "border-transparent"
                    : "text-muted-foreground border-transparent hover:border-border",
                )}
                style={
                  filter === f
                    ? {background: "var(--rose-50)", color: "var(--rose-600)"}
                    : undefined
                }
              >
                {f === "ALL" ? "전체" : f === "BUY" ? "매수" : "매도"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-6">
            거래 내역이 없습니다.
          </p>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 p-4 lg:hidden overflow-y-auto max-h-[440px]">
              {filtered.map((trade) => (
                <Card
                  key={`${trade.kisOrderId ?? ""}-${trade.tradeDate}-${trade.ticker}`}
                  className="p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {trade.direction === "BUY" ? (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            background: "var(--pos-bg)",
                            color: "var(--pos)",
                          }}
                        >
                          매수
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            background: "var(--neg-bg)",
                            color: "var(--neg)",
                          }}
                        >
                          매도
                        </span>
                      )}
                      <span className="font-medium text-sm">
                        {trade.ticker}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">
                      ${(trade.amountUsd ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>
                      {trade.quantity}주 × ${(trade.price ?? 0).toFixed(2)}
                    </span>
                    <span>
                      {new Date(trade.tradeDate).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
            {/* 데스크탑: 테이블 */}
            <div className="hidden lg:block overflow-y-auto max-h-[440px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    {["구분", "종목", "수량", "단가", "금액", "체결일"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-rose-500"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((trade) => (
                    <tr
                      key={`${trade.kisOrderId ?? ""}-${trade.tradeDate}-${trade.ticker}`}
                      className="border-t hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {trade.direction === "BUY" ? (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                            style={{
                              background: "var(--pos-bg)",
                              color: "var(--pos)",
                            }}
                          >
                            매수
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                            style={{
                              background: "var(--neg-bg)",
                              color: "var(--neg)",
                            }}
                          >
                            매도
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{trade.ticker}</td>
                      <td className="px-4 py-3">{trade.quantity}주</td>
                      <td className="px-4 py-3">
                        ${(trade.price ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        ${(trade.amountUsd ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(trade.tradeDate).toLocaleDateString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

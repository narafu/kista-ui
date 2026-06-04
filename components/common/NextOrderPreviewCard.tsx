"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KpiCard } from "./KpiCard";
import { useNextOrderPreview } from "@/hooks/useNextOrderPreview"
import { toast } from "sonner";

interface Props {
  accountId: string;
  strategyType?: string;
  initialUsdDeposit?: number;
  strategyId?: string;
}

export function NextOrderPreviewCard({ accountId, strategyType, initialUsdDeposit, strategyId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    preview,
    margin,
    isLoading,
    isFetching,
    error,
    lastUpdatedAt,
    refetch,
    isBlocked,
    isHoliday,
    mode,
    setMode,
    placedOrders,
    executeMutation,
    cancelAllMutation,
    cancelOneMutation,
  } = useNextOrderPreview(accountId, strategyId);

  if (!strategyType) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">다음 주문 미리보기</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            활성 전략을 등록하면 다음 주문을 미리 확인할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pos = preview?.position;

  const insufficientUnitAmount =
    preview?.skipReason === "INSUFFICIENT_BALANCE" && preview?.position != null
      ? parseFloat(preview.position.unitAmount)
      : null;
  const insufficientCurrentPrice =
    preview?.skipReason === "INSUFFICIENT_BALANCE" && preview?.position != null
      ? parseFloat(preview.position.currentPrice)
      : null;
  const insufficientShortfall =
    insufficientCurrentPrice !== null && insufficientUnitAmount !== null
      ? insufficientCurrentPrice - insufficientUnitAmount
      : null;

  const totalBuy =
    preview?.orders
      .filter((o) => o.direction === "BUY")
      .reduce((sum, o) => {
        const price = parseFloat(o.price);
        return price > 0 && o.quantity > 0 ? sum + price * o.quantity : sum;
      }, 0) ?? 0;

  const usdMargin = margin?.find((m) => m.currency === "USD") ?? null;
  const purchasable = usdMargin?.purchasableAmount ?? null;

  const showInsufficientBanner =
    totalBuy > 0 && purchasable !== null && totalBuy > purchasable;
  const shortfall = showInsufficientBanner ? totalBuy - (purchasable ?? 0) : 0;

  const isRunning = executeMutation.isPending;
  const isCancelling = cancelAllMutation.isPending;
  const cancellingOrderId = cancelOneMutation.isPending ? cancelOneMutation.variables : null;

  return (
    <>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>지금 매매를 실행하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              오늘 날짜의 LOC 주문을 즉시 접수합니다. 장 마감 시 체결됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRunning}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                executeMutation.mutate(undefined, {
                  onSettled: () => setDialogOpen(false),
                });
              }}
              disabled={isRunning}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isRunning ? "실행 중..." : "실행"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">다음 주문 미리보기</CardTitle>
              {lastUpdatedAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  방금 갱신 · {lastUpdatedAt}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {strategyId && mode === "preview" && (
                <div className="relative group inline-flex">
                  <button
                    type="button"
                    onClick={() => {
                      if (isHoliday) { toast.info('오늘은 미국 증시 휴장일입니다'); return }
                      if (isBlocked) { toast.info('주문 불가 시간대입니다 (프리마켓/정규장 시간에만 가능)'); return }
                      setDialogOpen(true)
                    }}
                    disabled={isFetching || isRunning}
                    className={`text-xs px-3 py-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50${isBlocked || isHoliday ? ' opacity-50 cursor-not-allowed' : ''}`}
                  >
                    지금 실행
                  </button>
                  {(isBlocked || isHoliday) && (
                    <div className="absolute top-full right-0 mt-2 px-2.5 py-1.5 bg-foreground text-background text-xs rounded-md shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {isHoliday
                        ? "오늘은 미국 증시 휴장일입니다"
                        : "주문 불가 시간대입니다 (프리마켓/정규장 시간에만 가능)"}
                    </div>
                  )}
                </div>
              )}
              {mode === "preview" && (
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:border-rose-300 hover:text-rose-600 transition-colors disabled:opacity-50"
                >
                  {isFetching ? "조회 중..." : "새로고침"}
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* ── executed 모드: 접수된 주문 목록 + 취소 버튼 ── */}
          {mode === "executed" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                  <p
                    className="text-[11px] uppercase tracking-widest font-semibold"
                    style={{ color: "var(--warn)" }}
                  >
                    ✓{" "}
                    {placedOrders.length > 0 ? `${placedOrders.length}건 접수됨` : "접수됨"}
                  </p>
                  <button
                    type="button"
                    onClick={() => cancelAllMutation.mutate()}
                    disabled={isCancelling || cancellingOrderId !== null}
                    className="text-xs px-2.5 py-1 rounded-md bg-warn-bg text-warn hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    {isCancelling ? "취소 중..." : "전체 취소"}
                  </button>
                </div>

                {placedOrders.length > 0 ? (
                  <div className="divide-y divide-border">
                    {placedOrders.map((order) => {
                      const isBuy = order.direction === "BUY";
                      const price = parseFloat(order.price);
                      const total = price > 0 ? price * order.quantity : null;
                      const isCancellingThis = cancellingOrderId === order.id;
                      return (
                        <div
                          key={order.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                              style={{
                                background: isBuy ? "var(--pos-bg)" : "var(--neg-bg)",
                                color: isBuy ? "var(--pos)" : "var(--neg)",
                              }}
                            >
                              {isBuy ? "매수" : "매도"}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              {order.orderType}
                            </span>
                            <span className="text-sm font-medium">{order.ticker}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm font-semibold">
                                {order.quantity}주
                                {price > 0 && ` × $${price.toFixed(2)}`}
                              </p>
                              {total != null && (
                                <p className="text-xs text-muted-foreground">
                                  = ${total.toFixed(2)}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => cancelOneMutation.mutate(order.id)}
                              disabled={isCancelling || cancellingOrderId !== null}
                              className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:border-rose-300 hover:text-rose-600 transition-colors disabled:opacity-50"
                            >
                              {isCancellingThis ? "..." : "✕"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    접수된 주문 목록은 백엔드 업데이트 후 표시됩니다.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setMode("preview");
                  refetch();
                }}
                className="w-full text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:border-rose-300 hover:text-rose-600 transition-colors"
              >
                ↩ 다시 미리보기
              </button>
            </div>
          )}

          {/* ── preview 모드: 기존 콘텐츠 (loading / error / preview 분기) ── */}
          {mode === "preview" && (
            <>
              {isLoading && !preview && (
                <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                  KIS에서 현재가와 잔고를 조회 중...
                </div>
              )}

              {error === "no-strategy" && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  활성 전략이 없습니다.
                </p>
              )}

              {error === "kis-fail" && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <p className="text-sm text-muted-foreground text-center">
                    KIS API 조회에 실패했습니다. 잠시 후 다시 시도해주세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-rose-300 hover:text-rose-600 transition-colors"
                  >
                    재시도
                  </button>
                </div>
              )}

              {preview && (
                <div className="space-y-4">
                  {showInsufficientBanner && (
                    <div className="rounded-lg px-4 py-2.5 bg-warn-bg">
                      <p className="text-xs font-semibold text-warn leading-relaxed">
                        ⚠️ 매수 예정 금액 ${totalBuy.toFixed(2)} • 예수금 $
                        {(purchasable ?? 0).toFixed(2)} • 잔고 부족 $
                        {shortfall.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {pos && (
                    <div className="grid grid-cols-2 gap-3">
                      <KpiCard label="회차(T)" value={`${pos.currentRound.toFixed(1)}회차`} />
                      <KpiCard label="단위금액(회)" value={`$${parseFloat(pos.unitAmount).toFixed(2)}`} />
                      <KpiCard label="기준가(별% 가격)" value={`$${parseFloat(pos.referencePrice).toFixed(2)}`} />
                      <KpiCard label="목표가" value={`$${parseFloat(pos.targetPrice).toFixed(2)}`} />
                    </div>
                  )}

                  {preview.orders.length === 0 ? (
                    preview.skipReason === "INSUFFICIENT_BALANCE" &&
                    insufficientShortfall !== null ? (
                      <div className="rounded-lg px-4 py-2.5 bg-warn-bg">
                        <p className="text-xs font-semibold text-warn leading-relaxed">
                          ⚠️ 단위금액 ${insufficientUnitAmount!.toFixed(2)} • 현재가 $
                          {insufficientCurrentPrice!.toFixed(2)} • 부족 $
                          {insufficientShortfall.toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        {preview.skipReason === "NO_CYCLE_HISTORY" &&
                          "첫 자동 매매 전에는 미리보기를 계산할 수 없습니다."}
                        {preview.skipReason === "INSUFFICIENT_BALANCE" &&
                          "잔고 부족으로 이번 사이클은 건너뜁니다."}
                        {preview.skipReason === "NO_PRIVACY_BASE" &&
                          "오늘의 기준 매매표가 아직 수신되지 않았습니다."}
                        {!preview.skipReason && "이번 사이클은 예정된 주문이 없습니다."}
                      </p>
                    )
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-widest text-rose-500 font-semibold">
                        예정 주문 {preview.orders.length}건
                      </p>
                      {preview.orders.map((order, i) => {
                        const isBuy = order.direction === "BUY";
                        const price = parseFloat(order.price);
                        const total = price > 0 ? price * order.quantity : null;
                        return (
                          <div
                            key={`${order.ticker}-${order.direction}-${order.orderType}-${i}`}
                            className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                                style={{
                                  background: isBuy ? "var(--pos-bg)" : "var(--neg-bg)",
                                  color: isBuy ? "var(--pos)" : "var(--neg)",
                                }}
                              >
                                {isBuy ? "매수" : "매도"}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">
                                {order.orderType}
                              </span>
                              <span className="text-sm font-medium">{order.ticker}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">
                                {order.quantity}주
                                {price > 0 && ` × $${price.toFixed(2)}`}
                              </p>
                              {total != null && (
                                <p className="text-xs text-muted-foreground">
                                  = ${total.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

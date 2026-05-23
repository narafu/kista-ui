"use client";

import {useState, useEffect} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {getAccountReservationOrders} from "@/lib/api/trades";
import type {ReservationOrder} from "@/types/trade";

interface Props {
  accountId: string;
}

function getDefaultRange(): {from: string; to: string} {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export function ReservationOrdersCard({accountId}: Props) {
  const [orders, setOrders] = useState<ReservationOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const data = await getAccountReservationOrders(
          accountId,
          getDefaultRange(),
        ).catch((): ReservationOrder[] => []);
        if (!cancelled) setOrders(data);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-base">예약 주문</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            최근 30일 · {isLoading ? "..." : `총 ${orders.length}건`}
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground px-6">
            로딩 중...
          </div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-6">
            예약 주문 내역이 없습니다.
          </p>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 p-4 lg:hidden">
              {orders.map((order) => (
                <Card key={order.reservationOrderId} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {order.direction === "BUY" ? (
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
                        {order.ticker}
                      </span>
                      {order.symbolName && (
                        <span className="text-xs text-muted-foreground">
                          {order.symbolName}
                        </span>
                      )}
                    </div>
                    {order.cancelled ? (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                        style={{
                          background: "var(--neg-bg)",
                          color: "var(--neg)",
                        }}
                      >
                        취소
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {order.statusName}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>
                      {order.orderedQty}주 × ${order.orderedPrice.toFixed(2)}{" "}
                      (체결 {order.filledQty}주)
                    </span>
                    <span>{order.receiptDate}</span>
                  </div>
                </Card>
              ))}
            </div>
            {/* 데스크탑: 테이블 */}
            <div className="hidden lg:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      "접수일시",
                      "종목",
                      "구분",
                      "주문수량",
                      "주문단가",
                      "체결수량",
                      "상태",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-rose-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.reservationOrderId}
                      className="border-t hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {order.receiptDate} {order.receiptTime}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{order.ticker}</div>
                        {order.symbolName && (
                          <div className="text-xs text-muted-foreground">
                            {order.symbolName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {order.direction === "BUY" ? (
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
                      <td className="px-4 py-3">{order.orderedQty}주</td>
                      <td className="px-4 py-3">
                        ${order.orderedPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">{order.filledQty}주</td>
                      <td className="px-4 py-3 text-xs">
                        {order.cancelled ? (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                            style={{
                              background: "var(--neg-bg)",
                              color: "var(--neg)",
                            }}
                          >
                            취소
                          </span>
                        ) : (
                          order.statusName
                        )}
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

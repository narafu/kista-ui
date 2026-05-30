"use client";

import {useState} from "react";
import {toast} from "sonner";
import {useRouter} from "next/navigation";
import {Card, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {StatusDot} from "@/components/common/StatusDot";
import {
  pauseStrategy,
  resumeStrategy,
} from "@/lib/api/strategies";
import {ApiError} from "@/lib/api/client";
import type {Strategy} from "@/types/strategy";

interface Props {
  strategy: Strategy;
  onChanged?: () => void;
}

export function StrategyCard({strategy, onChanged}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      if (strategy.status === "ACTIVE") {
        await pauseStrategy(strategy.id);
        toast.success("전략이 중지되었습니다");
      } else {
        await resumeStrategy(strategy.id);
        toast.success("전략이 재개되었습니다");
      }
      onChanged?.();
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? "처리에 실패했습니다" : "오류가 발생했습니다",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-6 flex-1 flex flex-col gap-6">
        {/* 헤더: 전략 타입 배지 + 상태 */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-600">
            {strategy.type}
          </span>
          <StatusDot
            status={(strategy.status as "ACTIVE" | "PAUSED") ?? "UNKNOWN"}
          />
        </div>

        {/* 정보 */}
        <div className="grid grid-cols-2 gap-6 flex-1">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
              종목
            </p>
            <p className="text-lg font-semibold">{strategy.ticker}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
              다음 사이클
            </p>
            <p className="text-lg font-semibold">
              {strategy.cycleSeedType === "NONE"
                ? "수동"
                : strategy.cycleSeedType === "MAX"
                  ? "자동(MAX)"
                  : "자동(유지)"}
            </p>
          </div>
          {strategy.initialUsdDeposit != null && (
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
                시작금액
              </p>
              <p className="text-lg font-semibold">
                ${strategy.initialUsdDeposit.toLocaleString("en-US")}
              </p>
            </div>
          )}
        </div>

        {/* 버튼: 하단 고정 */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleToggle}
            disabled={loading}
          >
            {loading
              ? "처리 중..."
              : strategy.status === "ACTIVE"
                ? "중지"
                : "재개"}
          </Button>

        </div>
      </CardContent>
    </Card>
  );
}

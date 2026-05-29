"use client";

interface Props {
  value: number;
  onChange: (value: number) => void;
  deposit: number | null;
  minSeed?: number | null;
  compact?: boolean;
  disabled?: boolean;
}

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PercentGauge({
  value,
  onChange,
  deposit,
  minSeed,
  compact,
  disabled,
}: Props) {
  const handleSize = compact ? 18 : 22;
  const halfHandle = handleSize / 2;
  const trackH = compact ? 8 : 10;
  const allocated = deposit !== null ? Math.round(deposit * value) / 100 : null;

  const depositInsufficient =
    deposit != null && minSeed != null && deposit < minSeed;
  const allDisabled = disabled || depositInsufficient;

  // MIN 클릭 시 세팅할 pct (5 단위 올림)
  const minPct =
    deposit != null && minSeed != null && deposit > 0
      ? Math.min(100, Math.ceil((minSeed / deposit) * 100))
      : null;

  return (
    <div style={{minWidth: 0}}>
      {/* 숫자 입력 행: [MIN] [입력칸] [MAX] */}
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginBottom: compact ? 12 : 14,
          justifyContent: "space-around",
        }}
      >
        {/* MIN 버튼 (minPct가 null이면 hidden) */}
        {minPct !== null && (
          <button
            type="button"
            disabled={allDisabled}
            onClick={() => onChange(minPct)}
            style={{
              height: compact ? 38 : 40,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--muted)",
              color: allDisabled
                ? "var(--muted-foreground)"
                : "var(--foreground)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.05em",
              cursor: allDisabled ? "not-allowed" : "pointer",
              opacity: allDisabled ? 0.5 : 1,
            }}
          >
            MIN
          </button>
        )}

        <div
          style={{
            flex: 1,
            position: "relative",
            height: compact ? 38 : 40,
            borderRadius: 8,
            border: "1px solid var(--rose-400)",
            background: "var(--card)",
            boxShadow: allDisabled
              ? "none"
              : "0 0 0 3px rgba(203,131,106,0.18)",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            opacity: allDisabled ? 0.5 : 1,
            width: "65%",
          }}
        >
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="사용 비율 (%)"
            value={String(value)}
            disabled={allDisabled}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, "");
              if (raw === "") {
                onChange(0);
                return;
              }
              onChange(Math.min(100, Math.max(0, Math.round(Number(raw)))));
            }}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontWeight: 800,
              fontSize: compact ? 16 : 18,
              fontFamily: "inherit",
              color: "var(--foreground)",
              textAlign: "right",
              minWidth: 0,
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "var(--rose-600)",
              marginLeft: 4,
            }}
          >
            %
          </span>
        </div>

        {/* MAX 버튼 */}
        <button
          type="button"
          disabled={allDisabled}
          onClick={() => onChange(100)}
          style={{
            height: compact ? 38 : 40,
            padding: "0 14px",
            borderRadius: 8,
            border: "1px solid var(--rose-400)",
            background: allDisabled
              ? "var(--muted)"
              : "linear-gradient(135deg, var(--rose-400), var(--rose-600))",
            color: allDisabled ? "var(--muted-foreground)" : "#fff",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.05em",
            cursor: allDisabled ? "not-allowed" : "pointer",
            opacity: allDisabled ? 0.5 : 1,
          }}
        >
          MAX
        </button>
      </div>

      {/* 슬라이더 트랙 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 10,
          paddingLeft: halfHandle,
          paddingRight: halfHandle,
        }}
      >
        {/* 슬라이더 트랙 */}
        <div
          style={{
            flex: 1,
            position: "relative",
            height: handleSize + 4,
            opacity: allDisabled ? 0.5 : 1,
          }}
        >
          {/* tick 마크 */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: (handleSize + 4) / 2 - trackH / 2 - 3,
              height: 3,
              display: "flex",
              justifyContent: "space-between",
              pointerEvents: "none",
            }}
          >
            {[0, 25, 50, 75, 100].map((t) => (
              <span
                key={t}
                style={{
                  width: 1,
                  height: 3,
                  background: "var(--border-strong)",
                  opacity: 0.6,
                }}
              />
            ))}
          </div>

          {/* 트랙 배경 */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: (handleSize + 4) / 2 - trackH / 2,
              height: trackH,
              borderRadius: 999,
              background: "var(--muted)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: -1,
                bottom: -1,
                width: `${value}%`,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, var(--rose-300), var(--rose-500))",
                border: "1px solid var(--rose-500)",
              }}
            />
          </div>

          {/* 핸들 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: `${value}%`,
              transform: "translateX(-50%)",
              width: handleSize,
              height: handleSize,
              borderRadius: 999,
              background: "#fff",
              border: "2px solid var(--rose-500)",
              boxShadow: "0 2px 6px rgba(143,68,48,0.28)",
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: 999,
                background: "var(--rose-500)",
              }}
            />
          </div>

          {/* 실제 range input (투명, 위에 씌움) */}
          <input
            type="range"
            aria-label="사용 비율 슬라이더"
            min={0}
            max={100}
            step={1}
            value={value}
            disabled={allDisabled}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              width: "100%",
              opacity: 0,
              cursor: allDisabled ? "not-allowed" : "pointer",
              margin: 0,
            }}
          />
        </div>
      </div>

      {/* tick 라벨 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--muted-foreground)",
          fontWeight: 600,
          marginBottom: 12,
          paddingLeft: halfHandle,
          paddingRight: halfHandle,
        }}
      >
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      {/* 사용 금액 미리보기 / 예수금 부족 경고 */}
      {deposit !== null &&
        (depositInsufficient && minSeed !== null ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              borderRadius: "var(--r-sm)",
              background: "var(--warn-bg)",
              border: "1px solid var(--warn)",
            }}
          >
            <span style={{fontSize: 11, color: "var(--warn)", fontWeight: 700}}>
              예수금 부족
            </span>
            <span
              style={{
                fontSize: compact ? 12 : 13,
                fontWeight: 800,
                color: "var(--warn)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              필요: ${fmtUsd(minSeed)}
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "var(--warn)",
                  marginLeft: 6,
                  opacity: 0.8,
                }}
              >
                / 보유: ${fmtUsd(deposit)}
              </span>
            </span>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              borderRadius: "var(--r-sm)",
              background: "var(--brand-soft-bg)",
              border: "1px solid var(--rose-200)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--brand-fg-soft)",
                fontWeight: 700,
              }}
            >
              사용 금액 예상
            </span>
            <span
              style={{
                fontSize: compact ? 12.5 : 13.5,
                fontWeight: 800,
                color: "var(--brand-fg)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ${allocated !== null ? fmtUsd(allocated) : "--"}
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "var(--muted-foreground)",
                  marginLeft: 6,
                }}
              >
                / ${fmtUsd(deposit)}
              </span>
            </span>
          </div>
        ))}
    </div>
  );
}

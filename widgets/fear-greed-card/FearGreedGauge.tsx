'use client'

// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { PieChart, Pie, Cell } from 'recharts'
import { FEAR_GREED_ZONES, zoneOf } from './fearGreedZones'

interface Props {
  value: number // 0~100
}

// 반원 게이지: 5개 구간 색상 호 + 현재값 바늘
export function FearGreedGauge({ value }: Props) {
  const width = 220
  const height = 130
  const cx = width / 2
  const cy = height - 20 // pivot을 위로 올려 아래 텍스트와 간격 확보
  const radius = 92
  const innerRadius = 62

  // 각 구간 너비를 value 범위 비율로 (전체 100 기준 반원 180도)
  const segments = FEAR_GREED_ZONES.map((z) => ({ ...z, span: z.max - z.min + 1 }))

  // 바늘 각도: value 0→180도(왼쪽), 100→0도(오른쪽)
  const angle = 180 - (Math.min(Math.max(value, 0), 100) / 100) * 180
  const rad = (angle * Math.PI) / 180
  const needleLen = radius - 6
  const nx = cx + needleLen * Math.cos(rad)
  const ny = cy - needleLen * Math.sin(rad)

  const zone = zoneOf(value)

  return (
    <div className="relative flex flex-col items-center">
      {/* recharts PieChart + 바늘 SVG 오버레이를 relative 컨테이너로 묶음 */}
      <div style={{ position: 'relative', width, height }}>
        <PieChart width={width} height={height}>
          <Pie
            data={segments}
            dataKey="span"
            cx={cx}
            cy={cy}
            startAngle={180}
            endAngle={0}
            innerRadius={innerRadius}
            outerRadius={radius}
            stroke="none"
            isAnimationActive={false}
          >
            {segments.map((s) => (
              <Cell key={s.label} fill={s.color} />
            ))}
          </Pie>
        </PieChart>
        {/* 바늘 + 중심 원 — recharts 외부 SVG로 오버레이 (recharts는 raw SVG 자식 미지원) */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          width={width}
          height={height}
        >
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--foreground)" strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={5} fill="var(--foreground)" />
        </svg>
      </div>
      {/* 현재값 + 등급 라벨 */}
      <div className="flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color: zone.color }}>{value}</span>
        <span className="text-sm font-medium" style={{ color: zone.color }}>{zone.label}</span>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

interface DataPoint {
  month: string
  costEur: number
}

interface Props {
  data: DataPoint[]
}

function formatMonth(m: string): string {
  const [year, month] = m.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('de-DE', { month: 'short' })
}

export default function CostChart({ data }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null)

  if (data.length < 2) {
    return (
      <div className="h-14 flex items-center justify-center text-xs text-stahlgrau">
        Zu wenig Daten
      </div>
    )
  }

  const W = 200
  const H = 52
  const PAD = 6
  const maxVal = Math.max(...data.map((d) => d.costEur), 0.0001)

  const points = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - 2 * PAD),
    y: H - PAD - (d.costEur / maxVal) * (H - 2 * PAD),
    month: d.month,
    costEur: d.costEur,
  }))

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${points[0].x},${H} ${polyline} ${points[points.length - 1].x},${H}`

  return (
    <div className="relative select-none">
      <svg
        width={W}
        height={H}
        className="overflow-visible"
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e40af" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#sparkGrad)" />
        <polyline
          points={polyline}
          fill="none"
          stroke="#1e40af"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#1e40af"
            className="cursor-pointer"
            onMouseEnter={() =>
              setTooltip({
                x: p.x,
                y: p.y,
                label: `${formatMonth(p.month)} ${p.month.split('-')[0]}: ${p.costEur.toFixed(4)} €`,
              })
            }
          />
        ))}
        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.x - 4, W - 120)}
              y={tooltip.y - 22}
              width={116}
              height={16}
              rx={3}
              fill="#1e293b"
              opacity={0.85}
            />
            <text
              x={Math.min(tooltip.x - 1, W - 117)}
              y={tooltip.y - 11}
              fontSize={9}
              fill="white"
            >
              {tooltip.label}
            </text>
          </g>
        )}
      </svg>
      <div className="flex justify-between mt-1" style={{ width: W }}>
        {data.map((d, i) => (
          <span key={i} style={{ fontSize: '9px' }} className="text-stahlgrau">
            {formatMonth(d.month)}
          </span>
        ))}
      </div>
    </div>
  )
}

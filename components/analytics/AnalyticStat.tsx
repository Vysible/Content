export interface TrendData {
  pct: number
  dir: 'up' | 'down' | 'flat'
}

export function calcTrend(current: number, prev: number | undefined | null): TrendData | null {
  if (prev === undefined || prev === null || prev === 0) return null
  const pct = ((current - prev) / prev) * 100
  return { pct, dir: Math.abs(pct) < 1 ? 'flat' : pct > 0 ? 'up' : 'down' }
}

export function AnalyticStat({
  label,
  value,
  trendData,
  invertTrend,
}: {
  label: string
  value: string | number
  trendData?: TrendData | null
  invertTrend?: boolean
}) {
  const isPositive = trendData
    ? invertTrend ? trendData.dir === 'down' : trendData.dir === 'up'
    : false
  const isNegative = trendData
    ? invertTrend ? trendData.dir === 'up' : trendData.dir === 'down'
    : false

  return (
    <div className="bg-white border border-stone rounded-xl p-4">
      <p className="text-[10px] font-semibold tracking-wide uppercase text-stahlgrau mb-1">{label}</p>
      <p className="text-2xl font-bold text-nachtblau tabular-nums leading-tight">
        {typeof value === 'number' ? value.toLocaleString('de-DE') : value}
      </p>
      {trendData && (
        <p className={`text-[11px] font-semibold mt-1 ${isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-stahlgrau'}`}>
          {trendData.dir === 'up' ? '↑' : trendData.dir === 'down' ? '↓' : '→'}{' '}
          {Math.abs(trendData.pct).toFixed(1)} % ggü. Vorperiode
        </p>
      )}
    </div>
  )
}

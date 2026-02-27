import type { PerformanceMonth } from '@/lib/types'

interface PerformanceComparisonProps {
  current: PerformanceMonth
  previous: PerformanceMonth | null
  targetCpa: number
}

function CpaStatusBadge({ status }: { status: string }) {
  const config = {
    green: { label: '目標達成', className: 'bg-green-100 text-green-700' },
    yellow: { label: '注意（15%以内超過）', className: 'bg-yellow-100 text-yellow-700' },
    red: { label: '目標超過', className: 'bg-red-100 text-red-700' },
    undefined: { label: 'CVなし', className: 'bg-gray-100 text-gray-500' },
  }[status] || { label: '-', className: 'bg-gray-100 text-gray-500' }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

function DiffBadge({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return <span className="text-gray-400 text-xs">-</span>
  const isPositive = inverse ? value < 0 : value > 0
  const color = isPositive ? 'text-green-600' : value === 0 ? 'text-gray-500' : 'text-red-600'
  const prefix = value > 0 ? '+' : ''
  return <span className={`text-xs font-medium ${color}`}>{prefix}{value.toFixed(1)}%</span>
}

export function PerformanceComparison({ current, previous, targetCpa }: PerformanceComparisonProps) {
  const calcDiff = (curr: number | null, prev: number | null): number | null => {
    if (curr === null || prev === null || prev === 0) return null
    return ((curr - prev) / prev) * 100
  }

  const cvrDiff = calcDiff(current.cvr, previous?.cvr ?? null)
  const cpaDiff = calcDiff(current.cpa, previous?.cpa ?? null)
  const cvDiff = calcDiff(current.final_cv, previous?.final_cv ?? null)
  const costDiff = calcDiff(current.cost, previous?.cost ?? null)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">
        {current.year_month} 実績
        {previous && <span className="text-sm font-normal text-gray-500 ml-2">（先月比）</span>}
        {!previous && <span className="text-sm font-normal text-yellow-600 ml-2">（初月）</span>}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">CPA</p>
            <div className="flex items-baseline gap-2">
              {current.cpa !== null ? (
                <p className="text-xl font-bold text-gray-900">&#xA5;{current.cpa.toLocaleString()}</p>
              ) : (
                <p className="text-sm text-gray-500">計測不可（CVなし）</p>
              )}
              <DiffBadge value={cpaDiff} inverse />
            </div>
            <div className="mt-1">
              <CpaStatusBadge status={current.cpa_status} />
              <p className="text-xs text-gray-400 mt-0.5">目標: &#xA5;{targetCpa.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500">CVR</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-gray-900">
                {current.cvr !== null ? `${(current.cvr * 100).toFixed(2)}%` : '-'}
              </p>
              <DiffBadge value={cvrDiff} />
            </div>
            {previous?.cvr != null && (
              <p className="text-xs text-gray-400">先月: {(previous.cvr * 100).toFixed(2)}%</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">最終CV数</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-gray-900">{current.final_cv}</p>
              <DiffBadge value={cvDiff} />
            </div>
            {previous && (
              <p className="text-xs text-gray-400">先月: {previous.final_cv}</p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-500">広告費</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-gray-900">&#xA5;{current.cost.toLocaleString()}</p>
              <DiffBadge value={costDiff} inverse />
            </div>
            {previous && (
              <p className="text-xs text-gray-400">先月: &#xA5;{previous.cost.toLocaleString()}</p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-500">クリック数</p>
            <p className="text-xl font-bold text-gray-900">{current.clicks.toLocaleString()}</p>
            {previous && (
              <p className="text-xs text-gray-400">先月: {previous.clicks.toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

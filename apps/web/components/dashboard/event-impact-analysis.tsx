import type { PerformanceMonth } from '@/lib/types'

interface CVEventSetting {
  event_name: string
  status: 'active' | 'ended'
  start_month: string | null
  end_month: string | null
  applied_cv_value?: number | null
}

interface EventImpactAnalysisProps {
  endedSettings: CVEventSetting[]
  activeSettings?: CVEventSetting[]
  performances: PerformanceMonth[]
  eventLabels: Record<string, string>
}

interface ImpactResult {
  label: string
  event_name: string
  change_month: string
  cvr_change: number
  cpa_change: number | null
  before: PerformanceMonth
  after: PerformanceMonth
  status: 'active' | 'ended'
  applied_cv_value?: number | null
}

function getPrevMonthStr(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`
}

export function EventImpactAnalysis({ endedSettings, activeSettings = [], performances, eventLabels }: EventImpactAnalysisProps) {
  if (endedSettings.length === 0 && activeSettings.length === 0) return null

  // ended: end_month の前月 vs end_month 以降の最初の月
  const endedImpacts: ImpactResult[] = endedSettings.flatMap(setting => {
    if (!setting.end_month) return []

    const prevMonthStr = getPrevMonthStr(setting.end_month)
    const before = performances.find(p => p.year_month === prevMonthStr)
    const after = performances.find(p => p.year_month === setting.end_month || p.year_month > setting.end_month!)

    if (!before || !after) return []

    const beforeCvr = before.cvr ?? 0
    const afterCvr = after.cvr ?? 0
    if (beforeCvr === 0) return []

    const cvr_change = ((afterCvr - beforeCvr) / beforeCvr) * 100

    const beforeCpa = before.cpa ?? null
    const afterCpa = after.cpa ?? null
    const cpa_change = (beforeCpa && afterCpa && beforeCpa > 0)
      ? ((afterCpa - beforeCpa) / beforeCpa) * 100
      : null

    const label = eventLabels[setting.event_name] ?? setting.event_name

    return [{
      label,
      event_name: setting.event_name,
      change_month: setting.end_month,
      cvr_change,
      cpa_change,
      before,
      after,
      status: 'ended' as const,
      applied_cv_value: setting.applied_cv_value,
    }]
  })

  // active: start_month の前月 vs start_month 以降の直近の月
  const activeImpacts: ImpactResult[] = activeSettings.flatMap(setting => {
    if (!setting.start_month) return []

    const prevMonthStr = getPrevMonthStr(setting.start_month)
    const before = performances.find(p => p.year_month === prevMonthStr)
    // start_month 以降で最も直近（performances は降順ソート済み想定）
    const aftersAsc = performances
      .filter(p => p.year_month >= setting.start_month!)
      .sort((a, b) => b.year_month.localeCompare(a.year_month))
    const after = aftersAsc[0]

    if (!before || !after) return []

    const beforeCvr = before.cvr ?? 0
    const afterCvr = after.cvr ?? 0
    if (beforeCvr === 0) return []

    const cvr_change = ((afterCvr - beforeCvr) / beforeCvr) * 100

    const beforeCpa = before.cpa ?? null
    const afterCpa = after.cpa ?? null
    const cpa_change = (beforeCpa && afterCpa && beforeCpa > 0)
      ? ((afterCpa - beforeCpa) / beforeCpa) * 100
      : null

    const label = eventLabels[setting.event_name] ?? setting.event_name

    return [{
      label,
      event_name: setting.event_name,
      change_month: setting.start_month,
      cvr_change,
      cpa_change,
      before,
      after,
      status: 'active' as const,
      applied_cv_value: setting.applied_cv_value,
    }]
  })

  const impacts = [...activeImpacts, ...endedImpacts]
  if (impacts.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-1">CV設定変更の影響分析</h3>
      <p className="text-xs text-gray-500 mb-3">設定変更前後のCVR・CPA変化を確認できます</p>
      <div className="space-y-3">
        {impacts.map(impact => {
          const cvrPositive = impact.cvr_change > 0
          const cvrNeutral = Math.abs(impact.cvr_change) < 2

          // CPA は下がれば改善（緑）、上がれば悪化（赤）
          const cpaImproved = impact.cpa_change !== null && impact.cpa_change < 0
          const cpaWorsened = impact.cpa_change !== null && impact.cpa_change > 0
          const cpaNeutral = impact.cpa_change === null || Math.abs(impact.cpa_change) < 2

          return (
            <div key={`${impact.event_name}-${impact.status}`} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{impact.label}</p>
                    {impact.status === 'active' ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        設定中
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        終了済み
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xs text-gray-400">
                      {impact.status === 'active' ? `${impact.change_month} から設定` : `${impact.change_month} に除外`}
                    </p>
                    {impact.applied_cv_value != null && (
                      <p className="text-xs text-blue-600">設定CV値: {impact.applied_cv_value}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 flex-shrink-0 text-right">
                  <div>
                    <p className={`text-lg font-bold ${
                      cvrNeutral ? 'text-gray-500' :
                      cvrPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {cvrPositive ? '+' : ''}{impact.cvr_change.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-400">CVR変化</p>
                  </div>
                  {impact.cpa_change !== null && (
                    <div>
                      <p className={`text-lg font-bold ${
                        cpaNeutral ? 'text-gray-500' :
                        cpaImproved ? 'text-green-600' :
                        cpaWorsened ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {impact.cpa_change > 0 ? '+' : ''}{impact.cpa_change.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-400">CPA変化</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                <span>変更前 ({impact.before.year_month}): CVR {((impact.before.cvr ?? 0) * 100).toFixed(2)}%{impact.before.cpa != null ? ` / CPA ¥${impact.before.cpa.toLocaleString()}` : ''}</span>
                <span>→</span>
                <span>変更後 ({impact.after.year_month}): CVR {((impact.after.cvr ?? 0) * 100).toFixed(2)}%{impact.after.cpa != null ? ` / CPA ¥${impact.after.cpa.toLocaleString()}` : ''}</span>
              </div>
              <p className={`text-xs mt-1.5 ${
                cvrNeutral ? 'text-gray-500' :
                cvrPositive ? 'text-green-700' : 'text-red-700'
              }`}>
                {cvrNeutral
                  ? '変更前後でCVRに大きな変化はありません。'
                  : cvrPositive
                  ? impact.status === 'active'
                    ? '設定後にCVRが改善しました。このイベントが貢献している可能性があります。'
                    : '除外後にCVRが改善しました。除外は適切だった可能性があります。'
                  : impact.status === 'active'
                  ? '設定後にCVRが低下しました。設定内容の見直しを検討してください。'
                  : '除外後にCVRが低下しました。このイベントが貢献していた可能性があります。'
                }
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

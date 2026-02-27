import type { RecommendationItem } from '@cv-optimizer/shared-types'

interface RecommendationsTableProps {
  items: RecommendationItem[]
}

const CONFIDENCE_CONFIG = {
  high:   { label: '高', className: 'bg-green-100 text-green-700' },
  medium: { label: '中', className: 'bg-yellow-100 text-yellow-700' },
  low:    { label: '低', className: 'bg-gray-100 text-gray-500' },
}

export function RecommendationsTable({ items }: RecommendationsTableProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">推奨CV値</h3>
        <p className="text-sm text-gray-500">GA4データを接続してCV算出を実行してください。</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-3">推奨CV値</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="pb-2 pr-4">イベント名</th>
              <th className="pb-2 pr-4 text-center">CV値</th>
              <th className="pb-2 pr-4 text-center">信頼度</th>
              <th className="pb-2 pr-4 text-right">P_A</th>
              <th className="pb-2 text-right">A母数</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const conf = CONFIDENCE_CONFIG[item.confidence]
              return (
                <tr key={item.event_name} className="border-b border-gray-50">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-900">{item.label}</span>
                      {item.is_detected_in_lp && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">LP検出</span>
                      )}
                      {item.cap_applied && (
                        <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">
                          {item.cap_applied === 'form_start_cap70' ? 'Cap70' : 'Discount'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono">{item.event_name}</p>
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <span className="text-xl font-bold text-blue-600">{item.cv_value}</span>
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${conf.className}`}>
                      {conf.label}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-600">
                    {(item.p_a * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 text-right text-gray-600">
                    {item.count_a_event.toLocaleString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

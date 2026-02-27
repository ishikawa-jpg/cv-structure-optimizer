import type { Alert } from '@cv-optimizer/shared-types'

interface AlertBannersProps {
  alerts: Alert[]
}

const LEVEL_CONFIG = {
  critical: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800', icon: '!', label: '重大' },
  warning:  { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', icon: '△', label: '警告' },
  info:     { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'i', label: '情報' },
}

export function AlertBanners({ alerts }: AlertBannersProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
        <span className="text-green-600 font-bold text-sm">OK</span>
        <p className="text-sm text-green-700">アラートはありません。CV構造は良好です。</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const config = LEVEL_CONFIG[alert.level]
        return (
          <div key={i} className={`${config.bg} border ${config.border} rounded-lg p-3 flex items-start gap-2`}>
            <span className={`flex-shrink-0 text-xs font-bold ${config.text} w-4 text-center`}>{config.icon}</span>
            <div>
              <span className={`text-xs font-semibold ${config.text} mr-2`}>[{config.label}]</span>
              <span className={`text-sm ${config.text}`}>{alert.message}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

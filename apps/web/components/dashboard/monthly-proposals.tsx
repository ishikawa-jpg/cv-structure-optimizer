import type { MonthlyProposal } from '@/lib/types'

interface MonthlyProposalsProps {
  proposals: MonthlyProposal[]
}

const DIFFICULTY_CONFIG = {
  easy:   { label: '簡単', className: 'bg-green-100 text-green-700' },
  medium: { label: '普通', className: 'bg-yellow-100 text-yellow-700' },
  hard:   { label: '難しい', className: 'bg-red-100 text-red-700' },
}

const SLOT_CONFIG = {
  optimization: { label: '最適化', className: 'bg-orange-100 text-orange-700' },
  enhancement:  { label: '強化',   className: 'bg-blue-100 text-blue-700' },
}

export function MonthlyProposals({ proposals }: MonthlyProposalsProps) {
  if (proposals.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-2">月次提案</h3>
        <p className="text-sm text-gray-500">今月は提案なし — 現状維持で問題ありません。</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-3">月次提案</h3>
      <div className="space-y-3">
        {proposals.map((p, i) => {
          const slotConf = SLOT_CONFIG[p.slot]
          const diffConf = DIFFICULTY_CONFIG[p.difficulty]
          return (
            <div key={i} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${slotConf.className}`}>
                  {slotConf.label}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${diffConf.className}`}>
                  {diffConf.label}
                </span>
                {p.target_event && (
                  <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                    {p.target_event}
                  </span>
                )}
              </div>
              <h4 className="font-medium text-gray-900 mb-1">{p.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{p.description}</p>
              {p.suggested_value !== undefined && (
                <p className="text-sm text-blue-700 font-medium">
                  推奨値: {p.suggested_value}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">理由: {p.reason}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

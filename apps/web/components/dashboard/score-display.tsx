interface ScoreDisplayProps {
  score: number
  breakdown: {
    signal_coverage: number
    value_separation: number
    data_reliability: number
    noise_risk: number
  }
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold" style={{ color }}>{score}</p>
        <p className="text-xs text-gray-500">/ 100</p>
      </div>
    </div>
  )
}

export function ScoreDisplay({ score, breakdown }: ScoreDisplayProps) {
  const items = [
    { label: 'シグナル網羅性', value: breakdown?.signal_coverage ?? 0, max: 30 },
    { label: '値段差構造', value: breakdown?.value_separation ?? 0, max: 30 },
    { label: 'データ信頼性', value: breakdown?.data_reliability ?? 0, max: 25 },
    { label: 'ノイズリスク', value: breakdown?.noise_risk ?? 0, max: 15 },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">CV構造スコア</h3>
      <div className="flex items-center gap-6">
        <ScoreCircle score={score} />
        <div className="flex-1 space-y-2">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                <span>{item.label}</span>
                <span>{item.value} / {item.max}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(item.value / item.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ComputeButtonProps {
  lpId: string
  yearMonth: string
  hasGA4: boolean
}

type MonthRange = 1 | 3 | 6

function calcDateRange(yearMonth: string, months: MonthRange): { startDate: string; endDate: string } {
  // endDate: yearMonth の月末日
  const [year, month] = yearMonth.split('-').map(Number)
  const endDateObj = new Date(year, month, 0) // 翌月0日 = 当月末日
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`

  // startDate: months分遡った月の1日
  const startDateObj = new Date(year, month - 1 - (months - 1), 1)
  const startYear = startDateObj.getFullYear()
  const startMonth = startDateObj.getMonth() + 1
  const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`

  return { startDate, endDate }
}

export function ComputeButton({ lpId, yearMonth, hasGA4 }: ComputeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [monthRange, setMonthRange] = useState<MonthRange>(3)
  const router = useRouter()

  if (!hasGA4) {
    return (
      <a
        href="/api/ga4/auth"
        className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-md hover:bg-yellow-600 transition-colors"
      >
        GA4を接続してCV算出を開始
      </a>
    )
  }

  const handleCompute = async () => {
    setLoading(true)
    setError(null)
    const date_range = calcDateRange(yearMonth, monthRange)
    const res = await fetch(`/api/lps/${lpId}/compute-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year_month: yearMonth, date_range }),
    })
    const json = await res.json()
    if (json.error) {
      setError(json.error.message)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 whitespace-nowrap">
          取得期間:
        </label>
        <select
          value={monthRange}
          onChange={(e) => setMonthRange(Number(e.target.value) as MonthRange)}
          disabled={loading}
          className="text-sm border border-gray-300 rounded-md px-2 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        >
          <option value={1}>1ヶ月</option>
          <option value={3}>3ヶ月</option>
          <option value={6}>6ヶ月</option>
        </select>
        <button
          onClick={handleCompute}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '算出中...' : 'CV構造を診断する'}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

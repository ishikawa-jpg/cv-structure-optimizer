'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ComputeButtonProps {
  lpId: string
  yearMonth: string
  hasGA4: boolean
}

export function ComputeButton({ lpId, yearMonth, hasGA4 }: ComputeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    const res = await fetch(`/api/lps/${lpId}/compute-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year_month: yearMonth }),
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
      <button
        onClick={handleCompute}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {loading ? '算出中...' : 'CV構造を診断する'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

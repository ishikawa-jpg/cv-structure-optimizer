'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AnalyzeButtonProps {
  lpId: string
}

export function AnalyzeButton({ lpId }: AnalyzeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    const res = await fetch(`/api/lps/${lpId}/analyze`, { method: 'POST' })
    const json = await res.json()
    if (json.error) {
      setError(json.error.message || 'LP解析に失敗しました')
    } else {
      setSuccess(true)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="inline-flex items-center px-3 py-1.5 border border-blue-500 text-blue-600 text-sm font-medium rounded-md hover:bg-blue-50 disabled:opacity-50 transition-colors"
      >
        {loading ? 'LP解析中...' : 'LP解析を実行'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {success && <p className="mt-1 text-xs text-green-600">LP解析完了</p>}
    </div>
  )
}

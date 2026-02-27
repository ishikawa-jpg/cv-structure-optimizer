'use client'

import { useEffect } from 'react'

export default function LPDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('LP detail error:', error)
  }, [error])

  return (
    <div className="max-w-lg mt-8 p-6 bg-white rounded-lg border border-red-200">
      <h2 className="text-lg font-semibold text-red-700 mb-2">ページの読み込みに失敗しました</h2>
      <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded mb-4 overflow-auto whitespace-pre-wrap">
        {error.message}
      </pre>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
      >
        再試行
      </button>
    </div>
  )
}

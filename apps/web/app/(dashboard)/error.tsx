'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 bg-white rounded-lg border border-red-200">
      <h2 className="text-lg font-semibold text-red-700 mb-2">エラーが発生しました</h2>
      <p className="text-sm text-gray-600 mb-4">{error.message}</p>
      {error.digest && (
        <p className="text-xs text-gray-400 mb-4">digest: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
      >
        再試行
      </button>
    </div>
  )
}

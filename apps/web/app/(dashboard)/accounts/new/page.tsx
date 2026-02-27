'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAccountPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const json = await res.json()

    if (json.error) {
      setError(json.error.message)
      setIsLoading(false)
      return
    }

    router.push(`/accounts/${json.data.id}`)
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新規アカウント作成</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            アカウント名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 株式会社〇〇 広告アカウント"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? '作成中...' : '作成する'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  )
}

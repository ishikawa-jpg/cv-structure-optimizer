'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function NewLPPage() {
  const router = useRouter()
  const params = useParams()
  const accountId = params.accountId as string

  const [form, setForm] = useState({
    name: '',
    url: '',
    final_event_name: '',
    target_cpa: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const res = await fetch(`/api/accounts/${accountId}/lps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()

    if (json.error) {
      setError(json.error.message)
      setIsLoading(false)
      return
    }

    router.push(`/lps/${json.data.id}`)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/accounts" className="hover:text-blue-600">アカウント一覧</Link>
        <span>/</span>
        <Link href={`/accounts/${accountId}`} className="hover:text-blue-600">アカウント詳細</Link>
        <span>/</span>
        <span className="text-gray-900">LP追加</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">LP追加</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LP名（任意）</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="例: 資料請求LP"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LP URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://example.com/lp"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            最終CVイベント名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.final_event_name}
            onChange={(e) => setForm({ ...form, final_event_name: e.target.value })}
            placeholder="例: generate_lead, purchase"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">GA4で計測している最終コンバージョンのイベント名</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            目標CPA（円） <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.target_cpa}
            onChange={(e) => setForm({ ...form, target_cpa: e.target.value })}
            placeholder="例: 50000"
            min="1"
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
            {isLoading ? '追加中...' : 'LPを追加する'}
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

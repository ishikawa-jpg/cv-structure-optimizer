'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function NewMonthPage() {
  const router = useRouter()
  const params = useParams()
  const lpId = params.lpId as string

  // 当月をデフォルト
  const now = new Date()
  const defaultYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [form, setForm] = useState({
    year_month: defaultYearMonth,
    clicks: '',
    cost: '',
    final_cv: '',
    impressions: '',
    notes: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const res = await fetch(`/api/lps/${lpId}/performance`, {
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

    router.push(`/lps/${lpId}`)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href={`/lps/${lpId}`} className="hover:text-blue-600">LP詳細</Link>
        <span>/</span>
        <span className="text-gray-900">月次データ入力</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">月次データ入力</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            対象月 <span className="text-red-500">*</span>
          </label>
          <input
            type="month"
            value={form.year_month}
            onChange={(e) => setForm({ ...form, year_month: e.target.value })}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              クリック数 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.clicks}
              onChange={(e) => setForm({ ...form, clicks: e.target.value })}
              placeholder="例: 1000"
              min="0"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              広告費（円） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              placeholder="例: 500000"
              min="0"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最終CV数 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.final_cv}
              onChange={(e) => setForm({ ...form, final_cv: e.target.value })}
              placeholder="例: 20"
              min="0"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              表示回数（任意）
            </label>
            <input
              type="number"
              value={form.impressions}
              onChange={(e) => setForm({ ...form, impressions: e.target.value })}
              placeholder="例: 50000"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="施策内容や特記事項など"
            rows={3}
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
            {isLoading ? '保存中...' : 'データを保存する'}
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

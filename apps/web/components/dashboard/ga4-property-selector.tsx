'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Property {
  id: string
  name: string
}

export function GA4PropertySelector({ accountId, currentPropertyName }: {
  accountId: string
  currentPropertyName: string | null
}) {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const fetchProperties = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ga4/properties')
      const json = await res.json()
      if (json.error) {
        setError(json.error.message)
      } else {
        setProperties(json.data || [])
        setOpen(true)
      }
    } catch {
      setError('プロパティ一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedId) return
    const prop = properties.find(p => p.id === selectedId)
    if (!prop) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/ga4-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ga4_property_id: prop.id, ga4_property_name: prop.name }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error.message)
      } else {
        setOpen(false)
        router.refresh()
      }
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (currentPropertyName) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
          GA4: {currentPropertyName}
        </span>
        <button
          onClick={fetchProperties}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          {loading ? '取得中...' : '変更'}
        </button>
      </div>
    )
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={fetchProperties}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-300 rounded px-3 py-1 hover:bg-blue-50 transition-colors"
        >
          {loading ? 'GA4プロパティ取得中...' : 'GA4プロパティを設定'}
        </button>
      ) : (
        <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm max-w-sm">
          <p className="text-sm font-medium text-gray-700 mb-2">GA4プロパティを選択してください</p>
          {properties.length === 0 ? (
            <p className="text-sm text-gray-500">プロパティが見つかりません</p>
          ) : (
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mb-2"
            >
              <option value="">-- 選択してください --</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!selectedId || saving}
              className="text-sm bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-sm text-gray-600 rounded px-3 py-1 hover:bg-gray-100"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
      {error && !open && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

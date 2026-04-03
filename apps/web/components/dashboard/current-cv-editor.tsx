'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type { RecommendationItem } from '@/lib/types'

interface CurrentCVEditorProps {
  lpId: string
  yearMonth: string
  items: RecommendationItem[]
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const CONFIDENCE_CLASS: Record<string, string> = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
}

const MISMATCH_THRESHOLD = 20

interface MismatchAlert {
  level: 'warning' | 'info'
  label: string
  currentVal: number
  recommended: number
}

interface CVEventSetting {
  event_name: string
  status: 'active' | 'ended'
  start_month: string | null
  end_month: string | null
  applied_cv_value: number | null
}

function getStorageKey(lpId: string, yearMonth: string) {
  return `cv-settings-${lpId}-${yearMonth}`
}

function computeMismatchAlerts(items: RecommendationItem[], settings: Record<string, string>): MismatchAlert[] {
  const alerts: MismatchAlert[] = []
  for (const item of items) {
    const currentStr = settings[item.event_name] ?? ''
    if (currentStr === '') continue
    const currentVal = parseInt(currentStr, 10)
    if (isNaN(currentVal)) continue
    const diff = item.cv_value - currentVal
    if (Math.abs(diff) >= MISMATCH_THRESHOLD) {
      alerts.push({
        level: diff < 0 ? 'warning' : 'info',
        label: item.label,
        currentVal,
        recommended: item.cv_value,
      })
    }
  }
  return alerts
}

function StatusCell({
  eventName,
  setting,
  loading,
  yearMonth,
  recommendedValue,
  onStatusChange,
}: {
  eventName: string
  setting: CVEventSetting | null
  loading: boolean
  yearMonth: string
  recommendedValue: number
  onStatusChange: (eventName: string, status: 'active' | 'ended' | null, month?: string, appliedCvValue?: number) => void
}) {
  const status = setting?.status ?? null

  if (loading) return <span className="text-xs text-gray-400">...</span>

  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="flex gap-1">
        <button
          onClick={() => onStatusChange(eventName, status === 'active' ? null : 'active')}
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
            status === 'active'
              ? 'bg-green-100 border-green-400 text-green-800 font-medium'
              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          設定中
        </button>
        <button
          onClick={() => onStatusChange(eventName, status === 'ended' ? null : 'ended')}
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
            status === 'ended'
              ? 'bg-gray-200 border-gray-400 text-gray-700 font-medium'
              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          終了済み
        </button>
      </div>
      {status === 'active' && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">開始:</span>
            <input
              type="month"
              defaultValue={setting?.start_month ?? yearMonth}
              onChange={e => onStatusChange(eventName, 'active', e.target.value, setting?.applied_cv_value ?? undefined)}
              className="text-xs border border-gray-200 rounded px-1 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-green-400"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">設定値:</span>
            <input
              type="text"
              inputMode="numeric"
              key={`${eventName}-cv`}
              defaultValue={setting?.applied_cv_value ?? recommendedValue}
              onChange={e => {
                const v = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10)
                if (!isNaN(v)) onStatusChange(eventName, 'active', setting?.start_month ?? yearMonth, v)
              }}
              className="text-xs border border-gray-200 rounded px-1 py-0.5 w-14 text-center focus:outline-none focus:ring-1 focus:ring-green-400"
              placeholder="CV値"
            />
          </div>
        </div>
      )}
      {status === 'ended' && (
        <div className="space-y-0.5">
          {setting?.start_month && (
            <p className="text-xs text-gray-400">開始: {setting.start_month}</p>
          )}
          {setting?.applied_cv_value != null && (
            <p className="text-xs text-gray-400">設定値: <span className="font-medium text-gray-600">{setting.applied_cv_value}</span></p>
          )}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">終了:</span>
            <input
              type="month"
              defaultValue={setting?.end_month ?? yearMonth}
              onChange={e => onStatusChange(eventName, 'ended', e.target.value)}
              className="text-xs border border-gray-200 rounded px-1 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function CurrentCVEditor({ lpId, yearMonth, items }: CurrentCVEditorProps) {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [eventSettings, setEventSettings] = useState<Record<string, CVEventSetting>>({})
  const [settingsLoading, setSettingsLoading] = useState<Record<string, boolean>>({})

  // マウント時に localStorage から読み込む
  useEffect(() => {
    const stored = localStorage.getItem(getStorageKey(lpId, yearMonth))
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, number>
      setSettings(Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)])))
    }
  }, [lpId, yearMonth])

  useEffect(() => {
    fetch(`/api/lps/${lpId}/cv-settings`)
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          const map: Record<string, CVEventSetting> = {}
          for (const s of json.data) map[s.event_name] = s
          setEventSettings(map)
        }
      })
  }, [lpId])

  const mismatchAlerts = computeMismatchAlerts(items, settings)

  const handleChange = (eventName: string, value: string) => {
    setSettings((prev) => ({ ...prev, [eventName]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    const parsed: Record<string, number> = {}
    for (const [k, v] of Object.entries(settings)) {
      const n = parseInt(v, 10)
      if (!isNaN(n) && n >= 0 && n <= 100) parsed[k] = n
    }
    localStorage.setItem(getStorageKey(lpId, yearMonth), JSON.stringify(parsed))
    setSaved(true)
    // MonthlyProposals に変更を通知
    window.dispatchEvent(new CustomEvent('cv-settings-change', { detail: parsed }))
  }

  const handleStatusChange = useCallback(async (
    eventName: string,
    newStatus: 'active' | 'ended' | null,
    month?: string,
    appliedCvValue?: number
  ) => {
    setSettingsLoading(prev => ({ ...prev, [eventName]: true }))
    try {
      if (newStatus === null) {
        // 未設定に戻す → DELETE
        await fetch(`/api/lps/${lpId}/cv-settings?event_name=${encodeURIComponent(eventName)}`, { method: 'DELETE' })
        setEventSettings(prev => {
          const next = { ...prev }
          delete next[eventName]
          return next
        })
      } else {
        const current = eventSettings[eventName]
        const body: Record<string, string | number | null> = {
          event_name: eventName,
          status: newStatus,
          start_month: newStatus === 'active' ? (month ?? yearMonth) : (current?.start_month ?? null),
          end_month: newStatus === 'ended' ? (month ?? yearMonth) : null,
          applied_cv_value: appliedCvValue !== undefined ? appliedCvValue : (current?.applied_cv_value ?? null),
        }
        const res = await fetch(`/api/lps/${lpId}/cv-settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (json.data) {
          setEventSettings(prev => ({ ...prev, [eventName]: json.data }))
        }
      }
    } finally {
      setSettingsLoading(prev => ({ ...prev, [eventName]: false }))
    }
  }, [lpId, yearMonth, eventSettings])

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">推奨CV値 / 現在の設定値</h3>
        <p className="text-sm text-gray-500 mb-2">GA4に中間イベントが見つかりませんでした。</p>
        <p className="text-xs text-gray-400">
          form_start・cta_click・section_view 等の中間イベントをGTMで計測することで、CV値の推奨が可能になります。
          下の「GA4/GTM 設定 ToDo」を参考に計測を追加してください。
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">推奨CV値 / 現在の設定値</h3>
        <button
          onClick={handleSave}
          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {saved ? '保存済み ✓' : '設定値を保存'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3">イベント名</th>
              <th className="text-center text-xs font-medium text-gray-500 pb-2 px-2">現在値</th>
              <th className="text-center text-xs font-medium text-gray-500 pb-2 px-2">推奨値</th>
              <th className="text-center text-xs font-medium text-gray-500 pb-2 px-2">差分</th>
              <th className="text-center text-xs font-medium text-gray-500 pb-2 px-2">信頼度</th>
              <th className="text-right text-xs font-medium text-gray-500 pb-2 pl-2">相関率</th>
              <th className="text-center text-xs font-medium text-gray-500 pb-2 pl-3">Google広告設定</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => {
              const currentStr = settings[item.event_name] ?? ''
              const currentVal = currentStr !== '' ? parseInt(currentStr, 10) : null
              const diff = currentVal !== null && !isNaN(currentVal) ? item.cv_value - currentVal : null

              let diffNode: React.ReactNode = <span className="text-gray-300 text-xs">—</span>
              if (diff !== null) {
                if (diff > 0) {
                  diffNode = <span className="text-green-600 font-medium text-xs">&#x25B2;+{diff}</span>
                } else if (diff < 0) {
                  diffNode = <span className="text-red-500 font-medium text-xs">&#x25BC;{diff}</span>
                } else {
                  diffNode = <span className="text-gray-400 text-xs">－</span>
                }
              }

              return (
                <tr key={item.event_name}>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-gray-800">{item.label}</span>
                      {item.is_detected_in_lp && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">LP検出</span>
                      )}
                      {item.cap_applied && (
                        <span className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">
                          {item.cap_applied === 'form_start_cap70' ? 'Cap70' : 'Discount'}
                        </span>
                      )}
                      {item.stability === 'unstable' && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded">変動あり</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.event_name}</div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={currentStr}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '')
                        handleChange(item.event_name, v)
                      }}
                      placeholder="—"
                      className="w-14 text-center border border-gray-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="font-bold text-blue-600">{item.cv_value}</span>
                  </td>
                  <td className="py-2 px-2 text-center">{diffNode}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${CONFIDENCE_CLASS[item.confidence]}`}>
                      {CONFIDENCE_LABEL[item.confidence]}
                    </span>
                  </td>
                  <td className="py-2 pl-2 text-right text-xs text-gray-600">
                    {(item.p_a * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 pl-3">
                    <StatusCell
                      eventName={item.event_name}
                      setting={eventSettings[item.event_name] ?? null}
                      loading={settingsLoading[item.event_name] ?? false}
                      yearMonth={yearMonth}
                      recommendedValue={item.cv_value}
                      onStatusChange={handleStatusChange}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {mismatchAlerts.length > 0 && (
        <div className="mt-3 space-y-2">
          {mismatchAlerts.map((alert) => (
            <div
              key={alert.label}
              className={`text-xs rounded px-3 py-2 ${
                alert.level === 'warning'
                  ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}
            >
              {alert.level === 'warning' ? '[警告] ' : '[情報] '}
              <span className="font-medium">{alert.label}</span>
              {alert.level === 'warning'
                ? ` の現在値（${alert.currentVal}）が推奨値（${alert.recommended}）より大幅に高い状態です。CPA悪化時は推奨値への引き下げを検討してください。`
                : ` の現在値（${alert.currentVal}）が推奨値（${alert.recommended}）より低い状態です。推奨値に合わせることでシグナルが改善する可能性があります。`}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

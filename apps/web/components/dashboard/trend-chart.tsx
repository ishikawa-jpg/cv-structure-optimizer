'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { PerformanceMonth } from '@/lib/types'

interface TrendChartProps {
  performances: PerformanceMonth[]
  targetCpa: number
}

export function TrendChart({ performances, targetCpa }: TrendChartProps) {
  if (performances.length < 2) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 text-center text-gray-500 text-sm">
        トレンドグラフは2ヶ月以上のデータが必要です
      </div>
    )
  }

  const data = [...performances]
    .sort((a, b) => a.year_month.localeCompare(b.year_month))
    .map((p) => ({
      month: p.year_month,
      CPA: p.cpa,
      CVR: p.cvr !== null ? Math.round(p.cvr * 10000) / 100 : null,
      CV数: p.final_cv,
    }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">CPA / CVR トレンド</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="cpa" orientation="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `\u00a5${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="cvr" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'CPA') return [`\u00a5${Number(value).toLocaleString()}`, 'CPA']
                if (name === 'CVR') return [`${value}%`, 'CVR']
                return [value, name]
              }}
            />
            <Legend />
            <Line yAxisId="cpa" type="monotone" dataKey="CPA" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} connectNulls />
            <Line yAxisId="cvr" type="monotone" dataKey="CVR" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} connectNulls />
            <Line yAxisId="cpa" type="monotone" dataKey={() => targetCpa} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} dot={false} name="目標CPA" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

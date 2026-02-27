// GA4イベントデータ取得のヘルパー関数

export interface EventCountResult {
  event_name: string
  count: number
}

// GA4レポートAPIレスポンスをパース
export function parseGA4Report(reportData: {
  rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }>
}): EventCountResult[] {
  if (!reportData.rows) return []
  return reportData.rows.map((row) => ({
    event_name: row.dimensionValues[0].value,
    count: parseInt(row.metricValues[0].value, 10),
  }))
}

// 広告流入フィルタ（session_source=google AND session_medium=cpc）
export const PAID_SEARCH_FILTER = {
  andGroup: {
    expressions: [
      {
        filter: {
          fieldName: 'sessionSource',
          stringFilter: { matchType: 'EXACT', value: 'google' },
        },
      },
      {
        filter: {
          fieldName: 'sessionMedium',
          stringFilter: { matchType: 'EXACT', value: 'cpc' },
        },
      },
    ],
  },
}

// イベントカウントを取得する共通関数（A: 全流入 / B: 広告流入）
export async function fetchEventCounts(
  propertyId: string,
  dateRange: { startDate: string; endDate: string },
  baseUrl: string,
  authHeader: string
): Promise<{ a: EventCountResult[]; b: EventCountResult[] }> {
  const fetchReport = async (dimensionFilter?: object) => {
    const res = await fetch(`${baseUrl}/api/ga4/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        propertyId,
        dateRange,
        metrics: ['eventCount'],
        dimensions: ['eventName'],
        dimensionFilter,
      }),
    })
    const json = await res.json()
    return json.data ? parseGA4Report(json.data) : []
  }

  const [a, b] = await Promise.all([
    fetchReport(), // A: 全流入
    fetchReport(PAID_SEARCH_FILTER), // B: 広告流入
  ])

  return { a, b }
}

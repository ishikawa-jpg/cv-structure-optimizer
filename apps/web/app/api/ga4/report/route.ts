import { createClient } from '@/lib/supabase/server'
import { getValidGA4Token } from '@/lib/ga4/token'
import { NextResponse } from 'next/server'

export interface GA4ReportRequest {
  propertyId: string
  dateRange: { startDate: string; endDate: string }
  metrics: string[]
  dimensions: string[]
  dimensionFilter?: object
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const accessToken = await getValidGA4Token(user.id)
  if (!accessToken) {
    return NextResponse.json({ data: null, error: { code: 'GA4_NOT_CONNECTED', message: 'GA4が未連携です' } }, { status: 400 })
  }

  const body: GA4ReportRequest = await request.json()
  const { propertyId, dateRange, metrics, dimensions, dimensionFilter } = body

  const requestBody: Record<string, unknown> = {
    dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
    metrics: metrics.map((m) => ({ name: m })),
    dimensions: dimensions.map((d) => ({ name: d })),
  }

  if (dimensionFilter) {
    requestBody.dimensionFilter = dimensionFilter
  }

  try {
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!res.ok) {
      const errData = await res.json()
      return NextResponse.json({ data: null, error: { code: 'GA4_API_ERROR', message: errData.error?.message || 'GA4 APIエラー' } }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: { code: 'NETWORK_ERROR', message: 'ネットワークエラーが発生しました' } }, { status: 500 })
  }
}

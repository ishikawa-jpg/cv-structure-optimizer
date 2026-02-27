import { createClient } from '@/lib/supabase/server'
import { getValidGA4Token } from '@/lib/ga4/token'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const accessToken = await getValidGA4Token(user.id)
  if (!accessToken) {
    return NextResponse.json({ data: null, error: { code: 'GA4_NOT_CONNECTED', message: 'GA4が未連携です' } }, { status: 400 })
  }

  try {
    const res = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!res.ok) {
      const errData = await res.json()
      return NextResponse.json({ data: null, error: { code: 'GA4_API_ERROR', message: errData.error?.message || 'GA4 APIエラー' } }, { status: 500 })
    }

    const data = await res.json()
    const properties: { id: string; name: string }[] = []
    for (const account of (data.accountSummaries || [])) {
      for (const prop of (account.propertySummaries || [])) {
        properties.push({
          id: (prop.property as string).replace('properties/', ''),
          name: prop.displayName as string,
        })
      }
    }

    return NextResponse.json({ data: properties, error: null })
  } catch {
    return NextResponse.json({ data: null, error: { code: 'NETWORK_ERROR', message: 'ネットワークエラーが発生しました' } }, { status: 500 })
  }
}

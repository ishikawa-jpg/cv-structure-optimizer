import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ lpId: string }> }
) {
  const { lpId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  // LP情報取得
  const { data: lp } = await supabase
    .from('lps')
    .select('url')
    .eq('id', lpId)
    .single()

  if (!lp) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'LPが見つかりません' } }, { status: 404 })

  const serviceUrl = process.env.PLAYWRIGHT_SERVICE_URL
  const serviceSecret = process.env.PLAYWRIGHT_SERVICE_SECRET

  if (!serviceUrl || !serviceSecret) {
    return NextResponse.json(
      { data: null, error: { code: 'SERVICE_NOT_CONFIGURED', message: 'LP解析サービスが設定されていません' } },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(`${serviceUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-secret': serviceSecret,
      },
      body: JSON.stringify({ url: lp.url }),
      signal: AbortSignal.timeout(35000), // 35秒タイムアウト
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Unknown error' }))
      const code = res.status === 504 ? 'TIMEOUT' : 'ANALYZE_ERROR'
      return NextResponse.json(
        { data: null, error: { code, message: errData.error || 'LP解析に失敗しました' } },
        { status: res.status }
      )
    }

    const analysisResult = await res.json()

    // 解析結果をdesign_versionsに保存（現在月のバージョンに紐付け）
    const yearMonth = new Date().toISOString().substring(0, 7)
    await supabase
      .from('design_versions')
      .upsert(
        {
          lp_id: lpId,
          year_month: yearMonth,
          recommendations_json: null,
          diagnostics_json: { lp_analysis: analysisResult },
        },
        { onConflict: 'lp_id,year_month' }
      )

    return NextResponse.json({ data: analysisResult, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('timeout') || message.includes('AbortError')) {
      return NextResponse.json(
        { data: null, error: { code: 'TIMEOUT', message: 'LP解析がタイムアウトしました。再試行してください。' } },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { data: null, error: { code: 'NETWORK_ERROR', message: 'LP解析サービスへの接続に失敗しました' } },
      { status: 503 }
    )
  }
}

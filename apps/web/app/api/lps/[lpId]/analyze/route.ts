import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { analyzeLp } from '@/lib/lp-analyzer/analyzer'

export async function POST(
  request: Request,
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

  const body = await request.json().catch(() => ({}))
  const yearMonth: string = body.year_month || new Date().toISOString().substring(0, 7)

  try {
    const analysisResult = await analyzeLp(lp.url)

    if (analysisResult.error) {
      return NextResponse.json(
        { data: null, error: { code: 'ANALYZE_ERROR', message: analysisResult.error } },
        { status: 502 }
      )
    }

    // 解析結果をdesign_versionsに保存
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
    return NextResponse.json(
      { data: null, error: { code: 'ANALYZE_ERROR', message: `LP解析に失敗しました: ${message}` } },
      { status: 500 }
    )
  }
}

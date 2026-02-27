import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function calcMetrics(clicks: number, cost: number, finalCv: number, targetCpa: number) {
  const cvr = clicks > 0 ? finalCv / clicks : 0
  const cpa = finalCv > 0 ? Math.round(cost / finalCv) : null
  const cpaStatus =
    cpa === null ? 'undefined' :
    cpa <= targetCpa ? 'green' :
    cpa <= targetCpa * 1.15 ? 'yellow' : 'red'
  return { cvr, cpa, cpaStatus }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lpId: string }> }
) {
  const { lpId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const { data, error } = await supabase
    .from('performance_months')
    .select('*')
    .eq('lp_id', lpId)
    .order('year_month', { ascending: false })

  if (error) return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lpId: string }> }
) {
  const { lpId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  // LP情報を取得（target_cpa 取得のため）
  const { data: lp } = await supabase
    .from('lps')
    .select('target_cpa')
    .eq('id', lpId)
    .single()

  if (!lp) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'LPが見つかりません' } }, { status: 404 })

  const body = await request.json()
  const { year_month, clicks, cost, final_cv, impressions, notes } = body

  // バリデーション
  if (!year_month?.match(/^\d{4}-\d{2}$/)) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: '年月の形式が不正です（YYYY-MM）' } }, { status: 400 })
  }
  if (clicks == null || clicks < 0) return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'クリック数は0以上の整数で入力してください' } }, { status: 400 })
  if (cost == null || cost < 0) return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'コストは0以上の整数で入力してください' } }, { status: 400 })
  if (final_cv == null || final_cv < 0) return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'CVは0以上の整数で入力してください' } }, { status: 400 })

  const { cvr, cpa, cpaStatus } = calcMetrics(
    parseInt(clicks), parseInt(cost), parseInt(final_cv), lp.target_cpa
  )

  const { data, error } = await supabase
    .from('performance_months')
    .upsert({
      lp_id: lpId,
      year_month,
      clicks: parseInt(clicks),
      cost: parseInt(cost),
      final_cv: parseInt(final_cv),
      impressions: impressions ? parseInt(impressions) : null,
      notes: notes || null,
      cvr,
      cpa,
      cpa_status: cpaStatus,
    }, { onConflict: 'lp_id,year_month' })
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null }, { status: 201 })
}

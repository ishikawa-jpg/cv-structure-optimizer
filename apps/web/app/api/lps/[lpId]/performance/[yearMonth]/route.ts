import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lpId: string; yearMonth: string }> }
) {
  const { lpId, yearMonth } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const { data, error } = await supabase
    .from('performance_months')
    .select('*')
    .eq('lp_id', lpId)
    .eq('year_month', yearMonth)
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: '該当月のデータが見つかりません' } }, { status: 404 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ lpId: string; yearMonth: string }> }
) {
  const { lpId, yearMonth } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const { data: lp } = await supabase
    .from('lps')
    .select('target_cpa')
    .eq('id', lpId)
    .single()

  if (!lp) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'LPが見つかりません' } }, { status: 404 })

  const body = await request.json()
  const { clicks, cost, final_cv, impressions, notes } = body

  const cvr = clicks > 0 ? final_cv / clicks : 0
  const cpa = final_cv > 0 ? Math.round(cost / final_cv) : null
  const cpaStatus =
    cpa === null ? 'undefined' :
    cpa <= lp.target_cpa ? 'green' :
    cpa <= lp.target_cpa * 1.15 ? 'yellow' : 'red'

  const { data, error } = await supabase
    .from('performance_months')
    .update({ clicks, cost, final_cv, impressions, notes, cvr, cpa, cpa_status: cpaStatus })
    .eq('lp_id', lpId)
    .eq('year_month', yearMonth)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

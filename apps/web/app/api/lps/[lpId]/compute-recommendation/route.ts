import { createClient } from '@/lib/supabase/server'
import { getValidGA4Token } from '@/lib/ga4/token'
import { parseGA4Report, PAID_SEARCH_FILTER } from '@/lib/ga4/data-api'
import { generateRecommendations } from '@/lib/cv-calculator/generate-recommendations'
import { generateDiagnostics } from '@/lib/cv-calculator/generate-diagnostics'
import { zTestCVR } from '@/lib/statistics'
import { NextResponse } from 'next/server'
import type { CPAStatus, CVRJudgment } from '@/lib/statistics'

function getPrevMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  if (month === 1) return `${year - 1}-12`
  return `${year}-${String(month - 1).padStart(2, '0')}`
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lpId: string }> }
) {
  const { lpId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const body = await request.json()
  const { year_month, date_range } = body

  if (!year_month?.match(/^\d{4}-\d{2}$/)) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: '年月の形式が不正です' } }, { status: 400 })
  }

  const { data: lp } = await supabase
    .from('lps')
    .select('*, accounts!inner(ga4_property_id)')
    .eq('id', lpId)
    .single()

  if (!lp) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'LPが見つかりません' } }, { status: 404 })

  const account = lp.accounts as { ga4_property_id: string | null }
  if (!account.ga4_property_id) {
    return NextResponse.json({ data: null, error: { code: 'GA4_NOT_CONNECTED', message: 'GA4プロパティが設定されていません' } }, { status: 400 })
  }

  const accessToken = await getValidGA4Token(user.id)
  if (!accessToken) {
    return NextResponse.json({ data: null, error: { code: 'GA4_TOKEN_MISSING', message: 'GA4が未連携です' } }, { status: 400 })
  }

  // 日付範囲
  const startDate = date_range?.startDate || `${year_month}-01`
  const endDateObj = new Date(`${startDate}`)
  endDateObj.setMonth(endDateObj.getMonth() + 1)
  endDateObj.setDate(0)
  const endDate = date_range?.endDate || endDateObj.toISOString().substring(0, 10)

  const ga4Url = `https://analyticsdata.googleapis.com/v1beta/properties/${account.ga4_property_id}:runReport`
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  const reportBody = {
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: 'eventCount' }],
    dimensions: [{ name: 'eventName' }],
  }

  try {
    const [resA, resB] = await Promise.all([
      fetch(ga4Url, { method: 'POST', headers, body: JSON.stringify(reportBody) }),
      fetch(ga4Url, { method: 'POST', headers, body: JSON.stringify({ ...reportBody, dimensionFilter: PAID_SEARCH_FILTER }) }),
    ])

    if (!resA.ok || !resB.ok) {
      return NextResponse.json({ data: null, error: { code: 'GA4_API_ERROR', message: 'GA4 APIの呼び出しに失敗しました' } }, { status: 500 })
    }

    const [dataA, dataB] = await Promise.all([resA.json(), resB.json()])
    const eventsA = parseGA4Report(dataA)
    const eventsB = parseGA4Report(dataB)

    // LP解析結果を取得（あれば）
    const { data: designVersion } = await supabase
      .from('design_versions')
      .select('diagnostics_json')
      .eq('lp_id', lpId)
      .eq('year_month', year_month)
      .single()

    const lpAnalysis = (designVersion?.diagnostics_json as { lp_analysis?: unknown } | null)?.lp_analysis || null

    // 月次成果データ取得（z検定のため）
    const prevMonth = getPrevMonth(year_month)
    const { data: performances } = await supabase
      .from('performance_months')
      .select('*')
      .eq('lp_id', lpId)
      .in('year_month', [year_month, prevMonth])
      .order('year_month', { ascending: false })

    // 前月のdesign_versionsから前月P_A値とイベント数を取得
    const { data: prevDesignVersion } = await supabase
      .from('design_versions')
      .select('recommendations_json')
      .eq('lp_id', lpId)
      .eq('year_month', prevMonth)
      .single()

    const prevRecommendations = prevDesignVersion?.recommendations_json as { items?: Array<{ event_name: string; p_a: number; count_a_event: number }> } | null
    const prevMonthPaValues: Record<string, number> = {}
    const prevMonthEventCounts: Record<string, number> = {}
    if (prevRecommendations?.items) {
      for (const item of prevRecommendations.items) {
        prevMonthPaValues[item.event_name] = item.p_a
        prevMonthEventCounts[item.event_name] = item.count_a_event
      }
    }

    const currentPerf = performances?.find((p) => p.year_month === year_month)
    const prevPerf = performances?.find((p) => p.year_month === prevMonth)

    // 推奨CV値生成
    const recommendations = generateRecommendations(
      lp.final_event_name,
      eventsA,
      eventsB,
      { start: startDate, end: endDate },
      lpAnalysis as Parameters<typeof generateRecommendations>[4],
      lp.final_cv_value ?? null,
      prevMonthPaValues,
      prevMonthEventCounts
    )

    // CVR z検定
    const cvrResult = currentPerf && prevPerf
      ? zTestCVR(
          { final_cv: prevPerf.final_cv, clicks: prevPerf.clicks },
          { final_cv: currentPerf.final_cv, clicks: currentPerf.clicks }
        )
      : null

    // スコア内訳（簡易算出）
    const score = recommendations.total_cv_score
    const scoreBreakdown = {
      signal_coverage: Math.round(score * 0.30),
      value_separation: Math.round(score * 0.30),
      data_reliability: Math.round(score * 0.25),
      noise_risk: Math.round(score * 0.15),
    }

    const diagnostics = generateDiagnostics({
      recommendations: recommendations.items,
      cpaStatus: ((currentPerf?.cpa_status as CPAStatus) || 'undefined'),
      cvrJudgment: ((cvrResult?.judgment as CVRJudgment) || 'insufficient_data'),
      isPrevMonthExists: !!prevPerf,
      totalCvScore: score,
      scoreBreakdown,
      hasAnchorJumpRisk: (lpAnalysis as { flags?: { has_anchor_jump_risk?: boolean } } | null)?.flags?.has_anchor_jump_risk,
      finalCvCount: currentPerf?.final_cv,
      currentCpa: currentPerf?.cpa,
      finalEventCountA: eventsA.find((e) => e.event_name === lp.final_event_name)?.count ?? 0,
      lpAnalysis: lpAnalysis as Parameters<typeof generateDiagnostics>[0]['lpAnalysis'],
      prevMonthEventCounts,
      currentClicks: currentPerf?.clicks,
      currentCost: currentPerf?.cost,
      currentCvr: currentPerf ? (currentPerf.final_cv / currentPerf.clicks) : undefined,
    })

    // design_versions に保存
    await supabase
      .from('design_versions')
      .upsert(
        {
          lp_id: lpId,
          year_month,
          recommendations_json: recommendations,
          diagnostics_json: { ...diagnostics, lp_analysis: lpAnalysis },
        },
        { onConflict: 'lp_id,year_month' }
      )

    return NextResponse.json({ data: { recommendations, diagnostics }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: { code: 'COMPUTE_ERROR', message } }, { status: 500 })
  }
}

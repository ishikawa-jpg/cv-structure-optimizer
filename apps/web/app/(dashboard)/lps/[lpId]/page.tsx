import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PerformanceComparison } from '@/components/dashboard/performance-comparison'
import { ScoreDisplay } from '@/components/dashboard/score-display'
import { AlertBanners } from '@/components/dashboard/alert-banners'
import { RecommendationsTable } from '@/components/dashboard/recommendations-table'
import { MonthlyProposals } from '@/components/dashboard/monthly-proposals'
import { GA4Todos } from '@/components/dashboard/ga4-todos'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { ComputeButton } from '@/components/dashboard/compute-button'
import { AnalyzeButton } from '@/components/dashboard/analyze-button'
import type { PerformanceMonth, DiagnosticsJson, RecommendationsJson } from '@/lib/types'

export default async function LPDetailPage({
  params,
}: {
  params: Promise<{ lpId: string }>
}) {
  const { lpId } = await params
  const supabase = await createClient()

  const { data: lp, error } = await supabase
    .from('lps')
    .select('*, accounts!inner(id, name, ga4_property_id, ga4_property_name)')
    .eq('id', lpId)
    .single()

  if (error || !lp) notFound()

  const account = lp.accounts as {
    id: string; name: string
    ga4_property_id: string | null; ga4_property_name: string | null
  }

  // 月次成果（全件）
  const { data: allPerformances } = await supabase
    .from('performance_months')
    .select('*')
    .eq('lp_id', lpId)
    .order('year_month', { ascending: false })

  // 当月・先月
  const currentMonth = allPerformances?.[0] as PerformanceMonth | null
  const previousMonth = allPerformances?.[1] as PerformanceMonth | null

  // 最新のdesign_versions
  const yearMonth = currentMonth?.year_month ||
    new Date().toISOString().substring(0, 7)

  const { data: designVersion } = await supabase
    .from('design_versions')
    .select('*')
    .eq('lp_id', lpId)
    .eq('year_month', yearMonth)
    .single()

  const recommendations = designVersion?.recommendations_json as RecommendationsJson | null
  const diagnosticsRaw = designVersion?.diagnostics_json as (DiagnosticsJson & { lp_analysis?: unknown }) | null
  const diagnostics: DiagnosticsJson | null = diagnosticsRaw
    ? { ...diagnosticsRaw }
    : null

  const hasGA4 = !!account.ga4_property_id

  return (
    <div className="max-w-5xl">
      {/* パンくず */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/accounts" className="hover:text-blue-600">アカウント一覧</Link>
        <span>/</span>
        <Link href={`/accounts/${account.id}`} className="hover:text-blue-600">{account.name}</Link>
        <span>/</span>
        <span className="text-gray-900">{lp.name || lp.url}</span>
      </div>

      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lp.name || 'LP詳細'}</h1>
          <p className="text-sm text-gray-500 mt-1 truncate max-w-xl">{lp.url}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-500">最終CV: <span className="font-medium text-gray-700">{lp.final_event_name}</span></span>
            <span className="text-xs text-gray-500">目標CPA: <span className="font-medium text-gray-700">&#xA5;{lp.target_cpa.toLocaleString()}</span></span>
            {account.ga4_property_name && (
              <span className="text-xs text-gray-500">GA4: <span className="font-medium text-gray-700">{account.ga4_property_name}</span></span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/lps/${lpId}/month/new`}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
          >
            月次データ入力
          </Link>
          <AnalyzeButton lpId={lpId} />
          <ComputeButton lpId={lpId} yearMonth={yearMonth} hasGA4={hasGA4} />
        </div>
      </div>

      {/* GA4未連携バナー */}
      {!hasGA4 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-yellow-800">GA4が未連携です。CV構造診断を実行するにはGA4を接続してください。</p>
          <a href="/api/ga4/auth" className="text-sm font-medium text-yellow-700 hover:underline ml-4 flex-shrink-0">
            GA4を接続する →
          </a>
        </div>
      )}

      {/* スコア + アラート */}
      {diagnostics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ScoreDisplay
            score={diagnostics.score}
            breakdown={diagnostics.score_breakdown}
          />
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">アラート</h3>
            <AlertBanners alerts={diagnostics.alerts} />
          </div>
        </div>
      )}

      {/* 月次比較 + 推奨CV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {currentMonth ? (
          <PerformanceComparison
            current={currentMonth}
            previous={previousMonth}
            targetCpa={lp.target_cpa}
          />
        ) : (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-6 text-center">
            <p className="text-gray-500 text-sm">月次データなし</p>
            <Link href={`/lps/${lpId}/month/new`} className="mt-2 text-blue-600 text-sm hover:underline block">
              入力する →
            </Link>
          </div>
        )}

        <RecommendationsTable items={recommendations?.items || []} />
      </div>

      {/* 月次提案 */}
      {diagnostics && diagnostics.monthly_proposals.length > 0 && (
        <div className="mb-4">
          <MonthlyProposals proposals={diagnostics.monthly_proposals} />
        </div>
      )}

      {/* トレンドグラフ */}
      {allPerformances && allPerformances.length >= 2 && (
        <div className="mb-4">
          <TrendChart
            performances={allPerformances as PerformanceMonth[]}
            targetCpa={lp.target_cpa}
          />
        </div>
      )}

      {/* GA4/GTM ToDo */}
      {diagnostics && diagnostics.ga4_todos.length > 0 && (
        <div className="mb-4">
          <GA4Todos todos={diagnostics.ga4_todos} />
        </div>
      )}

      {/* LP解析未実行の場合 */}
      {!recommendations && hasGA4 && (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-600 font-medium">CV構造診断が未実行です</p>
          <p className="text-sm text-gray-500 mt-1">上の「CV構造を診断する」ボタンをクリックしてGA4データを取得してください。</p>
        </div>
      )}
    </div>
  )
}

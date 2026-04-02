import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { PerformanceComparison } from '@/components/dashboard/performance-comparison'
import { ScoreDisplay } from '@/components/dashboard/score-display'
import { AlertBanners } from '@/components/dashboard/alert-banners'
import { CurrentCVEditor } from '@/components/dashboard/current-cv-editor'
import { MonthlyProposals } from '@/components/dashboard/monthly-proposals'
import { GA4Todos } from '@/components/dashboard/ga4-todos'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { ComputeButton } from '@/components/dashboard/compute-button'
import { AnalyzeButton } from '@/components/dashboard/analyze-button'
import { LPAnalysisResult } from '@/components/dashboard/lp-analysis-result'
import type { PerformanceMonth, DiagnosticsJson, RecommendationsJson } from '@/lib/types'
import { RoasGuide } from '@/components/dashboard/roas-guide'
import { EventImpactAnalysis } from '@/components/dashboard/event-impact-analysis'

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

  // CV設定履歴
  const { data: cvEventSettings } = await supabase
    .from('cv_event_settings')
    .select('*')
    .eq('lp_id', lpId)

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

  const activeEventNames = (cvEventSettings ?? [])
    .filter((s: { status: string }) => s.status === 'active')
    .map((s: { event_name: string }) => s.event_name)

  const endedSettings = (cvEventSettings ?? [])
    .filter((s: { status: string }) => s.status === 'ended')

  const recommendations = designVersion?.recommendations_json as RecommendationsJson | null
  const diagnostics = designVersion?.diagnostics_json as DiagnosticsJson | null
  const lpAnalysis = (designVersion?.diagnostics_json as { lp_analysis?: unknown } | null)?.lp_analysis ?? null

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
            {lp.target_cpa != null && (
              <span className="text-xs text-gray-500">目標CPA: <span className="font-medium text-gray-700">&#xA5;{lp.target_cpa.toLocaleString()}</span></span>
            )}
            {lp.final_cv_value && (
              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded">
                ROAS運用 / CV単価 &#xA5;{lp.final_cv_value.toLocaleString()}
              </span>
            )}
            {account.ga4_property_name && (
              <span className="text-xs text-gray-500">GA4: <span className="font-medium text-gray-700">{account.ga4_property_name}</span></span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/lps/${lpId}/edit`}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
            >
              LP設定
            </Link>
            <Link
              href={`/lps/${lpId}/month/new`}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
            >
              月次データ入力
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <AnalyzeButton lpId={lpId} yearMonth={yearMonth} />
            <ComputeButton lpId={lpId} yearMonth={yearMonth} hasGA4={hasGA4} />
          </div>
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
      {diagnostics && diagnostics.score_breakdown && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ScoreDisplay
            score={diagnostics.score ?? 0}
            breakdown={diagnostics.score_breakdown}
          />
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">アラート</h3>
            <AlertBanners alerts={diagnostics.alerts ?? []} lpId={lpId} yearMonth={yearMonth} activeEventNames={activeEventNames} />
          </div>
        </div>
      )}

      {/* 月次比較 + 推奨CV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {currentMonth ? (
          <PerformanceComparison
            current={currentMonth}
            previous={previousMonth}
            targetCpa={lp.target_cpa ?? null}
            finalCvValue={lp.final_cv_value ?? null}
            lpId={lpId}
          />
        ) : (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-6 text-center">
            <p className="text-gray-500 text-sm">月次データなし</p>
            <Link href={`/lps/${lpId}/month/new`} className="mt-2 text-blue-600 text-sm hover:underline block">
              入力する →
            </Link>
          </div>
        )}

        <CurrentCVEditor
          lpId={lpId}
          yearMonth={yearMonth}
          items={recommendations?.items ?? []}
        />
      </div>

      {/* Google広告 目標ROAS ガイド（ROAS運用時のみ） */}
      {lp.final_cv_value && currentMonth && recommendations && recommendations.items.length > 0 && (
        <div className="mb-4">
          <RoasGuide
            items={recommendations.items}
            finalCvValue={lp.final_cv_value}
            cost={currentMonth.cost}
            finalCv={currentMonth.final_cv}
          />
        </div>
      )}

      {/* 月次提案 */}
      {diagnostics && (diagnostics.monthly_proposals?.length ?? 0) > 0 && (
        <div className="mb-4">
          <MonthlyProposals proposals={diagnostics.monthly_proposals} lpId={lpId} yearMonth={yearMonth} />
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

      {/* CV設定変更の影響分析 */}
      {endedSettings.length > 0 && allPerformances && allPerformances.length >= 2 && (
        <div className="mb-4">
          <EventImpactAnalysis
            endedSettings={endedSettings}
            performances={allPerformances as import('@/lib/types').PerformanceMonth[]}
            eventLabels={{
              form_start: 'フォーム入力開始',
              form_view: 'フォーム表示',
              form_submit: 'フォーム送信',
              cta_click: 'CTAクリック',
              cta_click_top: 'CTAクリック（上部）',
              cta_click_mid: 'CTAクリック（中部）',
              cta_click_bottom: 'CTAクリック（下部）',
              section_view: 'セクション表示',
              scroll_75: 'スクロール75%',
              scroll_50: 'スクロール50%',
            }}
          />
        </div>
      )}

      {/* 月次データ履歴 */}
      {allPerformances && allPerformances.length > 0 && (
        <div className="mb-4 bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">月次データ履歴</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">対象月</th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500">クリック</th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500">広告費</th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500">最終CV</th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500">CPA</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {(allPerformances as import('@/lib/types').PerformanceMonth[]).map((pm) => (
                  <tr key={pm.year_month} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-gray-900">{pm.year_month}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">{pm.clicks.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">¥{pm.cost.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">{pm.final_cv}</td>
                    <td className="py-2 pr-4 text-right">
                      {pm.cpa !== null ? (
                        <span className={
                          pm.cpa_status === 'green' ? 'text-green-600' :
                          pm.cpa_status === 'yellow' ? 'text-yellow-600' :
                          pm.cpa_status === 'red' ? 'text-red-600' : 'text-gray-500'
                        }>
                          ¥{pm.cpa.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/lps/${lpId}/month/${pm.year_month}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        編集
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LP解析結果 */}
      <div className="mb-4">
        <LPAnalysisResult lpAnalysis={lpAnalysis as Parameters<typeof LPAnalysisResult>[0]['lpAnalysis']} />
      </div>

      {/* GA4/GTM ToDo */}
      {diagnostics && (diagnostics.ga4_todos?.length ?? 0) > 0 && (
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

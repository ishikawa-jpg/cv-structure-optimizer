import type { DiagnosticsJson, Alert, RecommendationItem } from '@/lib/types'
import type { CPAStatus } from '@/lib/statistics'
import type { CVRJudgment } from '@/lib/statistics'
import { decideProposalCount } from '@/lib/statistics'

interface DiagnosticsInput {
  recommendations: RecommendationItem[]
  cpaStatus: CPAStatus
  cvrJudgment: CVRJudgment
  isPrevMonthExists: boolean
  totalCvScore: number
  scoreBreakdown: {
    signal_coverage: number
    value_separation: number
    data_reliability: number
    noise_risk: number
  }
  hasAnchorJumpRisk?: boolean
  finalCvCount?: number
  currentCpa?: number | null
}

const ALERT_MESSAGES: Record<string, string> = {
  B_SAMPLE_LOW: '広告流入のCV母数が15未満です。A（全流入）ベースで算出しています。',
  SCROLL_INCLUDED: 'scroll系イベントが含まれています。値を低めに設定してください。',
  ANCHOR_JUMP_RISK: 'LPにアンカーリンクが多数検出されました。セッションが分断されるリスクがあります。',
  NO_FORM_EVENT: 'form_start / form_view が未検出です。フォーム系イベントの計測を推奨します。',
  MID_CV_RATIO_HIGH: '中間CV合計が最終CVの20倍以上です。最終CVが伸びない場合、中間CV値の下方調整を検討してください。',
  VALUE_TOO_UNIFORM: 'CV値に段差がありません。アルゴリズムがシグナルを区別できない可能性があります。',
  CPA_EXCEED_RED: '目標CPAを15%以上超過しています。',
  FINAL_CV_NEGLECT_RISK: '中間CV値が70以上かつ目標CPA超過が続いています。最終CV軽視リスクがあります。',
}

function generateAlerts(input: DiagnosticsInput): Alert[] {
  const alerts: Alert[] = []
  const { recommendations, cpaStatus, finalCvCount, hasAnchorJumpRisk } = input

  // INFO
  if (recommendations.some((r) => r.count_b_final < 15 && r.estimation_method !== 'eventCount_ratio')) {
    alerts.push({ level: 'info', code: 'B_SAMPLE_LOW', message: ALERT_MESSAGES.B_SAMPLE_LOW })
  }
  if (recommendations.some((r) => r.event_name.startsWith('scroll'))) {
    alerts.push({ level: 'info', code: 'SCROLL_INCLUDED', message: ALERT_MESSAGES.SCROLL_INCLUDED })
  }
  if (hasAnchorJumpRisk) {
    alerts.push({ level: 'info', code: 'ANCHOR_JUMP_RISK', message: ALERT_MESSAGES.ANCHOR_JUMP_RISK })
  }

  // WARNING
  const hasFormEvent = recommendations.some(
    (r) => r.event_name === 'form_start' || r.event_name === 'form_view'
  )
  if (!hasFormEvent) {
    alerts.push({ level: 'warning', code: 'NO_FORM_EVENT', message: ALERT_MESSAGES.NO_FORM_EVENT })
  }
  if (finalCvCount && finalCvCount > 0) {
    const totalMidCv = recommendations.reduce((s, r) => s + r.count_a_event, 0)
    if (totalMidCv > finalCvCount * 20) {
      alerts.push({ level: 'warning', code: 'MID_CV_RATIO_HIGH', message: ALERT_MESSAGES.MID_CV_RATIO_HIGH })
    }
  }
  if (recommendations.length >= 2) {
    const vals = recommendations.map((r) => r.cv_value)
    if (Math.max(...vals) - Math.min(...vals) < 10) {
      alerts.push({ level: 'warning', code: 'VALUE_TOO_UNIFORM', message: ALERT_MESSAGES.VALUE_TOO_UNIFORM })
    }
  }

  // CRITICAL
  if (cpaStatus === 'red') {
    alerts.push({ level: 'critical', code: 'CPA_EXCEED_RED', message: ALERT_MESSAGES.CPA_EXCEED_RED })
  }
  if (recommendations.some((r) => r.cv_value >= 70) && (cpaStatus === 'red' || cpaStatus === 'yellow')) {
    alerts.push({ level: 'critical', code: 'FINAL_CV_NEGLECT_RISK', message: ALERT_MESSAGES.FINAL_CV_NEGLECT_RISK })
  }

  const order: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  return alerts.sort((a, b) => order[a.level] - order[b.level])
}

export function generateDiagnostics(input: DiagnosticsInput): DiagnosticsJson {
  const proposalCount = decideProposalCount(
    input.cpaStatus,
    input.cvrJudgment,
    input.isPrevMonthExists
  )

  const alerts = generateAlerts(input)
  const { recommendations, cpaStatus } = input
  const proposals = []

  // 枠1: 最適化
  if (proposalCount >= 1) {
    const scrollEvent = recommendations.find((r) => r.event_name.startsWith('scroll'))
    const highMidCv = recommendations.find((r) => r.cv_value >= 70 && !r.event_name.startsWith('form_start'))

    if (scrollEvent && (cpaStatus === 'red' || cpaStatus === 'yellow')) {
      proposals.push({
        slot: 'optimization' as const,
        title: 'scroll系CV値の引き下げ',
        description: `${scrollEvent.event_name}のCV値を${scrollEvent.cv_value}から${Math.max(scrollEvent.cv_value - 10, 1)}に下げることを推奨します。`,
        action_type: 'adjust_cv_value' as const,
        target_event: scrollEvent.event_name,
        suggested_value: Math.max(scrollEvent.cv_value - 10, 1),
        difficulty: 'easy' as const,
        reason: 'scrollイベントはCVとの相関が低く、過大評価すると予算効率が悪化します。',
      })
    } else if (highMidCv && cpaStatus === 'red') {
      proposals.push({
        slot: 'optimization' as const,
        title: `${highMidCv.label}のCV値引き下げ`,
        description: `${highMidCv.event_name}のCV値を${highMidCv.cv_value}から${Math.max(highMidCv.cv_value - 20, 1)}に下げることを推奨します。`,
        action_type: 'adjust_cv_value' as const,
        target_event: highMidCv.event_name,
        suggested_value: Math.max(highMidCv.cv_value - 20, 1),
        difficulty: 'easy' as const,
        reason: '中間CVの値が高すぎると最終CVへの誘導が不十分になる場合があります。',
      })
    } else if (cpaStatus === 'red' && recommendations.length > 0) {
      const lowest = recommendations.reduce((m, r) => r.cv_value < m.cv_value ? r : m)
      proposals.push({
        slot: 'optimization' as const,
        title: 'CV値構造の見直し',
        description: `目標CPAを大幅に超過しています。${lowest.event_name}の削除またはCV値の再調整を検討してください。`,
        action_type: 'adjust_cv_value' as const,
        target_event: lowest.event_name,
        difficulty: 'medium' as const,
        reason: '目標CPAを15%以上超過しており、CV値構造の見直しが必要です。',
      })
    }
  }

  // 枠2: 強化
  if (proposalCount >= 2) {
    const hasFormStart = recommendations.some((r) => r.event_name === 'form_start')
    const hasCtaClick = recommendations.some((r) => r.event_name.startsWith('cta_click'))

    if (!hasFormStart) {
      proposals.push({
        slot: 'enhancement' as const,
        title: 'form_startイベントの計測追加',
        description: 'GTMでフォーム入力開始イベント（form_start）を実装し、より正確なCV構造を構築します。',
        action_type: 'add_gtm_tag' as const,
        target_event: 'form_start',
        difficulty: 'medium' as const,
        reason: 'form_startは最も信頼性の高い中間CVイベントです。',
      })
    } else if (!hasCtaClick) {
      proposals.push({
        slot: 'enhancement' as const,
        title: 'cta_clickイベントの計測追加',
        description: 'GTMでCTAボタンクリックイベント（cta_click）を実装します。',
        action_type: 'add_gtm_tag' as const,
        target_event: 'cta_click',
        difficulty: 'easy' as const,
        reason: 'CTAクリックの計測によりどのCTAが効果的か把握できます。',
      })
    } else {
      proposals.push({
        slot: 'enhancement' as const,
        title: 'GA4カスタムディメンションの追加',
        description: 'cta_position等のカスタムパラメータをGA4に登録し、詳細な分析を可能にします。',
        action_type: 'add_ga4_custom_def' as const,
        difficulty: 'easy' as const,
        reason: 'カスタムディメンションでより詳細なCV経路分析が可能になります。',
      })
    }
  }

  // GA4 ToDo
  const hasFormStart = recommendations.some((r) => r.event_name === 'form_start')
  const hasCtaClick = recommendations.some((r) => r.event_name.startsWith('cta_click'))
  const ga4_todos = []

  if (!hasFormStart) {
    ga4_todos.push({
      category: 'gtm_tag' as const,
      title: 'form_start タグ実装',
      description: 'フォーム入力開始をGA4イベントとして計測する',
      steps: [
        '1. GTMでトリガーを作成: 「クリック - すべての要素」',
        '2. 条件: フォームの最初の入力フィールドへのフォーカス',
        '3. タグ作成: GA4イベントタグ、イベント名: form_start',
        '4. プレビューで動作確認後、公開する',
      ],
      priority: 'high' as const,
      event_name: 'form_start',
    })
  }
  if (!hasCtaClick) {
    ga4_todos.push({
      category: 'gtm_tag' as const,
      title: 'cta_click タグ実装',
      description: 'CTAボタンクリックをGA4イベントとして計測する',
      steps: [
        '1. GTMでトリガーを作成: 「クリック - すべての要素」',
        '2. 条件: Click ElementがCTAボタンのCSSセレクターに一致',
        '3. タグ作成: GA4イベントタグ、イベント名: cta_click',
        '4. パラメータ: cta_text={{Click Text}}, cta_position=top/mid/bottom',
        '5. プレビューで動作確認後、公開する',
      ],
      priority: 'high' as const,
      event_name: 'cta_click',
    })
  }
  ga4_todos.push({
    category: 'key_event' as const,
    title: 'キーイベント設定の確認',
    description: '最終CVイベントがGA4のキーイベントとして正しく設定されているか確認する',
    steps: [
      '1. GA4管理画面 > イベントを開く',
      '2. 最終CVイベント名を検索する',
      '3. 「キーイベントとしてマーク」がONになっているか確認',
      '4. ONでなければ切り替える',
    ],
    priority: 'high' as const,
  })

  return {
    score: input.totalCvScore,
    score_breakdown: input.scoreBreakdown,
    alerts,
    monthly_proposals: proposals,
    ga4_todos,
    gtm_templates: [],
    generated_at: new Date().toISOString(),
  }
}

import type { DiagnosticsJson, Alert, RecommendationItem } from '@/lib/types'
import type { CPAStatus } from '@/lib/statistics'
import type { CVRJudgment } from '@/lib/statistics'
import { decideProposalCount } from '@/lib/statistics'

interface LPAnalysisData {
  ctas?: Array<{ text: string; selector_candidates: string[]; position: string }>
  forms?: Array<{ selector_candidates: string[]; in_iframe: boolean }>
  sections?: Array<{ section_name_guess: string; heading_text: string }>
  flags?: { has_anchor_jump_risk?: boolean }
}

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
  finalEventCountA?: number
  lpAnalysis?: LPAnalysisData | null
  prevMonthEventCounts?: Record<string, number>
  currentClicks?: number
  currentCost?: number
  currentCvr?: number
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
  EVENT_TRACKING_STOPPED: 'イベントの計測が停止している可能性があります。先月あったイベントが今月0件です。GTMのタグを確認してください。',
  EVENT_TRACKING_DECLINED: '一部イベントの計測数が先月比70%以上減少しています。タグの動作を確認してください。',
  CPC_CVR_IMBALANCE: 'クリック単価が高くCVRが低い状態でCV値が高いイベントが設定されています。中間CVに予算が偏るリスクがあります。',
}

function generateAlerts(input: DiagnosticsInput): Alert[] {
  const alerts: Alert[] = []
  const { recommendations, cpaStatus, finalCvCount, hasAnchorJumpRisk,
          prevMonthEventCounts, currentClicks, currentCost, currentCvr } = input

  // EVENT_TRACKING_STOPPED（critical）: 先月50件以上 → 今月0件
  if (prevMonthEventCounts) {
    const stoppedEvents = recommendations.filter(r => {
      const prevCount = prevMonthEventCounts[r.event_name] ?? 0
      return prevCount >= 50 && r.count_a_event === 0
    })
    if (stoppedEvents.length > 0) {
      alerts.push({
        level: 'critical',
        code: 'EVENT_TRACKING_STOPPED',
        message: `${stoppedEvents.map(e => e.label).join('、')} の計測が停止している可能性があります。先月あったイベントが今月0件です。GTMのタグを確認してください。`,
      })
    }
  }

  // EVENT_TRACKING_DECLINED（warning）: 先月100件以上 → 今月30%未満（0件は除く）
  if (prevMonthEventCounts) {
    const declinedEvents = recommendations.filter(r => {
      const prevCount = prevMonthEventCounts[r.event_name] ?? 0
      return prevCount >= 100 && r.count_a_event > 0 && r.count_a_event < prevCount * 0.3
    })
    if (declinedEvents.length > 0) {
      alerts.push({
        level: 'warning',
        code: 'EVENT_TRACKING_DECLINED',
        message: `${declinedEvents.map(e => e.label).join('、')} の計測数が先月比70%以上減少しています。タグの動作を確認してください。`,
      })
    }
  }

  // CPC_CVR_IMBALANCE（warning）: CPC > 300円 AND CVR < 1% AND 最大CV値 > 50
  if (currentClicks && currentClicks > 0 && currentCost && currentCvr !== undefined) {
    const cpc = currentCost / currentClicks
    const maxCvValue = recommendations.length > 0 ? Math.max(...recommendations.map(r => r.cv_value)) : 0
    if (cpc > 300 && currentCvr < 0.01 && maxCvValue > 50) {
      alerts.push({
        level: 'warning',
        code: 'CPC_CVR_IMBALANCE',
        message: ALERT_MESSAGES.CPC_CVR_IMBALANCE,
      })
    }
  }

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
  const lp = input.lpAnalysis

  if (!hasFormStart) {
    const formSelector = lp?.forms?.[0]?.selector_candidates?.[0]
    const inIframe = lp?.forms?.[0]?.in_iframe
    ga4_todos.push({
      category: 'gtm_tag' as const,
      title: 'form_start タグ実装',
      description: formSelector
        ? `LP解析でフォームを検出しました（${formSelector}）。フォーム入力開始イベント（form_start）を計測してください。`
        : 'フォーム入力開始をGA4イベントとして計測する',
      steps: [
        '1. GTMでトリガーを作成: 「クリック - すべての要素」',
        formSelector
          ? `2. 条件: Click Element が CSS セレクター「${formSelector}」内の input / textarea に一致`
          : '2. 条件: フォームの最初の入力フィールドへのフォーカス',
        '3. タグ作成: GA4イベントタグ、イベント名: form_start',
        inIframe ? '4. ※フォームがiframe内にあるため、GTMのiframe対応設定が必要です' : '4. プレビューで動作確認後、公開する',
        inIframe ? '5. プレビューで動作確認後、公開する' : '',
      ].filter(Boolean),
      priority: 'high' as const,
      event_name: 'form_start',
    })
  }
  if (!hasCtaClick) {
    const ctasByPosition = lp?.ctas ?? []
    const ctaSelectors = ctasByPosition
      .map((c) => c.selector_candidates?.[0] ? `${c.position}: ${c.selector_candidates[0]}` : null)
      .filter(Boolean)
    ga4_todos.push({
      category: 'gtm_tag' as const,
      title: 'cta_click タグ実装',
      description: ctasByPosition.length > 0
        ? `LP解析で${ctasByPosition.length}件のCTAボタンを検出しました。クリック計測を追加してください。`
        : 'CTAボタンクリックをGA4イベントとして計測する',
      steps: [
        '1. GTMでトリガーを作成: 「クリック - すべての要素」',
        ctaSelectors.length > 0
          ? `2. 検出されたCTAセレクター — ${ctaSelectors.join(' / ')}`
          : '2. 条件: Click ElementがCTAボタンのCSSセレクターに一致',
        '3. タグ作成: GA4イベントタグ、イベント名: cta_click',
        '4. パラメータ: cta_text={{Click Text}}, cta_position=top/mid/bottom',
        '5. プレビューで動作確認後、公開する',
      ],
      priority: 'high' as const,
      event_name: 'cta_click',
    })
  }
  // NOTE: キーイベント設定の確認は「今月のfinal_cv > 0」または「GA4の当月イベント数 > 0」で
  // 設定済みと判断して非表示にする。当月に1件も変換がない場合は検出できないため常に表示される。
  const keyEventConfirmed = (input.finalEventCountA ?? 0) > 0 || (input.finalCvCount ?? 0) > 0
  if (!keyEventConfirmed) {
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
  }

  // form_view: form_startはあるがform_viewがない場合 → Signal Coverage改善
  const hasFormView = recommendations.some((r) => r.event_name === 'form_view')
  if (hasFormStart && !hasFormView) {
    const formSelector = lp?.forms?.[0]?.selector_candidates?.[0]
    ga4_todos.push({
      category: 'gtm_tag' as const,
      title: 'form_view タグ実装',
      description: 'フォーム表示イベント（form_view）を追加することでSignal Coverageが改善し、スコアアップにつながります',
      steps: [
        '1. GTMでトリガーを作成: 「要素の表示」',
        formSelector
          ? `2. 条件: CSS セレクター「${formSelector}」が画面内に50%以上表示された時`
          : '2. 条件: フォームのCSSセレクターが画面内に表示された時',
        '3. タグ作成: GA4イベントタグ、イベント名: form_view',
        '4. プレビューでフォームにスクロールした際に発火するか確認',
        '5. 問題なければ公開する',
      ],
      priority: 'medium' as const,
      event_name: 'form_view',
    })
  }

  // section_view: イベント数が少なくsection_viewがない場合 → Signal Coverage改善
  const hasSectionView = recommendations.some((r) => r.event_name.startsWith('section_view'))
  if (!hasSectionView && recommendations.length < 4) {
    const detectedSections = lp?.sections ?? []
    const sectionExamples = detectedSections.slice(0, 3).map((s) => s.heading_text || s.section_name_guess).join('、')
    ga4_todos.push({
      category: 'gtm_tag' as const,
      title: 'section_view タグ実装',
      description: detectedSections.length > 0
        ? `LP解析で${detectedSections.length}件のセクションを検出しました（${sectionExamples}）。各セクションの表示イベントを計測してください。`
        : 'LPの主要セクション（料金、事例、問い合わせなど）の表示イベントを計測することで、訪問者の行動とCVの関係を把握できます',
      steps: [
        '1. GTMでトリガーを作成: 「要素の表示」',
        detectedSections.length > 0
          ? `2. 計測対象セクション: ${detectedSections.map((s) => s.section_name_guess).join(' / ')}`
          : '2. 条件: 計測したいセクションのCSSセレクター（例: #price, .case-section）',
        '3. タグ作成: GA4イベントタグ、イベント名: section_view',
        '4. パラメータ: section_name = セクション名（例: price, case, contact）',
        '5. 複数セクションがある場合はそれぞれにトリガーを作成する',
      ],
      priority: 'medium' as const,
      event_name: 'section_view',
    })
  }

  // scroll系が推奨に含まれる → より精度の高いイベントへの代替を促す（Noise Risk改善）
  const hasScroll = recommendations.some((r) => r.event_name.startsWith('scroll'))
  if (hasScroll) {
    ga4_todos.push({
      category: 'gtm_tag' as const,
      title: 'scrollイベントの代替計測を追加',
      description: 'scroll系イベントはCVとの相関が低くノイズになりやすく、スコアを下げます。より精度の高いイベント（section_view、cta_click等）を追加してscrollを推奨から外すことでスコアが改善します',
      steps: [
        '1. section_view または cta_click を先に実装する（別のToDoを参照）',
        '2. 再診断後、scroll系が推奨リストから外れることを確認する',
        '3. 外れない場合はGA4の「scroll」イベントのデータが多すぎる可能性 — LP改善を検討する',
      ],
      priority: 'medium' as const,
    })
  }

  // B母数が全体的に低い → Data Reliability改善のアドバイス
  const lowConfidenceCount = recommendations.filter((r) => r.confidence === 'low').length
  if (lowConfidenceCount > 0 && lowConfidenceCount === recommendations.length) {
    ga4_todos.push({
      category: 'audience' as const,
      title: '広告流入のCV実績を増やす',
      description: '全イベントで広告流入からのCV数が不足しており、推奨値の信頼度が「低」になっています。計測期間を延ばすか、広告流入量を増やすことで信頼度とスコアが改善します',
      steps: [
        '1. 診断の対象期間を3ヶ月など長めに設定して再診断する',
        '2. 広告のインプレッション・クリック数が少ない場合は予算・入札の見直しを検討する',
        '3. 広告からのセッションが計測されているか GA4 > 集客 > トラフィック獲得 で確認する',
        '4. utm_source=google, utm_medium=cpc が正しく付与されているか確認する',
      ],
      priority: 'medium' as const,
    })
  }

  // CTAがあるがカスタムディメンション未設定 → Data Reliability・分析精度改善
  if (hasCtaClick) {
    ga4_todos.push({
      category: 'custom_definition' as const,
      title: 'cta_position カスタムディメンション登録',
      description: 'GA4にcta_positionカスタムディメンションを登録することで、上部・中部・下部CTAのどれが効果的かをレポートで確認できるようになります',
      steps: [
        '1. GA4管理画面 > カスタム定義 > カスタムディメンション を開く',
        '2. 「カスタムディメンションを作成」をクリック',
        '3. ディメンション名: cta_position、スコープ: イベント、イベントパラメータ: cta_position',
        '4. 保存する（反映まで最大48時間）',
        '5. GTMのcta_clickタグにパラメータ cta_position = top / mid / bottom を追加する',
      ],
      priority: 'low' as const,
    })
  }

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

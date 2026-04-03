import type { RecommendationItem, RecommendationsJson } from '@/lib/types'
import type { EventCountResult } from '@/lib/ga4/data-api'
import { calcCVValue, type EventType } from './calc-cv-value'

interface LPAnalysisData {
  ctas?: Array<{ position: string; text: string }>
  forms?: Array<unknown>
  sections?: Array<{ section_name_guess: string }>
  flags?: { has_anchor_jump_risk?: boolean; is_single_page_like?: boolean }
}

const EVENT_LABELS: Record<string, string> = {
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
}

const PRIORITY_ORDER = [
  'form_start', 'form_view', 'form_submit',
  'cta_click_top', 'cta_click_mid', 'cta_click_bottom', 'cta_click',
  'section_view', 'scroll_75', 'scroll_50',
]

const SYSTEM_EVENTS = new Set([
  'page_view', 'session_start', 'first_visit', 'user_engagement',
  'scroll', 'click', 'file_download',
  'video_start', 'video_progress', 'video_complete',
])

function isSystemEvent(eventName: string): boolean {
  return SYSTEM_EVENTS.has(eventName) || eventName.startsWith('gtm.')
}

function getEventType(eventName: string): EventType {
  if (eventName.startsWith('form_start')) return 'form_start'
  if (eventName.startsWith('form_view')) return 'form_view'
  if (eventName.startsWith('cta_click')) return 'cta_click'
  if (eventName.startsWith('section_view')) return 'section_view'
  if (eventName.startsWith('scroll')) return 'scroll'
  return 'other'
}

function getPriority(eventName: string): number {
  const idx = PRIORITY_ORDER.findIndex((p) => eventName.startsWith(p))
  return idx === -1 ? 999 : idx
}

function calcTotalScore(items: RecommendationItem[]): number {
  // Signal Coverage (max 30)
  let signalCoverage = items.length * 5
  const hasFormEvent = items.some((i) => i.event_name === 'form_start' || i.event_name === 'form_view')
  if (hasFormEvent) signalCoverage += 5
  signalCoverage = Math.min(signalCoverage, 30)

  // Value Separation (max 30)
  const values = items.map((i) => i.cv_value).sort((a, b) => b - a)
  let valueSeparation = 0
  if (values.length >= 2) {
    const range = values[0] - values[values.length - 1]
    valueSeparation = range >= 50 ? 30 : range >= 30 ? 20 : range >= 15 ? 10 : 5
  }

  // Data Reliability (max 25)
  const highCount = items.filter((i) => i.confidence === 'high').length
  const medCount = items.filter((i) => i.confidence === 'medium').length
  const dataReliability = Math.min(highCount * 8 + medCount * 3, 25)

  // Noise Risk (max 15, minus)
  let noiseRisk = 15
  if (items.some((i) => i.event_name.startsWith('scroll'))) noiseRisk -= 5

  return Math.min(signalCoverage + valueSeparation + dataReliability + noiseRisk, 100)
}

export function generateRecommendations(
  finalEventName: string,
  eventsA: EventCountResult[],
  eventsB: EventCountResult[],
  dateRange: { start: string; end: string },
  lpAnalysis?: LPAnalysisData | null,
  finalCvValue?: number | null,
  prevMonthPaValues?: Record<string, number>,
  prevMonthEventCounts?: Record<string, number>
): RecommendationsJson {
  const finalA = eventsA.find((e) => e.event_name === finalEventName)?.count || 0
  const finalB = eventsB.find((e) => e.event_name === finalEventName)?.count || 0

  const candidateNames = [
    'form_start', 'form_view', 'form_submit', 'cta_click',
    'cta_click_top', 'cta_click_mid', 'cta_click_bottom',
    'section_view', 'scroll_75', 'scroll_50',
  ]

  // LP解析で検出されたイベント
  const detectedInLP = new Set<string>()
  if (lpAnalysis) {
    if ((lpAnalysis.forms?.length ?? 0) > 0) {
      detectedInLP.add('form_start')
      detectedInLP.add('form_view')
    }
    if ((lpAnalysis.ctas?.length ?? 0) > 0) {
      detectedInLP.add('cta_click')
      lpAnalysis.ctas?.forEach((cta) => {
        if (cta.position && cta.position !== 'unknown') {
          detectedInLP.add(`cta_click_${cta.position}`)
        }
      })
    }
    if ((lpAnalysis.sections?.length ?? 0) > 0) {
      detectedInLP.add('section_view')
    }
  }

  // 候補リスト内（優先度あり）
  const priorityCandidates = eventsA
    .filter((e) => candidateNames.some((c) => e.event_name.startsWith(c)))
    .filter((e) => e.event_name !== finalEventName)
    .sort((a, b) => getPriority(a.event_name) - getPriority(b.event_name))

  // 候補リスト外のカスタムイベント（件数順）
  const customCandidates = eventsA
    .filter((e) => !candidateNames.some((c) => e.event_name.startsWith(c)))
    .filter((e) => e.event_name !== finalEventName)
    .filter((e) => !isSystemEvent(e.event_name))
    .sort((a, b) => b.count - a.count)

  // 優先候補を先に並べ、残りスロットにカスタム候補を追加（合計最大6件）
  const seen = new Set(priorityCandidates.map((e) => e.event_name))
  const candidates = [
    ...priorityCandidates,
    ...customCandidates.filter((e) => !seen.has(e.event_name)),
  ].slice(0, 6)

  const items: RecommendationItem[] = candidates.map((e) => {
    const countB = eventsB.find((b) => b.event_name === e.event_name)?.count || 0
    const result = calcCVValue(finalA, e.count, finalB, countB, getEventType(e.event_name), finalCvValue)

    // stability 計算
    let stability: 'stable' | 'unstable' | 'insufficient' = 'insufficient'
    if (prevMonthPaValues && prevMonthEventCounts) {
      const prevPa = prevMonthPaValues[e.event_name]
      const prevCount = prevMonthEventCounts[e.event_name] ?? 0
      if (prevPa === undefined || prevCount < 30 || e.count < 30) {
        stability = 'insufficient'
      } else if (prevPa > 0 && Math.abs(result.p_a - prevPa) / prevPa > 0.5) {
        stability = 'unstable'
      } else {
        stability = 'stable'
      }
    }

    return {
      event_name: e.event_name,
      cv_value: result.value,
      confidence: result.confidence,
      estimation_method: result.estimation_method,
      p_a: result.p_a,
      p_b: result.p_b,
      count_a_event: e.count,
      count_b_event: countB,
      count_a_final: finalA,
      count_b_final: finalB,
      cap_applied: result.cap_applied,
      label: EVENT_LABELS[e.event_name] || e.event_name,
      is_detected_in_lp: detectedInLP.has(e.event_name),
      stability,
    }
  })

  return {
    items,
    total_cv_score: calcTotalScore(items),
    generated_at: new Date().toISOString(),
    date_range: dateRange,
  }
}

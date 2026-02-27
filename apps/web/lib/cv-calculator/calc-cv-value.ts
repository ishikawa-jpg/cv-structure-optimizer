import type { Confidence } from '@/lib/types'

export type EventType = 'form_start' | 'form_view' | 'cta_click' | 'section_view' | 'scroll' | 'other'

export interface CVValueResult {
  value: number
  confidence: Confidence
  estimation_method: string
  p_a: number
  p_b: number | null
  cap_applied: string | null
}

export function calcCVValue(
  eventCount_A_final: number,
  eventCount_A_event: number,
  eventCount_B_final: number,
  eventCount_B_event: number,
  eventType: EventType
): CVValueResult {
  if (eventCount_A_event === 0) {
    return { value: 1, confidence: 'low', estimation_method: 'insufficient_data', p_a: 0, p_b: null, cap_applied: null }
  }

  const P_A = eventCount_A_final / eventCount_A_event
  let adjust_factor: number
  let estimation_method: string
  let p_b: number | null = null

  if (eventCount_B_final < 5) {
    adjust_factor = 1.0
    estimation_method = 'A_only_B_insufficient'
  } else if (eventCount_B_final < 15) {
    const P_B_raw = eventCount_B_event > 0 ? eventCount_B_final / eventCount_B_event : P_A
    const raw_factor = P_B_raw / P_A
    adjust_factor = raw_factor * 0.3 + 1.0 * 0.7
    estimation_method = 'hybrid_B_low'
    p_b = P_B_raw
  } else {
    const P_B = eventCount_B_final / eventCount_B_event
    adjust_factor = Math.min(Math.max(P_B / P_A, 0.5), 1.2)
    estimation_method = 'eventCount_ratio'
    p_b = P_B
  }

  let value = Math.round(Math.round(100 * P_A) * adjust_factor)
  let cap_applied: string | null = null

  if (eventType === 'form_start' && value > 70) {
    value = 70
    cap_applied = 'form_start_cap70'
  }
  if (eventType === 'scroll') {
    value = Math.round(value * 0.7)
    cap_applied = 'scroll_discount'
  }

  value = Math.min(Math.max(value, 1), 90)

  const confidence: Confidence =
    eventCount_B_final >= 15 && eventCount_A_event >= 200 ? 'high' :
    eventCount_B_final >= 5 ? 'medium' : 'low'

  return { value, confidence, estimation_method, p_a: P_A, p_b, cap_applied }
}

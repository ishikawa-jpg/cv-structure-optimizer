export type CPAStatus = 'green' | 'yellow' | 'red' | 'undefined'

export interface CPAMetrics {
  cvr: number
  cpa: number | null
  cpaStatus: CPAStatus
}

/**
 * CPA・CVR指標の算出とCPAステータス判定
 *
 * @param clicks    - クリック数
 * @param cost      - 費用（円）
 * @param finalCv   - 最終CV数
 * @param targetCpa - 目標CPA（円）
 * @returns CPAMetrics（CVR, CPA, CPAステータス）
 *
 * CPAステータス判定基準:
 * - green:     CPA <= 目標CPA
 * - yellow:    CPA <= 目標CPA * 1.15（目標の115%以内）
 * - red:       CPA >  目標CPA * 1.15
 * - undefined: CV = 0（CPA算出不可）
 */
export function calcMetrics(
  clicks: number,
  cost: number,
  finalCv: number,
  targetCpa: number
): CPAMetrics {
  const cvr = clicks > 0 ? finalCv / clicks : 0
  const cpa = finalCv > 0 ? Math.round(cost / finalCv) : null

  const cpaStatus: CPAStatus =
    cpa === null ? 'undefined' :
    cpa <= targetCpa ? 'green' :
    cpa <= targetCpa * 1.15 ? 'yellow' : 'red'

  return { cvr, cpa, cpaStatus }
}

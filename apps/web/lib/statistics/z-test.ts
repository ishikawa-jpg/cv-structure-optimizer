export type CVRJudgment =
  | 'significant_improve'
  | 'trend_improve'
  | 'no_change'
  | 'significant_worse'
  | 'insufficient_data'

export interface ZTestResult {
  z: number
  p: number
  judgment: CVRJudgment
}

/**
 * 標準正規分布のCDF近似（Abramowitz & Stegun 公式 26.2.17）
 */
function standardNormalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const poly =
    t * (0.319381530 +
    t * (-0.356563782 +
    t * (1.781477937 +
    t * (-1.821255978 +
    t * 1.330274429))))
  const phi = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x)
  const result = 1 - phi * poly
  return x >= 0 ? result : 1 - result
}

/**
 * CVR差の z検定（2標本比率の差の検定）
 *
 * @param prev - 前月データ（final_cv: CV数, clicks: クリック数）
 * @param curr - 今月データ（final_cv: CV数, clicks: クリック数）
 * @returns ZTestResult（z値, p値, 判定結果）
 *
 * 判定基準:
 * - p < 0.05 かつ z > 0 → significant_improve（有意な改善）
 * - p < 0.05 かつ z < 0 → significant_worse（有意な悪化）
 * - p < 0.10 かつ z > 0 → trend_improve（改善傾向）
 * - それ以外             → no_change（変化なし）
 * - 母数不足             → insufficient_data
 */
export function zTestCVR(
  prev: { final_cv: number; clicks: number },
  curr: { final_cv: number; clicks: number }
): ZTestResult {
  // 母数不足チェック（clicks < 30 または final_cv < 5）
  if (
    prev.clicks < 30 ||
    curr.clicks < 30 ||
    prev.final_cv < 5 ||
    curr.final_cv < 5
  ) {
    return { z: 0, p: 1, judgment: 'insufficient_data' }
  }

  const p1 = prev.final_cv / prev.clicks
  const p2 = curr.final_cv / curr.clicks

  // プール推定量
  const pooled =
    (prev.final_cv + curr.final_cv) / (prev.clicks + curr.clicks)

  // 標準誤差
  const se = Math.sqrt(
    pooled * (1 - pooled) * (1 / prev.clicks + 1 / curr.clicks)
  )

  if (se === 0) return { z: 0, p: 1, judgment: 'no_change' }

  const z = (p2 - p1) / se

  // 両側検定のp値
  const p = 2 * (1 - standardNormalCDF(Math.abs(z)))

  const judgment: CVRJudgment =
    p < 0.05 && z > 0 ? 'significant_improve' :
    p < 0.05 && z < 0 ? 'significant_worse' :
    p < 0.1 && z > 0 ? 'trend_improve' :
    'no_change'

  return { z, p, judgment }
}

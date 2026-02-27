import type { CPAStatus, CVRJudgment } from '@cv-optimizer/shared-types'

export type ProposalCount = 0 | 1 | 2

/**
 * 月次提案件数の決定ロジック
 *
 * @param cpaStatus          - CPA判定結果（green / yellow / red / undefined）
 * @param cvrJudgment        - CVR差のz検定判定結果
 * @param isPrevMonthExists  - 前月データが存在するか
 * @returns ProposalCount（0 | 1 | 2 件）
 *
 * 判定ルール:
 * - 初月（前月データなし）         → 1件（強化枠のみ）
 * - green + 有意改善 or 改善傾向   → 0件（提案不要）
 * - yellow + 有意改善 or 改善傾向  → 1件（最適化枠のみ）
 * - red / 悪化 / 有意差なし        → 2件（最適化 + 強化）
 */
export function decideProposalCount(
  cpaStatus: CPAStatus,
  cvrJudgment: CVRJudgment,
  isPrevMonthExists: boolean
): ProposalCount {
  // 初月は強化枠1件のみ
  if (!isPrevMonthExists) return 1

  // 目標CPA達成 + CVR改善傾向 → 提案不要
  if (
    cpaStatus === 'green' &&
    (cvrJudgment === 'significant_improve' || cvrJudgment === 'trend_improve')
  ) {
    return 0
  }

  // 注意圏内 + CVR改善傾向 → 最適化のみ1件
  if (
    cpaStatus === 'yellow' &&
    (cvrJudgment === 'significant_improve' || cvrJudgment === 'trend_improve')
  ) {
    return 1
  }

  // その他（red / 悪化 / 有意差なし / undefined）→ 2件
  return 2
}

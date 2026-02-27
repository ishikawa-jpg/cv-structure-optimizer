/**
 * z検定（zTestCVR）のテストケース
 *
 * Jest / Vitest 等のテストランナーで実行可能。
 * 実行例: npx vitest run lib/statistics/__tests__/z-test.test.ts
 */

import { zTestCVR } from '../z-test'

// ------------------------------------------------------------------
// テストケース一覧
// ------------------------------------------------------------------

// ケース1: 今月の final_cv が 5 未満 → insufficient_data
// prev: clicks=100, final_cv=10 / curr: clicks=100, final_cv=3
// 期待: judgment = 'insufficient_data'
//
// const result1 = zTestCVR(
//   { final_cv: 10, clicks: 100 },
//   { final_cv: 3,  clicks: 100 }
// )
// assert(result1.judgment === 'insufficient_data')

// ケース2: 前月 CVR=10%, 今月 CVR=15%（大幅改善・十分な母数）
// prev: clicks=500, final_cv=50 / curr: clicks=500, final_cv=75
// 期待: judgment = 'significant_improve'
//
// const result2 = zTestCVR(
//   { final_cv: 50, clicks: 500 },
//   { final_cv: 75, clicks: 500 }
// )
// assert(result2.judgment === 'significant_improve')
// assert(result2.z > 0)
// assert(result2.p < 0.05)

// ケース3: 前月 CVR=10%, 今月 CVR=8%（小幅悪化）
// prev: clicks=500, final_cv=50 / curr: clicks=500, final_cv=40
// 期待: judgment = 'no_change' または 'significant_worse'
//
// const result3 = zTestCVR(
//   { final_cv: 50, clicks: 500 },
//   { final_cv: 40, clicks: 500 }
// )
// assert(result3.z < 0)

// ケース4: 前月 CVR=5%, 今月 CVR=7.5%（緩やかな改善）
// prev: clicks=200, final_cv=10 / curr: clicks=200, final_cv=15
// 期待: judgment = 'trend_improve' または 'no_change'（p < 0.1 の可否による）
//
// const result4 = zTestCVR(
//   { final_cv: 10, clicks: 200 },
//   { final_cv: 15, clicks: 200 }
// )
// assert(result4.z > 0)

// ケース5: 前月 clicks < 30 → insufficient_data
// prev: clicks=20, final_cv=5 / curr: clicks=200, final_cv=20
// 期待: judgment = 'insufficient_data'
//
// const result5 = zTestCVR(
//   { final_cv: 5,  clicks: 20  },
//   { final_cv: 20, clicks: 200 }
// )
// assert(result5.judgment === 'insufficient_data')

// ケース6: 前後 CVR が同一（標準誤差 > 0）→ no_change
// prev: clicks=1000, final_cv=100 / curr: clicks=1000, final_cv=100
// 期待: judgment = 'no_change', z ≈ 0
//
// const result6 = zTestCVR(
//   { final_cv: 100, clicks: 1000 },
//   { final_cv: 100, clicks: 1000 }
// )
// assert(result6.judgment === 'no_change')
// assert(Math.abs(result6.z) < 0.001)

export {}

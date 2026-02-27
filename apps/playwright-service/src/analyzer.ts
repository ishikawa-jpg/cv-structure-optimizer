import { chromium } from 'playwright'

export interface CTAElement {
  text: string
  href: string | null
  selector_candidates: string[]
  position: 'top' | 'mid' | 'bottom' | 'sticky' | 'unknown'
}

export interface FormElement {
  selector_candidates: string[]
  in_iframe: boolean
}

export interface AnchorElement {
  href: string
  text: string
}

export interface SectionElement {
  section_name_guess: string
  selector_candidates: string[]
  heading_text: string
}

export interface LPAnalysisResult {
  ctas: CTAElement[]
  forms: FormElement[]
  anchors: AnchorElement[]
  sections: SectionElement[]
  flags: {
    is_single_page_like: boolean
    has_anchor_jump_risk: boolean
  }
  error?: string
}

// 要素の縦位置からポジションを判定
function getPosition(y: number, pageHeight: number): 'top' | 'mid' | 'bottom' {
  const ratio = y / pageHeight
  if (ratio < 0.33) return 'top'
  if (ratio < 0.67) return 'mid'
  return 'bottom'
}

// テキストがCTAらしいかチェック
function isCTALike(text: string): boolean {
  const ctaPatterns = [
    /無料/,
    /申し込/,
    /資料請求/,
    /お問い合わせ/,
    /問い合わせ/,
    /ダウンロード/,
    /登録/,
    /始める/,
    /試す/,
    /詳しく/,
    /contact/i,
    /download/i,
    /sign up/i,
    /get start/i,
    /free/i,
    /request/i,
    /apply/i,
    /submit/i,
  ]
  return ctaPatterns.some((p) => p.test(text))
}

export async function analyzeLp(url: string): Promise<LPAnalysisResult> {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const page = await context.newPage()

    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })

    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)

    // --- CTA 抽出 ---
    const ctas: CTAElement[] = await page.evaluate((height: number) => {
      const results: Array<{
        text: string
        href: string | null
        tag: string
        id: string
        className: string
        y: number
        isSticky: boolean
      }> = []

      // button, a要素, input[type=submit], input[type=button] を対象
      const candidates = document.querySelectorAll<HTMLElement>(
        'button, a[href], input[type="submit"], input[type="button"]'
      )

      candidates.forEach((el) => {
        const text = el.textContent?.trim() || (el as HTMLInputElement).value || ''
        if (!text || text.length > 50) return

        const rect = el.getBoundingClientRect()
        const scrollY = window.scrollY
        const absY = rect.top + scrollY

        // 非表示要素はスキップ
        const style = window.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') return

        const position = window.getComputedStyle(el.closest('[style]') || el).position
        const isSticky = position === 'sticky' || position === 'fixed'

        results.push({
          text,
          href: (el as HTMLAnchorElement).href || null,
          tag: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          y: absY,
          isSticky,
        })
      })

      return results
    }, pageHeight)

    const ctaElements: CTAElement[] = ctas
      .filter((c) => {
        const isCTA =
          isCTALike(c.text) ||
          c.className.toLowerCase().includes('btn') ||
          c.className.toLowerCase().includes('button') ||
          c.className.toLowerCase().includes('cta')
        return isCTA
      })
      .slice(0, 10)
      .map((c) => {
        const pos: CTAElement['position'] = c.isSticky
          ? 'sticky'
          : getPosition(c.y, pageHeight)

        const selectors: string[] = []
        if (c.id) selectors.push(`#${c.id}`)
        if (c.className) {
          const firstClass = c.className.trim().split(/\s+/)[0]
          if (firstClass) selectors.push(`.${firstClass}`)
        }
        selectors.push(`${c.tag}:has-text("${c.text.substring(0, 20)}")`)

        return {
          text: c.text,
          href: c.href,
          selector_candidates: selectors,
          position: pos,
        }
      })

    // --- フォーム抽出 ---
    const forms: Array<{ selector: string; id: string; className: string }> =
      await page.evaluate(() => {
        const results: Array<{ selector: string; id: string; className: string }> = []
        document.querySelectorAll('form').forEach((form) => {
          results.push({
            selector: 'form',
            id: form.id,
            className: form.className,
          })
        })
        return results
      })

    const formElements: FormElement[] = forms.map((f) => {
      const selectors: string[] = []
      if (f.id) selectors.push(`#${f.id}`)
      if (f.className) {
        const firstClass = f.className.trim().split(/\s+/)[0]
        if (firstClass) selectors.push(`.${firstClass}`)
      }
      selectors.push('form')
      return { selector_candidates: selectors, in_iframe: false }
    })

    // iframe 内フォーム検出（試行）
    const iframes = page.frames().filter((f) => f !== page.mainFrame())
    for (const iframe of iframes) {
      try {
        const hasForm = await iframe.evaluate(
          () => document.querySelectorAll('form').length > 0
        )
        if (hasForm) {
          formElements.push({ selector_candidates: ['iframe form'], in_iframe: true })
        }
      } catch {
        // iframe アクセス失敗は無視
      }
    }

    // --- アンカーリンク抽出 ---
    const anchors: AnchorElement[] = await page.evaluate(() => {
      const results: Array<{ href: string; text: string }> = []
      document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
        const text = a.textContent?.trim() || ''
        if (text) {
          results.push({ href: a.getAttribute('href') || '', text })
        }
      })
      return results
    })

    // --- セクション抽出 ---
    const sections: SectionElement[] = await page.evaluate(() => {
      const results: Array<{
        section_name_guess: string
        selector_candidates: string[]
        heading_text: string
      }> = []

      document.querySelectorAll('h2, h3').forEach((heading) => {
        const text = heading.textContent?.trim() || ''
        if (!text || text.length > 100) return

        const parent = heading.closest('section, div, article') || heading.parentElement
        const selectors: string[] = []

        if (parent && (parent as HTMLElement).id) {
          selectors.push(`#${(parent as HTMLElement).id}`)
        }
        if (parent && (parent as HTMLElement).className) {
          const firstClass = (parent as HTMLElement).className.trim().split(/\s+/)[0]
          if (firstClass) selectors.push(`.${firstClass}`)
        }
        selectors.push(
          `${heading.tagName.toLowerCase()}:has-text("${text.substring(0, 20)}")`
        )

        results.push({
          section_name_guess: text.substring(0, 30),
          selector_candidates: selectors,
          heading_text: text,
        })
      })
      return results
    })

    // --- フラグ判定 ---
    const anchorCount = anchors.length
    const hasAnchorJumpRisk = anchorCount >= 3

    // ページ高さとビューポート高さの比率でSPA判定
    const isSinglePageLike = pageHeight > 3000 && sections.length >= 3

    return {
      ctas: ctaElements,
      forms: formElements,
      anchors,
      sections: sections.slice(0, 10),
      flags: {
        is_single_page_like: isSinglePageLike,
        has_anchor_jump_risk: hasAnchorJumpRisk,
      },
    }
  } finally {
    await browser.close()
  }
}

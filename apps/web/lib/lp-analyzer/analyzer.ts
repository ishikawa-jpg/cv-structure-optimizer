import { parse } from 'node-html-parser'

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

// CTA判定用テキストパターン（日本語・英語）
const CTA_TEXT_PATTERNS = [
  '無料',
  '申し込',
  '資料請求',
  'お問い合わせ',
  '問い合わせ',
  'ダウンロード',
  '登録',
  '始める',
  '試す',
  '詳しく',
  'contact',
  'download',
  'sign up',
  'get start',
  'free',
  'request',
  'apply',
  'submit',
]

function isCTAByText(text: string): boolean {
  const lower = text.toLowerCase()
  return CTA_TEXT_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()))
}

function isCTAByClass(className: string): boolean {
  const lower = className.toLowerCase()
  return lower.includes('btn') || lower.includes('button') || lower.includes('cta')
}

function buildSelectorCandidates(
  id: string | null,
  className: string | null,
  tagName: string,
  labelText: string
): string[] {
  const candidates: string[] = []

  if (id) {
    candidates.push(`#${id}`)
  }

  if (className) {
    const firstClass = className.trim().split(/\s+/)[0]
    if (firstClass) {
      candidates.push(`.${firstClass}`)
    }
  }

  const truncated = labelText.slice(0, 20)
  candidates.push(`${tagName.toLowerCase()}:has-text("${truncated}")`)

  return candidates
}

const EMPTY_RESULT: Omit<LPAnalysisResult, 'error'> = {
  ctas: [],
  forms: [],
  anchors: [],
  sections: [],
  flags: {
    is_single_page_like: false,
    has_anchor_jump_risk: false,
  },
}

export async function analyzeLp(url: string): Promise<LPAnalysisResult> {
  let html: string

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return {
        ...EMPTY_RESULT,
        error: `HTTPエラー: ${response.status} ${response.statusText} (URL: ${url})`,
      }
    }

    html = await response.text()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      ...EMPTY_RESULT,
      error: `fetch失敗: ${message} (URL: ${url})`,
    }
  }

  try {
    const root = parse(html)

    // ── CTA抽出 ──────────────────────────────────────────────────────────────
    const ctaNodes = root.querySelectorAll(
      'button, a[href], input[type=submit], input[type=button]'
    )

    const ctas: CTAElement[] = []

    for (const node of ctaNodes) {
      if (ctas.length >= 10) break

      const rawText =
        node.tagName.toLowerCase() === 'input'
          ? (node.getAttribute('value') ?? node.getAttribute('placeholder') ?? '')
          : node.text

      const text = rawText.replace(/\s+/g, ' ').trim()

      if (text.length === 0 || text.length > 50) continue

      const className = node.getAttribute('class') ?? ''
      const qualifiesByText = isCTAByText(text)
      const qualifiesByClass = isCTAByClass(className)

      if (!qualifiesByText && !qualifiesByClass) continue

      const id = node.getAttribute('id') ?? null
      const href =
        node.tagName.toLowerCase() === 'a' ? (node.getAttribute('href') ?? null) : null

      const selector_candidates = buildSelectorCandidates(
        id,
        className || null,
        node.tagName,
        text
      )

      ctas.push({
        text,
        href,
        selector_candidates,
        position: 'unknown',
      })
    }

    // ── フォーム抽出 ──────────────────────────────────────────────────────────
    const formNodes = root.querySelectorAll('form')
    const forms: FormElement[] = formNodes.map((node) => {
      const id = node.getAttribute('id') ?? null
      const className = node.getAttribute('class') ?? null

      const selector_candidates: string[] = []
      if (id) {
        selector_candidates.push(`#${id}`)
      }
      if (className) {
        const firstClass = className.trim().split(/\s+/)[0]
        if (firstClass) {
          selector_candidates.push(`.${firstClass}`)
        }
      }
      if (selector_candidates.length === 0) {
        selector_candidates.push('form')
      }

      return {
        selector_candidates,
        in_iframe: false,
      }
    })

    // ── アンカーリンク抽出 ────────────────────────────────────────────────────
    const anchorNodes = root.querySelectorAll('a[href]')
    const anchors: AnchorElement[] = []

    for (const node of anchorNodes) {
      const href = node.getAttribute('href') ?? ''
      if (!href.startsWith('#')) continue

      const text = node.text.replace(/\s+/g, ' ').trim()
      if (text.length === 0) continue

      anchors.push({ href, text })
    }

    // ── セクション抽出 ────────────────────────────────────────────────────────
    const headingNodes = root.querySelectorAll('h2, h3')
    const sections: SectionElement[] = []

    for (const node of headingNodes) {
      if (sections.length >= 10) break

      const headingText = node.text.replace(/\s+/g, ' ').trim()
      if (headingText.length === 0 || headingText.length > 100) continue

      const section_name_guess = headingText.slice(0, 30)

      const parent = node.parentNode
      const selector_candidates: string[] = []

      if (parent) {
        const parentId = (parent as typeof node).getAttribute?.('id') ?? null
        const parentClass = (parent as typeof node).getAttribute?.('class') ?? null

        if (parentId) {
          selector_candidates.push(`#${parentId}`)
        } else if (parentClass) {
          const firstClass = parentClass.trim().split(/\s+/)[0]
          if (firstClass) {
            selector_candidates.push(`.${firstClass}`)
          }
        }
      }

      const truncated = headingText.slice(0, 20)
      selector_candidates.push(
        `${node.tagName.toLowerCase()}:has-text("${truncated}")`
      )

      sections.push({
        section_name_guess,
        selector_candidates,
        heading_text: headingText,
      })
    }

    // ── フラグ判定 ────────────────────────────────────────────────────────────
    const has_anchor_jump_risk = anchors.length >= 3
    const is_single_page_like = sections.length >= 3

    return {
      ctas,
      forms,
      anchors,
      sections,
      flags: {
        is_single_page_like,
        has_anchor_jump_risk,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      ...EMPTY_RESULT,
      error: `HTML解析失敗: ${message}`,
    }
  }
}

#!/usr/bin/env node

/**
 * Fetch one official learning-resource page and print its readable text.
 * This intentionally has no third-party dependency so content audits can run
 * in a clean checkout. It is an audit aid, not a general HTML parser.
 */

const args = process.argv.slice(2)
const url = args[0]
const fromArg = args.find((arg) => arg.startsWith('--from='))
const toArg = args.find((arg) => arg.startsWith('--to='))
const fromLine = fromArg ? Number.parseInt(fromArg.slice('--from='.length), 10) : 1
const toLine = toArg ? Number.parseInt(toArg.slice('--to='.length), 10) : Number.POSITIVE_INFINITY

if (!url) {
  console.error('Usage: node scripts/audit-learning-source.mjs <url> [--from=1] [--to=200]')
  process.exit(1)
}

if (!Number.isInteger(fromLine) || fromLine < 1 || (!Number.isInteger(toLine) && toLine !== Number.POSITIVE_INFINITY) || toLine < fromLine) {
  console.error('Line range must use positive integers and satisfy --to >= --from.')
  process.exit(1)
}

const decodeEntities = (value) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")

const extractBalancedElement = (html, tagName, startIndex) => {
  const token = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi')
  token.lastIndex = startIndex
  let depth = 0
  let firstStart = -1
  let match

  while ((match = token.exec(html))) {
    const isClosing = match[0].startsWith('</')
    if (!isClosing) {
      if (depth === 0) firstStart = match.index + match[0].length
      depth += 1
    } else {
      depth -= 1
      if (depth === 0 && firstStart >= 0) return html.slice(firstStart, match.index)
    }
  }

  return null
}

const pickReadableRegion = (html) => {
  const candidates = [
    ['article', /<article\b[^>]*>/i],
    ['main', /<main\b[^>]*>/i],
    ['div', /<div\b[^>]*(?:class|id)=["'][^"']*(?:theme-doc-markdown|vp-doc|markdown-body|documentation|content)[^"']*["'][^>]*>/i],
  ]

  for (const [tagName, pattern] of candidates) {
    const match = pattern.exec(html)
    if (!match) continue
    const region = extractBalancedElement(html, tagName, match.index)
    if (region && region.length > 300) return region
  }

  return html
}

const toText = (html) => {
  const readable = pickReadableRegion(html)
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<(script|style|svg|nav|aside|footer|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(h[1-6]|p|li|pre|blockquote|tr|section|div|br|hr)\b[^>]*>/gi, '\n')
    .replace(/<\/((h[1-6])|p|li|pre|blockquote|tr|section|div)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  return decodeEntities(readable)
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter(Boolean)
    .filter((line, index, lines) => index === 0 || line !== lines[index - 1])
    .join('\n')
}

const response = await fetch(url, {
  redirect: 'follow',
  headers: {
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.6',
    'user-agent': 'CareerAtlasLearningAudit/1.0 (+full-text semantic review)',
  },
})

if (!response.ok) {
  console.error(`${response.status} ${response.statusText} ${response.url}`)
  process.exit(2)
}

const html = await response.text()
const text = toText(html)
const lines = text.split('\n')

console.log(`SOURCE_URL: ${url}`)
console.log(`FINAL_URL: ${response.url}`)
console.log(`STATUS: ${response.status}`)
console.log(`TEXT_LINES: ${lines.length}`)
console.log(`TEXT_CHARS: ${text.length}`)
console.log(`PRINTED_RANGE: ${fromLine}-${Math.min(toLine, lines.length)}`)
console.log('--- BEGIN READABLE TEXT ---')
console.log(lines.slice(fromLine - 1, toLine).join('\n'))
console.log('--- END READABLE TEXT ---')

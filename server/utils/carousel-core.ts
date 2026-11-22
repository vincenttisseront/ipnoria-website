import { wrap } from './og-core'

// Diapositives de carrousel (format portrait 1080 × 1350, recommandé pour les documents LinkedIn) en SVG.
export type Slide =
  | { kind: 'cover', kicker: string, title: string, subtitle?: string }
  | { kind: 'list', heading: string, items: string[], index: number, total: number }
  | { kind: 'end', title: string, text: string, url: string }

const esc = (s: string) => s.replace(/‑/g, '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const W = 1080
const H = 1350
const MARK = `<rect width="24" height="24" rx="6.5" fill="#141a28"/><rect x=".5" y=".5" width="23" height="23" rx="6" fill="none" stroke="#ffffff" stroke-opacity=".14"/>
<g fill="#ffffff" fill-opacity=".16"><circle cx="6" cy="9" r="1"/><circle cx="18" cy="9" r="1"/><circle cx="6" cy="13.5" r="1"/><circle cx="18" cy="13.5" r="1"/><circle cx="6" cy="18" r="1"/><circle cx="18" cy="18" r="1"/></g>
<rect x="10.4" y="10" width="3.2" height="9" rx="1.6" fill="#edf0f7"/><circle cx="12" cy="6" r="2.1" fill="#5b8cff"/>`

function frame(inner: string, site: string, page: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><radialGradient id="g" cx="0.1" cy="0" r="1"><stop offset="0" stop-color="#5b8cff" stop-opacity=".22"/><stop offset="1" stop-color="#5b8cff" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="#07090f"/><rect width="${W}" height="${H}" fill="url(#g)"/>
<g transform="translate(80 80) scale(2.4)">${MARK}</g><text x="156" y="122" font-family="Geist" font-weight="600" font-size="38" fill="#edf0f7">Ipnoria</text>
${inner}
<line x1="80" y1="${H - 110}" x2="${W - 80}" y2="${H - 110}" stroke="#ffffff" stroke-opacity=".1"/>
<text x="80" y="${H - 62}" font-family="Geist Mono" font-size="28" fill="#9aa3b8">${esc(site)}</text>
<text x="${W - 80}" y="${H - 62}" text-anchor="end" font-family="Geist" font-size="28" fill="#9aa3b8">${esc(page)}</text>
</svg>`
}

export function slideSvg(s: Slide, site: string, page: string): string {
  if (s.kind === 'cover') {
    const t = wrap(s.title, 84, 920, 5, 0.55)
    const sub = s.subtitle ? wrap(s.subtitle, 36, 920, 4, 0.52) : []
    const y0 = 470
    return frame(`<text x="80" y="${y0 - 110}" font-family="Geist" font-weight="600" font-size="34" fill="#5b8cff">${esc(s.kicker)}</text>
${t.map((l, i) => `<text x="80" y="${y0 + i * 92}" font-family="Geist" font-weight="600" font-size="84" letter-spacing="-2" fill="#edf0f7">${esc(l)}</text>`).join('')}
${sub.map((l, i) => `<text x="80" y="${y0 + t.length * 92 + 50 + i * 50}" font-family="Geist" font-size="36" fill="#9aa3b8">${esc(l)}</text>`).join('')}`, site, page)
  }
  if (s.kind === 'list') {
    let y = 330
    const parts = [`<text x="80" y="${y - 70}" font-family="Geist" font-weight="600" font-size="30" fill="#5b8cff">${s.index} / ${s.total}</text>`]
    for (const l of wrap(s.heading, 60, 920, 3, 0.55)) { parts.push(`<text x="80" y="${y}" font-family="Geist" font-weight="600" font-size="60" letter-spacing="-1" fill="#edf0f7">${esc(l)}</text>`); y += 70 }
    y += 40
    for (const it of s.items) {
      const lines = wrap(it, 36, 860, 4, 0.52)
      parts.push(`<rect x="80" y="${y - 26}" width="14" height="14" rx="3" fill="#5b8cff"/>`)
      for (const l of lines) { parts.push(`<text x="120" y="${y}" font-family="Geist" font-size="36" fill="#d7dcea">${esc(l)}</text>`); y += 48 }
      y += 30
      if (y > H - 200) break
    }
    return frame(parts.join('\n'), site, page)
  }
  const t = wrap(s.title, 76, 920, 4, 0.55)
  const txt = wrap(s.text, 38, 920, 5, 0.52)
  return frame(`${t.map((l, i) => `<text x="80" y="${470 + i * 86}" font-family="Geist" font-weight="600" font-size="76" letter-spacing="-2" fill="#edf0f7">${esc(l)}</text>`).join('')}
${txt.map((l, i) => `<text x="80" y="${470 + t.length * 86 + 50 + i * 52}" font-family="Geist" font-size="38" fill="#9aa3b8">${esc(l)}</text>`).join('')}
<rect x="80" y="${H - 330}" width="${Math.min(920, s.url.length * 22 + 80)}" height="96" rx="48" fill="#5b8cff"/>
<text x="120" y="${H - 268}" font-family="Geist Mono" font-size="34" fill="#ffffff">${esc(s.url)}</text>`, site, page)
}

/** Points forts d'une note de version Markdown : le texte en gras en tête de chaque puce, sinon la première phrase. */
export function releaseHighlights(body: string, max = 12): string[] {
  const out: string[] = []
  for (const line of body.split('\n')) {
    const m = /^\s*[-*]\s+(.*)$/.exec(line)
    if (!m) continue
    const bold = /^\*\*(.+?)\*\*/.exec(m[1]!)
    let txt = (bold ? bold[1]! : m[1]!.split(/(?<=[.!?])\s/)[0]!).replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').trim()
    txt = txt.replace(/[.:;]$/, '')
    if (txt.length > 140) txt = `${txt.slice(0, 137).trimEnd()}…`
    if (txt.length >= 8) out.push(txt)
    if (out.length >= max) break
  }
  return out
}

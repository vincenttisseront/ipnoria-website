// Images d'aperçu (1200 × 630) dessinées en SVG puis converties en PNG : titre, sur-titre, sous-titre,
// marque Ipnoria, trame d'adresses. Mesure du texte approchée (largeur moyenne des glyphes de Geist).

export interface OgCard {
  kicker: string
  title: string
  subtitle?: string
  footer?: string
  badge?: string
  /** Image intégrée (logo d'une référence) : data URI PNG, JPEG ou WebP */
  image?: { href: string, dark: boolean }
}

// Trait d'union insécable (U+2011) absent du sous-ensemble latin des polices : remplacé par un trait d'union
const esc = (s: string) => s.replace(/\u2011/g, '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Coupe un texte en lignes d'au plus maxWidth pixels (approximation), avec points de suspension au-delà de maxLines. */
export function wrap(text: string, size: number, maxWidth: number, maxLines: number, factor = 0.56): string[] {
  const perLine = Math.max(8, Math.floor(maxWidth / (size * factor)))
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length <= perLine) { cur = next; continue }
    if (cur) lines.push(cur)
    cur = w.length > perLine ? `${w.slice(0, perLine - 1)}…` : w
    if (lines.length === maxLines) break
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  if (lines.length > maxLines) lines.length = maxLines
  const used = lines.join(' ').split(' ').length
  if (used < words.length && lines.length) {
    const last = lines[lines.length - 1]!
    lines[lines.length - 1] = `${last.length >= perLine - 1 ? last.slice(0, perLine - 2) : last}…`
  }
  return lines
}

const MARK = `<rect width="24" height="24" rx="6.5" fill="#141a28"/><rect x=".5" y=".5" width="23" height="23" rx="6" fill="none" stroke="#ffffff" stroke-opacity=".14"/>
<g fill="#ffffff" fill-opacity=".16"><circle cx="6" cy="9" r="1"/><circle cx="18" cy="9" r="1"/><circle cx="6" cy="13.5" r="1"/><circle cx="18" cy="13.5" r="1"/><circle cx="6" cy="18" r="1"/><circle cx="18" cy="18" r="1"/></g>
<rect x="10.4" y="10" width="3.2" height="9" rx="1.6" fill="#edf0f7"/><circle cx="12" cy="6" r="2.1" fill="#5b8cff"/>`

export function ogSvg(c: OgCard, site: string): string {
  const W = 1200
  const H = 630
  const textW = c.image ? 760 : 820
  const titleSize = c.title.length > 60 ? 54 : c.title.length > 34 ? 62 : 72
  const title = wrap(c.title, titleSize, textW, 3, 0.55)
  const sub = c.subtitle ? wrap(c.subtitle, 28, textW, 2, 0.52) : []
  const titleY = 236 + Math.round(titleSize * 0.35)
  const lh = Math.round(titleSize * 1.08)
  const subY = titleY + title.length * lh + 22
  // Trame d'adresses : quelques adresses « allouées » en bleu
  const dots: string[] = []
  for (let r = 0; r < 7; r++) {
    for (let k = 0; k < 7; k++) {
      const on = (r * 7 + k) % 11 === 3
      dots.push(`<rect x="${940 + k * 34}" y="${54 + r * 34}" width="22" height="22" rx="5" fill="${on ? '#5b8cff' : '#ffffff'}" fill-opacity="${on ? 0.9 : 0.05}"/>`)
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><radialGradient id="g" cx="0.15" cy="0" r="0.9"><stop offset="0" stop-color="#5b8cff" stop-opacity=".22"/><stop offset="1" stop-color="#5b8cff" stop-opacity="0"/></radialGradient>
<linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="#07090f" stop-opacity="1"/><stop offset="1" stop-color="#07090f" stop-opacity="0"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="#07090f"/><rect width="${W}" height="${H}" fill="url(#g)"/>
${c.image ? '' : `<g>${dots.join('')}</g><rect x="920" y="40" width="160" height="260" fill="url(#fade)"/>`}
<g transform="translate(80 70) scale(2.2)">${MARK}</g>
<text x="150" y="108" font-family="Geist" font-weight="600" font-size="34" fill="#edf0f7">Ipnoria</text>
${c.kicker ? `<text x="80" y="${titleY - titleSize - 14}" font-family="Geist" font-weight="600" font-size="26" fill="#5b8cff">${esc(c.kicker)}</text>` : ''}
${title.map((l, i) => `<text x="80" y="${titleY + i * lh}" font-family="Geist" font-weight="600" font-size="${titleSize}" letter-spacing="-1.5" fill="#edf0f7">${esc(l)}</text>`).join('\n')}
${sub.map((l, i) => `<text x="80" y="${subY + 10 + i * 38}" font-family="Geist" font-size="28" fill="#9aa3b8">${esc(l)}</text>`).join('\n')}
${c.image ? `<rect x="880" y="200" width="240" height="160" rx="22" fill="${c.image.dark ? '#0d111a' : '#ffffff'}" stroke="#ffffff" stroke-opacity=".12"/><image href="${c.image.href}" x="904" y="224" width="192" height="112" preserveAspectRatio="xMidYMid meet"/>` : ''}
<line x1="80" y1="${H - 92}" x2="${W - 80}" y2="${H - 92}" stroke="#ffffff" stroke-opacity=".09"/>
<text x="80" y="${H - 50}" font-family="Geist Mono" font-size="24" fill="#9aa3b8">${esc(site)}</text>
${c.footer ? `<text x="${W - 80}" y="${H - 50}" text-anchor="end" font-family="Geist" font-size="24" fill="#9aa3b8">${esc(c.footer)}</text>` : ''}
${c.badge ? `<rect x="${80 + esc(c.kicker).length * 15 + 24}" y="${titleY - titleSize - 42}" width="${c.badge.length * 13 + 32}" height="38" rx="19" fill="#5b8cff" fill-opacity=".18" stroke="#5b8cff" stroke-opacity=".5"/><text x="${80 + esc(c.kicker).length * 15 + 40}" y="${titleY - titleSize - 16}" font-family="Geist" font-weight="600" font-size="20" fill="#9cb8ff">${esc(c.badge)}</text>` : ''}
</svg>`
}

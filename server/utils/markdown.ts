import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import { docByPath, fold } from '#shared/docs'
import { GITHUB_URL } from '#shared/links'

/**
 * Rendu Markdown sûr : HTML brut désactivé (échappé), liens javascript:/data: refusés par markdown-it,
 * liens externes en rel="noopener", liens internes du dépôt réécrits vers les pages du site,
 * images de docs/img servies par le site (CSP img-src 'self').
 */
export function renderMarkdown(src: string, opts: { basePath: string, locale: 'fr' | 'en' }): { html: string, toc: Array<{ id: string, title: string, level: number }> } {
  const toc: Array<{ id: string, title: string, level: number }> = []
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false })
  md.use(anchor, {
    level: [2, 3],
    slugify: (s: string) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    callback: (token, info) => {
      toc.push({ id: info.slug, title: info.title, level: Number(token.tag.slice(1)) })
    },
  })

  const dir = opts.basePath.includes('/') ? opts.basePath.slice(0, opts.basePath.lastIndexOf('/') + 1) : ''
  const resolve = (href: string) => {
    const [p, hash] = href.split('#')
    const parts: string[] = []
    for (const seg of (dir + p).split('/')) {
      if (seg === '..') parts.pop()
      else if (seg && seg !== '.') parts.push(seg)
    }
    return { path: parts.join('/'), hash }
  }

  md.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
    const token = tokens[idx]!
    const href = String(token.attrGet('href') ?? '')
    if (/^https?:\/\//.test(href)) {
      token.attrSet('rel', 'noopener')
    }
    else if (!href.startsWith('#') && !href.startsWith('mailto:')) {
      const { path, hash } = resolve(href)
      const doc = docByPath(path)
      const prefix = opts.locale === 'en' ? '/en/docs/' : '/documentation/'
      token.attrSet('href', doc ? `${prefix}${doc.slug}${hash ? `#${hash}` : ''}` : `${GITHUB_URL}/blob/main/${path}${hash ? `#${hash}` : ''}`)
      if (!doc) token.attrSet('rel', 'noopener')
    }
    return self.renderToken(tokens, idx, options)
  }

  md.renderer.rules.image = (tokens, idx) => {
    const token = tokens[idx]!
    const src = String(token.attrGet('src') ?? '')
    const alt = md.utils.escapeHtml(token.content)
    const { path } = resolve(src)
    const m = /^docs\/img\/([a-z0-9-]+)\.png$/.exec(path)
    if (!m) return `<span class="doc-img-missing">${alt}</span>`
    return `<img src="/docs-assets/${m[1]}.png" alt="${alt}" loading="lazy" decoding="async">`
  }

  // Les tableaux larges défilent horizontalement au lieu de déborder
  md.renderer.rules.table_open = () => '<div class="doc-table"><table>'
  md.renderer.rules.table_close = () => '</table></div>'

  return { html: md.render(src), toc }
}

/** Texte brut d'un document Markdown, découpé par titre : base de l'index de recherche. */
export function markdownSections(src: string): Array<{ heading: string, text: string }> {
  const sections: Array<{ heading: string, text: string }> = []
  let current = { heading: '', text: '' }
  for (const line of src.split('\n')) {
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      if (current.text.trim() || current.heading) sections.push(current)
      current = { heading: h[2]!.replace(/[`*_]/g, '').trim(), text: '' }
    }
    else {
      current.text += ` ${line.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_|>#-]+/g, ' ')}`
    }
  }
  sections.push(current)
  return sections.map(s => ({ heading: s.heading, text: s.text.replace(/\s+/g, ' ').trim() })).filter(s => s.text || s.heading)
}

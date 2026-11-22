import { DOCS, fold } from '#shared/docs'

interface Section { slug: string, docTitle: string, heading: string, anchor: string, text: string, folded: string, foldedHeading: string }

// Index plein texte de toute la documentation, découpé par titre ; reconstruit au plus une fois par heure
const buildIndex = defineCachedFunction(async (locale: 'fr' | 'en'): Promise<Section[]> => {
  const out: Section[] = []
  await Promise.all(DOCS.filter(d => !d.plain).map(async (doc) => {
    const path = locale === 'en' && doc.pathEn ? doc.pathEn : doc.path
    try {
      const src = await fetchRepoFile(path)
      for (const s of markdownSections(src)) {
        out.push({
          slug: doc.slug,
          docTitle: doc.title[locale],
          heading: s.heading,
          anchor: fold(s.heading).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          text: s.text,
          folded: fold(s.text),
          foldedHeading: fold(s.heading),
        })
      }
    }
    catch { /* document momentanément indisponible : simplement absent de l'index */ }
  }))
  return out
}, { name: 'docs-index', maxAge: 3600, staleMaxAge: 86400, getKey: (l: string) => l })

function snippet(text: string, folded: string, term: string): string {
  const at = folded.indexOf(term)
  const start = Math.max(0, at - 70)
  const s = text.slice(start, start + 200)
  return `${start > 0 ? '…' : ''}${s}${start + 200 < text.length ? '…' : ''}`
}

export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q ?? '').slice(0, 100)
  const locale = getQuery(event).locale === 'en' ? 'en' : 'fr'
  const terms = fold(q).split(/\s+/).filter(t => t.length >= 2).slice(0, 6)
  if (!terms.length) return { results: [] }

  const index = await buildIndex(locale)
  const results = index
    .map((s) => {
      let score = 0
      for (const t of terms) {
        const inHead = s.foldedHeading.includes(t)
        const count = s.folded.split(t).length - 1
        if (!inHead && !count) return null
        score += (inHead ? 10 : 0) + Math.min(count, 5)
      }
      return { s, score }
    })
    .filter((r): r is { s: Section, score: number } => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ s }) => ({
      slug: s.slug,
      docTitle: s.docTitle,
      heading: s.heading,
      anchor: s.anchor,
      snippet: snippet(s.text, s.folded, terms[0]!),
    }))
  return { results }
})

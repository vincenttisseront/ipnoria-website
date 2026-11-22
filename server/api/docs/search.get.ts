// Recherche limitée à la documentation (page Documentation) : même index que la recherche globale
export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q ?? '').slice(0, 100)
  const locale = getQuery(event).locale === 'en' ? 'en' : 'fr'
  const index = (await searchIndex(locale)).filter(e => e.kind === 'doc')
  const results = searchEntries(index, q).map(r => ({
    slug: r.url.replace(/^(\/en)?\/(documentation|docs)\//, '').split('#')[0],
    docTitle: r.context,
    heading: r.title,
    anchor: r.url.includes('#') ? r.url.split('#')[1] : '',
    snippet: r.snippet,
  }))
  return { results }
})

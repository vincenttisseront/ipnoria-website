// Recherche globale du site (palette Ctrl+K) : pages, outils, guides, documentation, nouveautés, comparatif, feuille de route
export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q ?? '').slice(0, 100)
  const locale = getQuery(event).locale === 'en' ? 'en' : 'fr'
  if (q.trim().length < 2) return { results: [] }
  const features = await siteFeatures()
  const hidden = [
    ...(!features.contact ? ['/contact'] : []),
    ...(!features.booking ? ['/rendez-vous', '/book-a-demo'] : []),
    ...(!features.demo ? ['/demo'] : []),
  ]
  const results = searchEntries(await searchIndex(locale), q)
    .filter(r => !hidden.some(path => r.url === path || r.url === `/en${path}` || r.url.endsWith(path)))
  return { results }
})

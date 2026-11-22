// Recherche globale du site (palette Ctrl+K) : pages, outils, guides, documentation, nouveautés, comparatif, feuille de route
export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q ?? '').slice(0, 100)
  const locale = getQuery(event).locale === 'en' ? 'en' : 'fr'
  if (q.trim().length < 2) return { results: [] }
  return { results: searchEntries(await searchIndex(locale), q) }
})

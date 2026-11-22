// Notes de version (CHANGELOG.md du produit) : liste, ou une page de 10 versions
export default defineEventHandler(async (event) => {
  const page = Math.max(1, Number(getQuery(event).page) || 1)
  const all = await loadChangelog()
  const slice = all.slice((page - 1) * 10, page * 10)
  return {
    total: all.length,
    page,
    pages: Math.ceil(all.length / 10),
    items: slice.map(e => ({
      version: e.version,
      title: e.title,
      publishedAt: e.publishedAt,
      releaseUrl: e.releaseUrl,
      html: renderMarkdown(e.body, { basePath: 'CHANGELOG.md', locale: 'fr' }).html,
    })),
  }
})

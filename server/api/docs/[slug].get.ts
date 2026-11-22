import { docBySlug } from '#shared/docs'
import { GITHUB_URL } from '#shared/links'

// Un document du dépôt, rendu en HTML sûr (voir server/utils/markdown.ts)
export default defineEventHandler(async (event) => {
  const doc = docBySlug(getRouterParam(event, 'slug') ?? '')
  if (!doc) throw createError({ statusCode: 404, statusMessage: 'Unknown document' })
  const locale = getQuery(event).locale === 'en' ? 'en' : 'fr'
  const path = locale === 'en' && doc.pathEn ? doc.pathEn : doc.path

  const src = await fetchRepoFile(path)
  const rendered = doc.plain
    ? { html: `<pre class="doc-plain">${src.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))}</pre>`, toc: [] }
    : renderMarkdown(src, { basePath: path, locale })

  setResponseHeader(event, 'cache-control', 'public, max-age=300')
  return {
    slug: doc.slug,
    title: doc.title[locale],
    html: rendered.html,
    toc: rendered.toc,
    frenchOnly: locale === 'en' && !doc.pathEn,
    sourceUrl: `${GITHUB_URL}/blob/main/${path}`,
  }
})

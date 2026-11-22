// Flux RSS 2.0 des versions d'Ipnoria (les 20 dernières)
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&apos;' }[c]!))

export default defineEventHandler(async (event) => {
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const entries = (await loadChangelog()).slice(0, 20)
  const items = entries.map((e) => {
    const link = `${site}/nouveautes/${e.version}`
    const html = renderMarkdown(e.body, { basePath: 'CHANGELOG.md', locale: 'fr' }).html
    return `    <item>
      <title>${esc(`Ipnoria ${e.version}${e.title ? ` : ${e.title}` : ''}`)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>${e.publishedAt ? `\n      <pubDate>${new Date(e.publishedAt).toUTCString()}</pubDate>` : ''}
      <description>${esc(html)}</description>
    </item>`
  }).join('\n')

  setResponseHeaders(event, { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=1800' })
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ipnoria : nouvelles versions</title>
    <link>${esc(`${site}/nouveautes`)}</link>
    <atom:link href="${esc(`${site}/rss.xml`)}" rel="self" type="application/rss+xml"/>
    <description>Journal des modifications d'Ipnoria, appliance DDI libre.</description>
    <language>fr</language>
${items}
  </channel>
</rss>
`
})

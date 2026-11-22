import { DOCS } from '#shared/docs'
import { GUIDES } from '#shared/guides'

// Plan du site avec alternatives de langue (hreflang). Pages FR à la racine, EN sous /en.
const PAGES: Array<[fr: string, en: string, priority: string]> = [
  ['/', '/en', '1.0'],
  ['/documentation', '/en/docs', '0.8'],
  ['/comparatif', '/en/comparison', '0.8'],
  ['/guides', '/en/guides', '0.8'],
  ['/nouveautes', '/en/releases', '0.7'],
  ['/demo', '/en/demo', '0.5'],
  ['/contact', '/en/contact', '0.6'],
  ['/confidentialite', '/en/privacy', '0.2'],
]

export default defineEventHandler(async (event) => {
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const pairs: Array<[string, string, string]> = [...PAGES]
  for (const d of DOCS) pairs.push([`/documentation/${d.slug}`, `/en/docs/${d.slug}`, '0.6'])
  for (const g of GUIDES.fr) pairs.push([`/guides/${g.slug}`, `/en/guides/${g.slug}`, '0.7'])
  try {
    for (const r of (await loadChangelog()).slice(0, 30)) pairs.push([`/nouveautes/${r.version}`, `/en/releases/${r.version}`, '0.4'])
  }
  catch { /* journal indisponible : plan sans les versions */ }

  const url = (loc: string, fr: string, en: string, p: string) => `  <url>
    <loc>${site}${loc}</loc>
    <xhtml:link rel="alternate" hreflang="fr" href="${site}${fr}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${site}${en}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${site}${fr}"/>
    <priority>${p}</priority>
  </url>`
  setResponseHeaders(event, { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' })
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pairs.flatMap(([fr, en, p]) => [url(fr, fr, en, p), url(en, fr, en, p)]).join('\n')}
</urlset>
`
})

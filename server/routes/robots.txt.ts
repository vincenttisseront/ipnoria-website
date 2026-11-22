// robots.txt dynamique : l'adresse du plan du site dépend du domaine (NUXT_PUBLIC_SITE_URL)
export default defineEventHandler((event) => {
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return `User-agent: *
Disallow: /api/
Disallow: /admin
Disallow: /auth/
Disallow: /newsletter

Sitemap: ${site}/sitemap.xml
`
})

export default defineEventHandler(async (event) => {
  const version = getRouterParam(event, 'version') ?? ''
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw createError({ statusCode: 404 })
  const all = await loadChangelog()
  const i = all.findIndex(e => e.version === version)
  if (i < 0) throw createError({ statusCode: 404, statusMessage: 'Unknown version' })
  const e = all[i]!
  return {
    version: e.version,
    title: e.title,
    publishedAt: e.publishedAt,
    releaseUrl: e.releaseUrl,
    html: renderMarkdown(e.body, { basePath: 'CHANGELOG.md', locale: 'fr' }).html,
    newer: all[i - 1]?.version ?? null,
    older: all[i + 1]?.version ?? null,
  }
})

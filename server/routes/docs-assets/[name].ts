// Images de la documentation (docs/img/*.png du dépôt public), servies par le site : CSP img-src 'self' et COEP respectés
export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') ?? ''
  const m = /^([a-z0-9-]+)\.png$/.exec(name)
  if (!m) throw createError({ statusCode: 404 })
  const b64 = await fetchRepoFile(`docs/img/${m[1]}.png`, true)
  setResponseHeaders(event, { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' })
  return Buffer.from(b64, 'base64')
})

// Logo d'une référence publiée (ou de n'importe quelle référence pour l'administration). Cache long :
// l'URL porte la date de mise à jour (?v=), un nouveau logo change donc d'adresse.
export default defineEventHandler(async (event) => {
  if (!hasDb()) throw createError({ statusCode: 404 })
  const id = (getRouterParam(event, 'id') ?? '').replace(/\.(png|webp|jpg)$/, '')
  if (!/^\d{1,12}$/.test(id)) throw createError({ statusCode: 404 })
  const preview = getQuery(event).apercu === '1'
  if (preview) await requireAdmin(event)
  const r = await useDb().query(
    `SELECT logo, logo_type FROM customer_references WHERE id = $1 AND logo IS NOT NULL ${preview ? '' : 'AND published'}`, [id],
  )
  if (!r.rowCount) throw createError({ statusCode: 404 })
  setResponseHeaders(event, {
    'content-type': r.rows[0].logo_type,
    'cache-control': preview ? 'no-store' : 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'cross-origin-resource-policy': 'same-origin',
    'content-security-policy': "default-src 'none'",
  })
  return r.rows[0].logo as Buffer
})

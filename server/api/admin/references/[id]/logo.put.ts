// Logo envoyé en binaire brut (PNG, WebP ou JPEG, 300 Ko au plus), type vérifié sur le contenu et non sur l'en-tête.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readRawBody(event, false)
  if (!body?.length) throw fail(400, 'logo_missing')
  if (body.length > LOGO_MAX_BYTES) throw fail(413, 'logo_too_large')
  const type = sniffImage(Buffer.from(body))
  if (!type) throw fail(415, 'logo_type')
  const r = await useDb().query('UPDATE customer_references SET logo = $2, logo_type = $3, updated_at = now() WHERE id = $1', [getRouterParam(event, 'id'), Buffer.from(body), type])
  if (!r.rowCount) throw createError({ statusCode: 404 })
  return { ok: true }
})

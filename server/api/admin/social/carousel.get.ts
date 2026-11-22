// Carrousel PDF (documents LinkedIn) : ?kind=release|article|beta&key=…&lang=fr|en
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const q = getQuery(event)
  const kind = String(q.kind ?? '')
  const key = String(q.key ?? '').slice(0, 80)
  const l = q.lang === 'en' ? 'en' : 'fr'
  const pdf = await carouselPdf(kind, key, l)
  if (!pdf) throw createError({ statusCode: 404 })
  await adminAudit(event, admin, 'social.carousel', kind, key, { lang: l })
  setResponseHeaders(event, { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="ipnoria-${kind}-${key.replace(/[^\w.-]/g, '')}-${l}.pdf"` })
  return pdf
})

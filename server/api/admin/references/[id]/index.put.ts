import { referenceSchema } from '#shared/account'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const d = await readJson(event, referenceSchema)
  try {
    const r = await useDb().query(
      `UPDATE customer_references SET slug = $2, name = $3, sector = $4, size = $5, location = NULLIF($6, ''), website = NULLIF($7, ''),
              services = $8, quote = $9, quote_author = NULLIF($10, ''), quote_role = $11, story = $12, logo_dark_bg = $13,
              authorized_by = NULLIF($14, ''), authorized_at = NULLIF($15, '')::date, published = $16, position = $17, updated_at = now()
        WHERE id = $1`,
      [getRouterParam(event, 'id'), d.slug, d.name, d.sector, d.size, d.location, d.website, d.services, d.quote, d.quoteAuthor, d.quoteRole,
        d.story, d.logoDarkBg, d.authorizedBy, d.authorizedAt, d.published, d.position],
    )
    if (!r.rowCount) throw createError({ statusCode: 404 })
    await adminAudit(event, admin, 'reference.update', 'customer_reference', getRouterParam(event, 'id'), { slug: d.slug, published: d.published, authorizedBy: d.authorizedBy })
    return { ok: true }
  }
  catch (err) {
    if ((err as { code?: string }).code === '23505') throw fail(409, 'slug_taken')
    throw err
  }
})

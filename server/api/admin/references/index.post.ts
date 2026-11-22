import { referenceSchema } from '#shared/account'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const d = await readJson(event, referenceSchema)
  try {
    const r = await useDb().query(
      `INSERT INTO customer_references (slug, name, sector, size, location, website, services, quote, quote_author, quote_role, story,
                                        logo_dark_bg, authorized_by, authorized_at, published, position)
       VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), $7, $8, NULLIF($9, ''), $10, $11, $12, NULLIF($13, ''), NULLIF($14, '')::date, $15, $16)
       RETURNING id::text`,
      [d.slug, d.name, d.sector, d.size, d.location, d.website, d.services, d.quote, d.quoteAuthor, d.quoteRole, d.story,
        d.logoDarkBg, d.authorizedBy, d.authorizedAt, d.published, d.position],
    )
    await adminAudit(event, admin, 'reference.create', 'customer_reference', r.rows[0].id, { slug: d.slug, published: d.published })
    return { ok: true, id: r.rows[0].id }
  }
  catch (err) {
    if ((err as { code?: string }).code === '23505') throw fail(409, 'slug_taken')
    throw err
  }
})

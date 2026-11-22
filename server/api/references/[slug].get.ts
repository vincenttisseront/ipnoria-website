export default defineEventHandler(async (event) => {
  if (!hasDb()) throw createError({ statusCode: 404 })
  const slug = getRouterParam(event, 'slug') ?? ''
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) throw createError({ statusCode: 404 })
  const r = await useDb().query(`SELECT ${REFERENCE_PUBLIC}, r.story FROM customer_references r WHERE r.published AND r.slug = $1`, [slug])
  if (!r.rowCount) throw createError({ statusCode: 404 })
  return r.rows[0]
})

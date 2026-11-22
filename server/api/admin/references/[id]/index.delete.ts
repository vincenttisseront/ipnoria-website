export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const r = await useDb().query('DELETE FROM customer_references WHERE id = $1', [getRouterParam(event, 'id')])
  if (!r.rowCount) throw createError({ statusCode: 404 })
  return { ok: true }
})

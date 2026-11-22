export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const r = await useDb().query('DELETE FROM customer_references WHERE id = $1', [getRouterParam(event, 'id')])
  if (!r.rowCount) throw createError({ statusCode: 404 })
  await adminAudit(event, admin, 'reference.delete', 'customer_reference', getRouterParam(event, 'id'), {})
  return { ok: true }
})

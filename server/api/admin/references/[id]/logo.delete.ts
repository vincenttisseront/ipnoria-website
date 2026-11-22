export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await useDb().query('UPDATE customer_references SET logo = NULL, logo_type = NULL, updated_at = now() WHERE id = $1', [getRouterParam(event, 'id')])
  return { ok: true }
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  await useDb().query('UPDATE customer_references SET logo = NULL, logo_type = NULL, updated_at = now() WHERE id = $1', [getRouterParam(event, 'id')])
  await adminAudit(event, admin, 'reference.logo.delete', 'customer_reference', getRouterParam(event, 'id'), {})
  return { ok: true }
})

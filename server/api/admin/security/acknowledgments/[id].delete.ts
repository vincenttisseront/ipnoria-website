export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  await useDb().query('DELETE FROM security_acknowledgments WHERE id = $1', [id])
  await adminAudit(event, admin, 'security.ack.delete', 'security_acknowledgment', id)
  return { ok: true }
})

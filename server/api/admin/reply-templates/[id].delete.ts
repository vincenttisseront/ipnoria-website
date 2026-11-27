export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !/^\d+$/.test(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid template' })
  const { rowCount } = await useDb().query(`DELETE FROM reply_templates WHERE id = $1`, [id])
  if (!rowCount) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  await adminAudit(event, admin, 'template.delete', 'reply_template', id)
  return { ok: true }
})

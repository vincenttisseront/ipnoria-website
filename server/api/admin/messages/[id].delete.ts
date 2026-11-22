import { z } from 'zod'

// Effacement définitif d'un message (demande d'effacement RGPD, spam)
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = z.coerce.number().int().positive().parse(getRouterParam(event, 'id'))
  const { rowCount } = await useDb().query('DELETE FROM contact_messages WHERE id = $1', [id])
  if (!rowCount) throw createError({ statusCode: 404 })
  console.info(`[admin] message ${id} supprimé par ${admin.email}`)
  await adminAudit(event, admin, 'message.delete', 'contact_message', getRouterParam(event, 'id'), {})
  return { ok: true }
})

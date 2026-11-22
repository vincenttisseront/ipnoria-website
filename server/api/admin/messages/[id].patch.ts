import { z } from 'zod'

// Marquer un message traité / à traiter
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = z.coerce.number().int().positive().parse(getRouterParam(event, 'id'))
  const { handled } = z.object({ handled: z.boolean() }).parse(await readBody(event))
  const { rowCount } = await useDb().query(
    `UPDATE contact_messages SET handled_at = CASE WHEN $2 THEN now() ELSE NULL END WHERE id = $1`,
    [id, handled],
  )
  if (!rowCount) throw createError({ statusCode: 404 })
  return { ok: true }
})

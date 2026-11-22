import { z } from 'zod'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { hidden } = await readJson(event, z.object({ hidden: z.boolean() }))
  await useDb().query('UPDATE idea_comments SET hidden = $2 WHERE id = $1', [getRouterParam(event, 'id'), hidden])
  return { ok: true }
})

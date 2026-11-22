import { passkeyNameSchema } from '#shared/account'

export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  const { name } = await readJson(event, passkeyNameSchema)
  await useDb().query('UPDATE user_passkeys SET name = $3 WHERE id = $1 AND user_id = $2', [getRouterParam(event, 'id'), s.user.id, name])
  return { ok: true }
})

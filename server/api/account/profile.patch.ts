import { profileSchema } from '#shared/account'

export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  const d = await readJson(event, profileSchema)
  await useDb().query(
    `UPDATE users SET display_name = $2, organization = NULLIF($3, ''), locale = $4, notify_status = $5, notify_comments = $6, updated_at = now() WHERE id = $1`,
    [s.user.id, d.displayName, d.organization, d.locale, d.notifyStatus, d.notifyComments],
  )
  return { ok: true, user: await loadUser(s.user.id) }
})

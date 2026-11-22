export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { recent: true })
  if (!s.user.hasPassword && !s.user.passkeys) throw fail(400, 'last_sign_in_method')
  await useDb().query('UPDATE users SET github_id = NULL, updated_at = now() WHERE id = $1', [s.user.id])
  await recordEvent(event, s.user, 'github_unlinked')
  return { ok: true }
})

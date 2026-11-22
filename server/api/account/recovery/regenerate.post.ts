export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { recent: true })
  if (!(await hasSecondFactor(s.user.id))) throw fail(400, 'no_second_factor')
  const codes = await ensureRecoveryCodes(s.user.id, true)
  await recordEvent(event, s.user, 'recovery_regenerated')
  return { recoveryCodes: codes }
})

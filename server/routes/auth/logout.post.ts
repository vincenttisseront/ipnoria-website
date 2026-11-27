export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  await clearAdminLogin(event)
  return { ok: true }
})
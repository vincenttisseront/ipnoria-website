export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  if (accountsEnabled()) await destroySession(event)
  return { ok: true }
})

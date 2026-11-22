export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const session = await useAdminSession(event)
  await session.clear()
  return { ok: true }
})

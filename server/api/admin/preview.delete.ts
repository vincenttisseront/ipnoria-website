export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const secure = useRuntimeConfig().public.siteUrl.startsWith('https://')
  deleteCookie(event, 'ipn_preview', { httpOnly: true, sameSite: 'lax', secure, path: '/' })
  return { ok: true }
})

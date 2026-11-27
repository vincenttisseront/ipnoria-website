import { isSiteFeatureKey } from '#shared/features'

function previewCookie(maxAge: number) {
  const secure = useRuntimeConfig().public.siteUrl.startsWith('https://')
  return { httpOnly: true, sameSite: 'lax' as const, secure, path: '/', maxAge }
}

// Mémorise l'élément à voir comme un visiteur, dix minutes, dans ce navigateur seulement.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const key = body?.key
  if (!isSiteFeatureKey(key)) throw createError({ statusCode: 400, statusMessage: 'Invalid feature' })
  setCookie(event, 'ipn_preview', key, previewCookie(600))
  return { key }
})

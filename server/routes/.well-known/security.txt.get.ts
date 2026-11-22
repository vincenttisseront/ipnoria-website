// security.txt (RFC 9116) : où signaler une vulnérabilité. Expiration recalculée à chaque lecture (6 mois).
export default defineEventHandler((event) => {
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const contact = securityContact()
  const { encryptionUrl } = useRuntimeConfig().disclosure
  const expires = new Date(Date.now() + 182 * 86400_000)
  expires.setUTCHours(0, 0, 0, 0)
  const lines = [
    ...(contact ? [`Contact: mailto:${contact}`] : []),
    `Contact: ${site}/securite#signaler`,
    `Expires: ${expires.toISOString()}`,
    ...(encryptionUrl ? [`Encryption: ${encryptionUrl}`] : []),
    'Preferred-Languages: fr, en',
    `Canonical: ${site}/.well-known/security.txt`,
    `Policy: ${site}/securite`,
    `Acknowledgments: ${site}/securite#remerciements`,
  ]
  setResponseHeaders(event, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' })
  return `${lines.join('\n')}\n`
})

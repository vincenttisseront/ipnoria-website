import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Empreinte non réversible de l'IP du client (sel secret) : sert à repérer les abus sans stocker l'adresse.
 * L'application n'est joignable que derrière le proxy (Caddy), qui écrase X-Forwarded-For avec l'IP réelle.
 */
export function clientIpHash(event: H3Event): string {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const { ipHashSalt } = useRuntimeConfig()
  return createHash('sha256').update(`${ipHashSalt}:${ip}`).digest('hex')
}

/** Refuse les requêtes d'écriture venues d'une autre origine (protection CSRF sans jeton, en plus de SameSite). */
export function assertSameOrigin(event: H3Event): void {
  const origin = getRequestHeader(event, 'origin')
  const { siteUrl } = useRuntimeConfig().public
  const expected = new URL(siteUrl).origin
  const host = getRequestHost(event, { xForwardedHost: true })
  const proto = getRequestProtocol(event, { xForwardedProto: true })
  const self = `${proto}://${host}`
  if (!origin || (origin !== expected && origin !== self)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden origin' })
  }
}

import * as client from 'openid-client'
import type { H3Event } from 'h3'

// Espace d'administration : connexion OpenID Connect (code + PKCE) auprès d'un fournisseur configurable,
// puis session chiffrée et signée (cookie HttpOnly, SameSite=Lax, 8 h). Accès réservé aux adresses de NUXT_ADMIN_EMAILS.

let configPromise: Promise<client.Configuration> | null = null

export function oidcEnabled(): boolean {
  const { oidc, sessionPassword } = useRuntimeConfig()
  return Boolean(oidc.issuer && oidc.clientId && String(sessionPassword).length >= 32)
}

export function oidcConfig(): Promise<client.Configuration> {
  if (configPromise) return configPromise
  const { oidc } = useRuntimeConfig()
  const insecure = String(oidc.allowInsecure) === 'true'
  configPromise = client.discovery(
    new URL(oidc.issuer),
    oidc.clientId,
    oidc.clientSecret || undefined,
    oidc.clientSecret ? undefined : client.None(),
    // HTTP seulement pour un fournisseur de test local ; jamais en production
    insecure ? { execute: [client.allowInsecureRequests] } : undefined,
  ).catch((err) => { configPromise = null; throw err })
  return configPromise
}

const sessionOptions = (name: string, maxAge: number) => {
  const { sessionPassword, public: { siteUrl } } = useRuntimeConfig()
  return {
    name,
    password: String(sessionPassword),
    maxAge,
    cookie: { httpOnly: true, sameSite: 'lax' as const, secure: siteUrl.startsWith('https://'), path: '/' },
  }
}

export interface FlowData { verifier?: string, state?: string, nonce?: string }
export interface AdminData { email?: string, name?: string }

export const useFlowSession = (event: H3Event) => useSession<FlowData>(event, sessionOptions('ipn_oidc', 600))
export const useAdminSession = (event: H3Event) => useSession<AdminData>(event, sessionOptions('ipn_admin', 8 * 3600))

export function allowedAdmin(email: string): boolean {
  const list = String(useRuntimeConfig().adminEmails).split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  return list.includes(email.toLowerCase())
}

/** Exige une session d'administration valide ; pour les écritures, exige aussi la même origine. */
export async function requireAdmin(event: H3Event): Promise<Required<AdminData>> {
  if (!oidcEnabled()) throw createError({ statusCode: 404 })
  if (event.method !== 'GET' && event.method !== 'HEAD') assertSameOrigin(event)
  const session = await useAdminSession(event)
  const { email, name } = session.data
  // La liste peut avoir changé depuis la connexion : on la relit à chaque requête
  if (!email || !allowedAdmin(email)) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  return { email, name: name ?? email }
}

export const callbackUrl = () => `${useRuntimeConfig().public.siteUrl.replace(/\/$/, '')}/auth/callback`

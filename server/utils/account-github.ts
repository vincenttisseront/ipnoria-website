import type { H3Event } from 'h3'

// Connexion GitHub (OAuth 2, facultative) : état et destination gardés dans un cookie chiffré de 10 minutes.
export interface GithubFlow { state?: string, next?: string, link?: boolean, locale?: 'fr' | 'en' }

export function githubEnabled(): boolean {
  const { accounts } = useRuntimeConfig()
  return accountsEnabled() && Boolean(accounts.githubClientId && accounts.githubClientSecret)
}

export const useGithubFlow = (event: H3Event) => useSession<GithubFlow>(event, {
  name: 'ipn_gh',
  password: String(useRuntimeConfig().accounts.secret),
  maxAge: 600,
  cookie: { httpOnly: true, sameSite: 'lax', secure: useRuntimeConfig().public.siteUrl.startsWith('https://'), path: '/api/account/github' },
})

export const githubCallbackUrl = () => `${useRuntimeConfig().public.siteUrl.replace(/\/$/, '')}/api/account/github/callback`

/** Échange le code contre un jeton, puis lit l'identifiant, le nom et l'adresse principale vérifiée. */
export async function githubIdentity(code: string): Promise<{ id: string, name: string, email: string | null }> {
  const { accounts } = useRuntimeConfig()
  const tok = await $fetch<{ access_token?: string }>('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json' },
    body: { client_id: accounts.githubClientId, client_secret: accounts.githubClientSecret, code, redirect_uri: githubCallbackUrl() },
    timeout: 8000,
  })
  if (!tok.access_token) throw new Error('GitHub token exchange failed')
  const headers = { authorization: `Bearer ${tok.access_token}`, accept: 'application/vnd.github+json', 'user-agent': 'ipnoria-website' }
  const [user, emails] = await Promise.all([
    $fetch<{ id: number, login: string, name: string | null }>('https://api.github.com/user', { headers, timeout: 8000 }),
    $fetch<Array<{ email: string, primary: boolean, verified: boolean }>>('https://api.github.com/user/emails', { headers, timeout: 8000 }),
  ])
  const primary = emails.find(e => e.primary && e.verified) ?? emails.find(e => e.verified)
  return { id: String(user.id), name: (user.name || user.login).slice(0, 60), email: primary?.email.toLowerCase() ?? null }
}

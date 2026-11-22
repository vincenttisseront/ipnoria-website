import type { PublicUser } from '#shared/account'

export interface AccountState { enabled: boolean, github: boolean, mfaPending: boolean, user: PublicUser | null }

// État du compte partagé par l'en-tête et les pages ; rechargé après connexion, déconnexion ou modification.
export function useAccount() {
  const state = useState<AccountState | null>('account', () => null)
  const fetcher = useRequestFetch()
  async function refresh() {
    try { state.value = await fetcher<AccountState>('/api/account/me') }
    catch { state.value = { enabled: false, github: false, mfaPending: false, user: null } }
  }
  async function ensure() { if (!state.value) await refresh() }
  async function logout() {
    await $fetch('/api/account/logout', { method: 'POST' }).catch(() => {})
    await refresh()
  }
  const user = computed(() => state.value?.user ?? null)
  return { state, user, refresh, ensure, logout }
}

/** Code d'erreur métier d'un appel d'API (data.code), ou un code générique selon le statut. */
export function apiErrorCode(err: unknown): string {
  const e = err as { data?: { data?: { code?: string }, statusCode?: number }, statusCode?: number, response?: { status?: number } }
  const code = e?.data?.data?.code
  if (code) return code
  const status = e?.statusCode ?? e?.data?.statusCode ?? e?.response?.status
  if (status === 429) return 'rate'
  if (status === 401) return 'signin'
  if (status === 400) return 'invalid'
  return 'server'
}
export function apiErrorExtra(err: unknown): Record<string, unknown> {
  return ((err as { data?: { data?: Record<string, unknown> } })?.data?.data) ?? {}
}

/** Messages d'erreur des comptes : clé account.err.<code>, message générique sinon. */
export function useAccountError() {
  const { t, te } = useI18n()
  return (err: unknown) => {
    const code = apiErrorCode(err)
    const extra = apiErrorExtra(err)
    return te(`account.err.${code}`) ? t(`account.err.${code}`, extra as Record<string, unknown>) : t('account.err.server')
  }
}

// Confirmation d'identité avant une action sensible : la boîte (ReauthDialog) est montée une fois dans la mise en page.
interface ReauthState { open: boolean, resolve: ((ok: boolean) => void) | null }
export function useReauth() {
  const s = useState<ReauthState>('reauth', () => ({ open: false, resolve: null }))
  const ask = () => new Promise<boolean>((resolve) => { s.value = { open: true, resolve } })
  /** Exécute fn ; si le serveur exige une confirmation récente, la demande puis réessaie une fois. */
  async function withReauth<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try { return await fn() }
    catch (err) {
      if (apiErrorCode(err) !== 'reauth') throw err
      if (!(await ask())) return undefined
      return await fn()
    }
  }
  return { state: s, ask, withReauth }
}

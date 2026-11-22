import { githubLinks } from '#shared/links'

export interface ReleaseInfo { version: string | null, url: string, publishedAt: string | null }

/** Dernière version publiée du produit (lue côté serveur sur GitHub, mise en cache une heure). */
export function useRelease() {
  return useFetch<ReleaseInfo>('/api/release', {
    key: 'release',
    default: () => ({ version: null, url: githubLinks.latestRelease, publishedAt: null }),
  })
}

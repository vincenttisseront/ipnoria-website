import { readFile } from 'node:fs/promises'
import { join, normalize } from 'node:path'
import { GITHUB_REPO } from '#shared/links'

const RAW = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/`
// Seuls ces chemins du dépôt public peuvent être lus (pas de lecture arbitraire via l'URL)
const ALLOWED = /^(?:README(?:\.en)?\.md|CHANGELOG\.md|OPEN-SOURCE\.md|LICENSE|docs\/[A-Z0-9-]+\.md|docs\/img\/[a-z0-9-]+\.png)$/

/**
 * Lit un fichier du dépôt public Ipnoria : depuis un clone local si NUXT_DOCS_LOCAL_DIR est défini (tests, hors ligne),
 * sinon depuis raw.githubusercontent.com. Mis en cache une heure ; une version périmée sert si GitHub ne répond pas.
 */
export const fetchRepoFile = defineCachedFunction(async (path: string, binary = false): Promise<string> => {
  if (!ALLOWED.test(path)) throw createError({ statusCode: 404 })
  const { docsLocalDir } = useRuntimeConfig()
  if (docsLocalDir) {
    const full = normalize(join(docsLocalDir, path))
    if (!full.startsWith(normalize(docsLocalDir))) throw createError({ statusCode: 404 })
    const buf = await readFile(full)
    return binary ? buf.toString('base64') : buf.toString('utf8')
  }
  const res = await fetch(RAW + path, { signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'ipnoria-website' } })
  if (!res.ok) throw createError({ statusCode: res.status === 404 ? 404 : 502 })
  return binary ? Buffer.from(await res.arrayBuffer()).toString('base64') : await res.text()
}, { name: 'repo-file', maxAge: 3600, staleMaxAge: 7 * 86400, getKey: (path: string, binary = false) => `${binary ? 'b' : 't'}:${path}` })

interface GithubRelease { tag_name?: string, html_url?: string, published_at?: string, draft?: boolean, prerelease?: boolean }

/** Releases publiées (API publique GitHub, 60 requêtes/h sans jeton : d'où le cache d'une heure). Liste vide en cas d'échec. */
export const fetchReleases = defineCachedFunction(async () => {
  try {
    const list = await $fetch<GithubRelease[]>(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=50`, {
      headers: { 'accept': 'application/vnd.github+json', 'user-agent': 'ipnoria-website' },
      timeout: 5000,
    })
    return list
      .filter(r => !r.draft && !r.prerelease && r.tag_name)
      .map(r => ({ version: r.tag_name!.replace(/^v/, ''), url: r.html_url ?? '', publishedAt: r.published_at ?? null }))
  }
  catch {
    return []
  }
}, { name: 'releases', maxAge: 3600, staleMaxAge: 86400, getKey: () => 'all' })

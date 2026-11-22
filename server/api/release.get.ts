import { GITHUB_REPO, githubLinks } from '#shared/links'

interface GithubRelease { tag_name?: string, html_url?: string, published_at?: string }

// Dernière release du produit, lue sur l'API publique de GitHub et mise en cache une heure (60 requêtes/h sans jeton)
export default defineCachedEventHandler(async () => {
  try {
    const rel = await $fetch<GithubRelease>(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'accept': 'application/vnd.github+json', 'user-agent': 'ddibuntu-site' },
      timeout: 4000,
    })
    const version = rel.tag_name?.replace(/^v/, '') ?? null
    return {
      version: version && /^\d+\.\d+\.\d+$/.test(version) ? version : null,
      url: rel.html_url?.startsWith(githubLinks.releases) ? rel.html_url : githubLinks.latestRelease,
      publishedAt: rel.published_at ?? null,
    }
  }
  catch {
    return { version: null, url: githubLinks.latestRelease, publishedAt: null }
  }
}, { maxAge: 3600, staleMaxAge: 86400, name: 'release', getKey: () => 'latest' })

// Liens vers le dépôt public du produit. Le site lui-même vit dans un dépôt privé distinct.
export const GITHUB_REPO = 'vincenttisseront/ddibuntu'
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`

export const githubLinks = {
  repo: GITHUB_URL,
  releases: `${GITHUB_URL}/releases`,
  latestRelease: `${GITHUB_URL}/releases/latest`,
  issues: `${GITHUB_URL}/issues`,
  newIssue: `${GITHUB_URL}/issues/new`,
  clone: `${GITHUB_URL}.git`,
} as const

const blob = (path: string) => `${GITHUB_URL}/blob/main/${path}`

// Clé de traduction → fichier du dépôt (voir docs.groups dans i18n/locales/*.json)
export const docLinks: Record<string, string> = {
  readme: blob('README.md'),
  readmeEn: blob('README.en.md'),
  install: blob('docs/INSTALL.md'),
  changelog: blob('CHANGELOG.md'),
  architecture: blob('docs/ARCHITECTURE.md'),
  cluster: blob('docs/ARCHITECTURE-CLUSTER.md'),
  roadmap: blob('docs/ROADMAP.md'),
  testing: blob('docs/TESTING.md'),
  releasing: blob('docs/RELEASING.md'),
  quality: blob('docs/QUALITE.md'),
  opensource: blob('OPEN-SOURCE.md'),
  licenseDoc: blob('LICENSE'),
}

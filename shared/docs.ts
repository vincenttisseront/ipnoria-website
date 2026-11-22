// Documents du dépôt public rendus dans le site. Le slug est stable (URL) ; `path` est le fichier dans le dépôt.
// `pathEn` : version anglaise quand elle existe ; sinon la page anglaise affiche le texte français avec un avertissement.
export interface DocEntry {
  slug: string
  path: string
  pathEn?: string
  group: 'start' | 'understand' | 'contribute'
  title: { fr: string, en: string }
  summary: { fr: string, en: string }
  /** Texte brut (pas du Markdown) : affiché en bloc préformaté */
  plain?: boolean
}

export const DOCS: DocEntry[] = [
  {
    slug: 'presentation', path: 'README.md', pathEn: 'README.en.md', group: 'start',
    title: { fr: 'Présentation', en: 'Overview' },
    summary: { fr: 'Ce que fait Ipnoria, la console en images, démarrage rapide.', en: 'What Ipnoria does, the console in pictures, quick start.' },
  },
  {
    slug: 'installation', path: 'docs/INSTALL.md', group: 'start',
    title: { fr: 'Générer l\'ISO et l\'installer', en: 'Build the ISO and install' },
    summary: { fr: 'Construction de l\'ISO, proxys d\'entreprise, essai sous VMware.', en: 'Building the ISO, corporate proxies, trying it on VMware.' },
  },
  {
    slug: 'architecture', path: 'docs/ARCHITECTURE.md', group: 'understand',
    title: { fr: 'Architecture', en: 'Architecture' },
    summary: { fr: 'Chaîne de livraison, séparation des privilèges, services de l\'appliance.', en: 'Delivery chain, privilege separation, appliance services.' },
  },
  {
    slug: 'cluster', path: 'docs/ARCHITECTURE-CLUSTER.md', group: 'understand',
    title: { fr: 'Architecture du cluster', en: 'Cluster architecture' },
    summary: { fr: 'Rôles des nœuds, quorum, tolérance de panne, mise à jour, limites.', en: 'Node roles, quorum, fault tolerance, upgrades, limits.' },
  },
  {
    slug: 'feuille-de-route', path: 'docs/ROADMAP.md', group: 'understand',
    title: { fr: 'Feuille de route', en: 'Roadmap' },
    summary: { fr: 'Ce qui est fait, partiel ou à faire, capacité par capacité.', en: 'What is done, partial or still to do, capability by capability.' },
  },
  {
    slug: 'tests', path: 'docs/TESTING.md', group: 'contribute',
    title: { fr: 'Tests', en: 'Tests' },
    summary: { fr: 'Batteries shell, tests unitaires et de bout en bout de la console.', en: 'Shell test suites, unit and end-to-end tests of the console.' },
  },
  {
    slug: 'publication', path: 'docs/RELEASING.md', group: 'contribute',
    title: { fr: 'Publier une version', en: 'Publishing a release' },
    summary: { fr: 'Publication automatique, signature des archives, mises à jour en ligne.', en: 'Automatic publishing, archive signing, online updates.' },
  },
  {
    slug: 'qualite', path: 'docs/QUALITE.md', group: 'contribute',
    title: { fr: 'Qualité du code', en: 'Code quality' },
    summary: { fr: 'Analyse SonarQube et plan de remédiation.', en: 'SonarQube analysis and remediation plan.' },
  },
  {
    slug: 'composants-libres', path: 'OPEN-SOURCE.md', group: 'contribute',
    title: { fr: 'Composants libres', en: 'Open-source components' },
    summary: { fr: 'Liste des composants embarqués et de leurs licences.', en: 'Embedded components and their licenses.' },
  },
  {
    slug: 'licence', path: 'LICENSE', group: 'contribute', plain: true,
    title: { fr: 'Licence', en: 'License' },
    summary: { fr: 'Texte complet de la GNU AGPL v3.', en: 'Full text of the GNU AGPL v3.' },
  },
]

export const DOC_GROUPS = ['start', 'understand', 'contribute'] as const

export const docBySlug = (slug: string) => DOCS.find(d => d.slug === slug)
export const docByPath = (path: string) => DOCS.find(d => d.path === path || d.pathEn === path)

/** Normalise pour la recherche : minuscules, sans accents. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

import { COMPARISON } from '#shared/comparison'
import { DOCS, fold } from '#shared/docs'
import { GUIDES } from '#shared/guides'
import { PROFILES } from '#shared/profiles'
import { ROADMAP } from '#shared/roadmap'
import { TOUR } from '#shared/tour'

export type SearchKind = 'page' | 'doc' | 'guide' | 'tool' | 'release' | 'compare' | 'roadmap' | 'profile' | 'tour'
export interface SearchEntry { kind: SearchKind, title: string, context: string, url: string, text: string, folded: string, foldedTitle: string }

type Locale = 'fr' | 'en'
const L = (locale: Locale, fr: string, en: string) => (locale === 'en' ? `/en${en}` : fr)
const slugify = (s: string) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const entry = (kind: SearchKind, title: string, context: string, url: string, text: string): SearchEntry =>
  ({ kind, title, context, url, text, folded: fold(`${title} ${text}`), foldedTitle: fold(title) })

/** Pages et outils du site (titres et mots-clés), dans les deux langues. */
function staticPages(locale: Locale): SearchEntry[] {
  const fr = locale === 'fr'
  const p = (title: [string, string], url: [string, string], text: [string, string], kind: SearchKind = 'page') =>
    entry(kind, fr ? title[0] : title[1], fr ? 'Page' : 'Page', L(locale, url[0], url[1]), fr ? text[0] : text[1])
  return [
    p(['Outils', 'Tools'], ['/outils', '/tools'], ['checklist dimensionnement import DHCP sous-réseaux calculatrice', 'checklist sizing DHCP import subnets calculator']),
    p(['Checklist avant installation', 'Pre-install checklist'], ['/outils/checklist', '/tools/checklist'], ['prérequis réseau ports pare-feu DNS compte de service Active Directory hyperviseur', 'prerequisites network ports firewall DNS service account Active Directory hypervisor'], 'tool'),
    p(['Dimensionnement', 'Sizing calculator'], ['/outils/dimensionnement', '/tools/sizing'], ['CPU mémoire RAM disque cluster arbitre nombre de postes', 'CPU memory RAM disk cluster witness number of devices'], 'tool'),
    p(['Aperçu de l\'import DHCP Windows', 'Windows DHCP import preview'], ['/outils/import-dhcp', '/tools/dhcp-import-preview'], ['Export-DhcpServer XML étendues réservations exclusions options', 'Export-DhcpServer XML scopes reservations exclusions options'], 'tool'),
    p(['Calculatrice de sous-réseaux', 'Subnet calculator'], ['/outils/sous-reseaux', '/tools/subnets'], ['CIDR masque VLSM VLAN découpage plan d\'adressage CSV', 'CIDR mask VLSM VLAN split addressing plan CSV'], 'tool'),
    p(['Feuille de route', 'Roadmap'], ['/feuille-de-route', '/roadmap'], ['votes fonctionnalités à venir', 'votes upcoming features']),
    p(['Démonstration sur rendez-vous', 'Book a demo'], ['/rendez-vous', '/book-a-demo'], ['rendez-vous créneau visio démonstration', 'appointment slot video call demo']),
    p(['Visite guidée de la console', 'Guided console tour'], ['/visite', '/tour'], ['captures annotées IPAM DNS DHCP RADIUS', 'annotated screenshots IPAM DNS DHCP RADIUS']),
    p(['Nouveautés', 'Releases'], ['/nouveautes', '/releases'], ['versions journal des modifications RSS alertes', 'versions changelog RSS alerts']),
    p(['Contact', 'Contact'], ['/contact', '/contact'], ['écrire question démonstration partenariat', 'write question demo partnership']),
    p(['Confidentialité', 'Privacy'], ['/confidentialite', '/privacy'], ['données personnelles cookies RGPD', 'personal data cookies GDPR']),
  ]
}

function contentEntries(locale: Locale): SearchEntry[] {
  const out: SearchEntry[] = []
  const fr = locale === 'fr'
  for (const g of GUIDES[locale]) {
    const url = L(locale, `/guides/${g.slug}`, `/guides/${g.slug}`)
    out.push(entry('guide', g.title, fr ? 'Guide' : 'Guide', url, `${g.summary} ${g.intro} ${g.outro}`))
    for (const s of g.steps) out.push(entry('guide', s.title, g.title, url, `${s.text} ${s.code ?? ''}`))
  }
  for (const r of COMPARISON[locale]) {
    out.push(entry('compare', r.feature, fr ? 'Comparatif Windows Server' : 'Windows Server comparison', L(locale, '/comparatif', '/comparison'), r.note ?? ''))
  }
  for (const p of PROFILES[locale]) {
    out.push(entry('profile', p.title, fr ? 'Pour qui' : 'Who it\'s for', L(locale, `/pour/${p.slug.fr}`, `/for/${p.slug.en}`),
      `${p.lead} ${p.needs.map(n => `${n.title} ${n.text}`).join(' ')} ${p.answers.map(a => `${a.title} ${a.text}`).join(' ')}`))
  }
  for (const t of TOUR[locale]) {
    out.push(entry('tour', t.title, fr ? 'Visite guidée' : 'Guided tour', `${L(locale, '/visite', '/tour')}?parcours=${t.id}`,
      `${t.summary} ${t.steps.map(s => `${s.title} ${s.text}`).join(' ')}`))
  }
  for (const i of ROADMAP) {
    out.push(entry('roadmap', i.title[locale], fr ? 'Feuille de route' : 'Roadmap', `${L(locale, '/feuille-de-route', '/roadmap')}#${i.id}`, i.text[locale]))
  }
  return out
}

async function docEntries(locale: Locale): Promise<SearchEntry[]> {
  const out: SearchEntry[] = []
  await Promise.all(DOCS.filter(d => !d.plain).map(async (doc) => {
    const path = locale === 'en' && doc.pathEn ? doc.pathEn : doc.path
    try {
      const src = await fetchRepoFile(path)
      const base = L(locale, `/documentation/${doc.slug}`, `/docs/${doc.slug}`)
      for (const s of markdownSections(src)) {
        const anchor = slugify(s.heading)
        out.push(entry('doc', s.heading || doc.title[locale], doc.title[locale], anchor ? `${base}#${anchor}` : base, s.text))
      }
    }
    catch { /* document indisponible : absent de l'index */ }
  }))
  return out
}

async function releaseEntries(locale: Locale): Promise<SearchEntry[]> {
  try {
    return (await loadChangelog()).map(r => entry('release', `Ipnoria ${r.version}${r.title ? ` : ${r.title}` : ''}`,
      locale === 'en' ? 'Releases' : 'Nouveautés', L(locale, `/nouveautes/${r.version}`, `/releases/${r.version}`), r.body.replace(/[`*_#>|-]+/g, ' ')))
  }
  catch { return [] }
}

/** Index complet du site, reconstruit au plus une fois par heure. */
export const searchIndex = defineCachedFunction(async (locale: Locale): Promise<SearchEntry[]> => {
  const [docs, releases] = await Promise.all([docEntries(locale), releaseEntries(locale)])
  return [...staticPages(locale), ...contentEntries(locale), ...docs, ...releases]
}, { name: 'site-search', maxAge: 3600, staleMaxAge: 86400, getKey: (l: string) => l })

const KIND_BOOST: Record<SearchKind, number> = { tool: 4, page: 4, guide: 3, profile: 3, compare: 2, tour: 2, roadmap: 2, doc: 1, release: 0 }

export function searchEntries(index: SearchEntry[], query: string, limit = 12) {
  const terms = fold(query).split(/\s+/).filter(t => t.length >= 2).slice(0, 6)
  if (!terms.length) return []
  return index
    .map((e) => {
      let score = 0
      for (const t of terms) {
        const inTitle = e.foldedTitle.includes(t)
        const count = e.folded.split(t).length - 1
        if (!inTitle && !count) return null
        score += (inTitle ? 12 : 0) + Math.min(count, 5)
      }
      return { e, score: score + KIND_BOOST[e.kind] }
    })
    .filter((r): r is { e: SearchEntry, score: number } => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ e }) => {
      const at = e.text ? fold(e.text).indexOf(terms[0]!) : -1
      const start = Math.max(0, at - 60)
      const snippet = e.text ? `${start > 0 ? '…' : ''}${e.text.slice(start, start + 170).trim()}${start + 170 < e.text.length ? '…' : ''}` : ''
      return { kind: e.kind, title: e.title, context: e.context, url: e.url, snippet }
    })
}

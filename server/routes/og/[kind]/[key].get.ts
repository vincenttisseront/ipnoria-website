import { ARTICLES } from '#shared/articles'
import { DOCS } from '#shared/docs'
import { GLOSSARY } from '#shared/glossary'
import { GUIDES } from '#shared/guides'

// Image d'aperçu d'un contenu : /og/<type>/<clé>.png?lang=fr|en. Mise en cache une heure (les votes d'une idée bougent).
type L = 'fr' | 'en'
const pick = (o: Record<string, string> | undefined, l: L) => o?.[l] || o?.[l === 'fr' ? 'en' : 'fr'] || ''

const PAGES: Record<string, Record<L, [string, string]>> = {
  beta: { fr: ['Programme bêta-testeurs', 'Testez Ipnoria avant sa sortie et orientez la première version stable.'], en: ['Beta tester programme', 'Test Ipnoria before its release and shape the first stable version.'] },
  roadmap: { fr: ['Feuille de route', 'Proposez, votez, suivez : les idées qui orientent les prochaines versions.'], en: ['Roadmap', 'Propose, vote, follow: the ideas shaping the next releases.'] },
  references: { fr: ['Ils utilisent Ipnoria', 'Collectivités, établissements, entreprises : leurs déploiements.'], en: ['They use Ipnoria', 'Local government, schools, companies: their deployments.'] },
  tools: { fr: ['Outils', 'Checklist, dimensionnement, aperçu de l\'import DHCP, sous-réseaux.'], en: ['Tools', 'Checklist, sizing, DHCP import preview, subnets.'] },
  glossary: { fr: ['Glossaire DDI', 'DNS, DHCP, IPAM, RADIUS, 802.1X, PKI : les mots du métier, expliqués.'], en: ['DDI glossary', 'DNS, DHCP, IPAM, RADIUS, 802.1X, PKI: the vocabulary, explained.'] },
  articles: { fr: ['Articles', 'Choisir, migrer, sécuriser : retours d\'expérience sur le DDI.'], en: ['Articles', 'Choose, migrate, secure: practical notes on DDI.'] },
  security: { fr: ['Signaler une vulnérabilité', 'Périmètre, engagements et remerciements.'], en: ['Report a vulnerability', 'Scope, commitments and acknowledgments.'] },
}

const card = defineCachedFunction(async (kind: string, key: string, l: L): Promise<OgCard | null> => {
  const K = { fr: { guide: 'Guide', doc: 'Documentation', release: 'Nouvelle version', idea: 'Feuille de route', ref: 'Référence client', term: 'Glossaire', article: 'Article' }, en: { guide: 'Guide', doc: 'Documentation', release: 'New release', idea: 'Roadmap', ref: 'Customer story', term: 'Glossary', article: 'Article' } }[l]
  if (kind === 'page') { const p = PAGES[key]?.[l]; return p ? { kicker: 'Ipnoria', title: p[0], subtitle: p[1] } : null }
  if (kind === 'guide') { const g = GUIDES[l].find(x => x.slug === key); return g ? { kicker: K.guide, title: g.title, subtitle: g.summary } : null }
  if (kind === 'doc') { const d = DOCS.find(x => x.slug === key); return d ? { kicker: K.doc, title: d.title[l], subtitle: d.summary?.[l] } : null }
  if (kind === 'term') { const x = GLOSSARY[l].find(t => t.id === key); return x ? { kicker: K.term, title: x.term, subtitle: x.short } : null }
  if (kind === 'article') { const a = ARTICLES.find(x => x.id === key); return a ? { kicker: K.article, title: a.title[l], subtitle: a.description[l], footer: l === 'en' ? `${a.minutes} min read` : `${a.minutes} min de lecture` } : null }
  if (kind === 'release') {
    const r = (await loadChangelog().catch(() => [])).find(x => x.version === key)
    return r ? { kicker: K.release, title: `Ipnoria ${r.version}`, subtitle: r.title } : null
  }
  if (!hasDb()) return null
  if (kind === 'idea' && /^\d{1,12}$/.test(key)) {
    const r = (await useDb().query(`SELECT title, body, status, (SELECT count(*)::int FROM idea_votes v WHERE v.idea_id = i.id) AS votes FROM ideas i WHERE id = $1 AND NOT hidden`, [key])).rows[0]
    if (!r) return null
    const STATUS = { fr: { proposed: 'Proposée', review: 'À l\'étude', planned: 'Prévue', progress: 'En cours', shipped: 'Livrée', declined: 'Non retenue', duplicate: 'Doublon' }, en: { proposed: 'Proposed', review: 'Under review', planned: 'Planned', progress: 'In progress', shipped: 'Shipped', declined: 'Declined', duplicate: 'Duplicate' } }[l] as Record<string, string>
    const body = pick(r.body, l)
    return { kicker: K.idea, badge: STATUS[r.status], title: pick(r.title, l), subtitle: body.length > 150 ? `${body.slice(0, 150)}…` : body, footer: l === 'en' ? `${r.votes} vote(s)` : `${r.votes} voix` }
  }
  if (kind === 'ref' && /^[a-z0-9-]{1,60}$/.test(key)) {
    const r = (await useDb().query(`SELECT name, quote, size, logo, logo_type, logo_dark_bg FROM customer_references WHERE slug = $1 AND published`, [key])).rows[0]
    if (!r) return null
    const q = pick(r.quote, l)
    return {
      kicker: K.ref, title: r.name, subtitle: q ? (l === 'fr' ? `« ${q} »` : `“${q}”`) : pick(r.size, l),
      image: r.logo ? { href: `data:${r.logo_type};base64,${Buffer.from(r.logo).toString('base64')}`, dark: r.logo_dark_bg } : undefined,
    }
  }
  return null
}, { name: 'og-card', maxAge: 3600, getKey: (kind: string, key: string, l: string) => `${kind}:${key}:${l}` })

const png = defineCachedFunction(async (kind: string, key: string, l: L): Promise<string | null> => {
  const c = await card(kind, key, l)
  return c ? (await renderOg(c)).toString('base64') : null
}, { name: 'og-png', maxAge: 3600, getKey: (kind: string, key: string, l: string) => `${kind}:${key}:${l}` })

export default defineEventHandler(async (event) => {
  const kind = getRouterParam(event, 'kind') ?? ''
  const key = decodeURIComponent((getRouterParam(event, 'key') ?? '').replace(/\.png$/, ''))
  const l: L = getQuery(event).lang === 'en' ? 'en' : 'fr'
  if (!/^[a-z]{2,10}$/.test(kind) || key.length > 80) throw createError({ statusCode: 404 })
  const b64 = await png(kind, key, l)
  if (!b64) throw createError({ statusCode: 404 })
  setResponseHeaders(event, { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600', 'cross-origin-resource-policy': 'cross-origin' })
  return Buffer.from(b64, 'base64')
})

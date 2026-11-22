import { Resvg } from '@resvg/resvg-js'
import { PDFDocument } from 'pdf-lib'
import { ARTICLES } from '#shared/articles'
import { slideSvg, releaseHighlights } from './carousel-core'
import type { Slide } from './carousel-core'

// Kit de publication : textes prêts à copier par réseau et par langue, liens de campagne, carrousels PDF.
type L = 'fr' | 'en'
export type Network = 'linkedin' | 'mastodon' | 'bluesky'
export const NETWORK_LIMITS: Record<Network, number> = { linkedin: 3000, mastodon: 500, bluesky: 300 }
const site = () => useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
const tags = { fr: '#DNS #DHCP #IPAM #RéseauInformatique #LogicielLibre', en: '#DNS #DHCP #IPAM #Networking #OpenSource' }

export function campaignUrl(path: string, network: string, campaign: string, medium = 'social'): string {
  const u = new URL(path, `${site()}/`)
  u.searchParams.set('utm_source', network); u.searchParams.set('utm_medium', medium); u.searchParams.set('utm_campaign', campaign)
  return u.toString()
}

export interface PostSource { kind: string, key: string, label: string, date: string | null, carousel: boolean, posts: Record<Network, Record<L, string>> }

function compose(net: Network, l: L, long: string, short: string, url: string): string {
  const text = net === 'linkedin' ? `${long}\n\n${url}\n\n${tags[l]}` : `${short} ${url}`
  return text
}

export async function socialSources(): Promise<PostSource[]> {
  const out: PostSource[] = []
  const nets: Network[] = ['linkedin', 'mastodon', 'bluesky']
  const build = (kind: string, key: string, label: string, date: string | null, carousel: boolean, path: Record<L, string>, long: Record<L, string>, short: Record<L, string>) => {
    const posts = {} as PostSource['posts']
    for (const n of nets) posts[n] = { fr: compose(n, 'fr', long.fr, short.fr, campaignUrl(path.fr, n, `${kind}-${key}`)), en: compose(n, 'en', long.en, short.en, campaignUrl(path.en, n, `${kind}-${key}`)) }
    out.push({ kind, key, label, date, carousel, posts })
  }

  // Programme bêta (recrutement)
  build('beta', 'recrutement', 'Recrutement de bêta-testeurs', null, true, { fr: '/beta', en: '/en/beta' },
    { fr: 'Nous recrutons des bêta-testeurs pour Ipnoria, l\'appliance libre qui réunit DNS, DHCP, IPAM, RADIUS et PKI.\n\nVous gérez le réseau d\'une PME, d\'une collectivité ou d\'un établissement ? Testez les versions préliminaires sur votre propre environnement, signalez ce qui coince, et orientez la première version stable. Gratuit, sans engagement, avec un contact direct avec l\'équipe.', en: 'We\'re recruiting beta testers for Ipnoria, the free software appliance bringing together DNS, DHCP, IPAM, RADIUS and PKI.\n\nDo you run the network of an SMB, a local authority or a school? Test pre-release versions on your own environment, report what gets in the way, and shape the first stable version. Free, no commitment, with a direct line to the team.' },
    { fr: 'Ipnoria (DNS, DHCP, IPAM, RADIUS, PKI) recrute des bêta-testeurs : PME, collectivités, établissements.', en: 'Ipnoria (DNS, DHCP, IPAM, RADIUS, PKI) is recruiting beta testers: SMBs, local government, schools.' })

  // Versions
  for (const r of (await loadChangelog().catch(() => [])).slice(0, 8)) {
    const hi = releaseHighlights(r.body, 4)
    build('release', r.version, `Version ${r.version}${r.title ? ` : ${r.title}` : ''}`, r.publishedAt ?? null, true, { fr: `/nouveautes/${r.version}`, en: `/en/releases/${r.version}` },
      { fr: `Ipnoria ${r.version} est disponible${r.title ? ` : ${r.title}` : ''}.${hi.length ? `\n\nAu menu :\n${hi.map(h => `• ${h}`).join('\n')}` : ''}`, en: `Ipnoria ${r.version} is out${r.title ? `: ${r.title}` : ''}.\n\nFull release notes (in French) at the link below.` },
      { fr: `Ipnoria ${r.version} est disponible${r.title ? ` : ${r.title}` : ''}.`, en: `Ipnoria ${r.version} is out.` })
  }

  // Articles
  for (const a of ARTICLES) {
    build('article', a.id, `Article : ${a.title.fr}`, a.date, true, { fr: `/articles/${a.slug.fr}`, en: `/en/articles/${a.slug.en}` },
      { fr: `${a.title.fr}\n\n${a.description.fr}`, en: `${a.title.en}\n\n${a.description.en}` },
      { fr: a.title.fr, en: a.title.en })
  }

  if (!hasDb()) return out
  const db = useDb()
  // Idées livrées
  const shipped = await db.query(
    `SELECT i.id::text, i.title, (SELECT count(*)::int FROM idea_votes v WHERE v.idea_id = i.id) AS votes, i.updated_at
       FROM ideas i WHERE i.status = 'shipped' AND NOT i.hidden ORDER BY i.updated_at DESC LIMIT 10`,
  )
  for (const i of shipped.rows) {
    const t = { fr: i.title.fr || i.title.en, en: i.title.en || i.title.fr }
    build('idea', i.id, `Idée livrée : ${t.fr}`, i.updated_at, false, { fr: `/feuille-de-route/${i.id}`, en: `/en/roadmap/${i.id}` },
      { fr: `Demandée par la communauté, livrée : ${t.fr}.\n\nMerci aux ${i.votes} personnes qui l'ont soutenue sur la feuille de route publique. La prochaine idée, c'est peut-être la vôtre.`, en: `Requested by the community, now shipped: ${t.en}.\n\nThanks to the ${i.votes} people who backed it on the public roadmap. The next idea could be yours.` },
      { fr: `Demandée par la communauté, livrée : ${t.fr}.`, en: `Requested by the community, now shipped: ${t.en}.` })
  }
  // Références publiées
  const refs = await db.query(`SELECT slug, name, quote, quote_author, size, updated_at FROM customer_references WHERE published ORDER BY updated_at DESC LIMIT 10`)
  for (const r of refs.rows) {
    const q = { fr: r.quote.fr || r.quote.en || '', en: r.quote.en || r.quote.fr || '' }
    build('ref', r.slug, `Référence : ${r.name}`, r.updated_at, false, { fr: `/references/${r.slug}`, en: `/en/customers/${r.slug}` },
      { fr: `${r.name}${r.size?.fr ? ` (${r.size.fr})` : ''} utilise Ipnoria.${q.fr ? `\n\n« ${q.fr} »${r.quote_author ? ` (${r.quote_author})` : ''}` : ''}\n\nMerci pour leur confiance et pour ce retour.`, en: `${r.name}${r.size?.en ? ` (${r.size.en})` : ''} uses Ipnoria.${q.en ? `\n\n“${q.en}”${r.quote_author ? ` (${r.quote_author})` : ''}` : ''}\n\nThank you for your trust and feedback.` },
      { fr: `${r.name} utilise Ipnoria.`, en: `${r.name} uses Ipnoria.` })
  }
  return out
}

/** Carrousel PDF : couverture, diapositives de contenu, appel à l'action. */
export async function carouselPdf(kind: string, key: string, l: L): Promise<Buffer | null> {
  const host = new URL(site()).host
  let slides: Slide[] = []
  if (kind === 'release') {
    const r = (await loadChangelog().catch(() => [])).find(x => x.version === key)
    if (!r) return null
    const hi = releaseHighlights(r.body, 12)
    slides.push({ kind: 'cover', kicker: l === 'en' ? 'New release' : 'Nouvelle version', title: `Ipnoria ${r.version}`, subtitle: r.title })
    for (let i = 0; i < hi.length; i += 3) slides.push({ kind: 'list', heading: l === 'en' ? 'What\'s new' : 'Les nouveautés', items: hi.slice(i, i + 3), index: 0, total: 0 })
    slides.push({ kind: 'end', title: l === 'en' ? 'Try it, or join the beta' : 'Essayez-la, ou rejoignez la bêta', text: l === 'en' ? 'Free software appliance: DNS, DHCP, IPAM, RADIUS and PKI.' : 'Appliance libre : DNS, DHCP, IPAM, RADIUS et PKI.', url: `${host}${l === 'en' ? '/en' : ''}/beta` })
  }
  else if (kind === 'article') {
    const a = ARTICLES.find(x => x.id === key)
    if (!a) return null
    slides.push({ kind: 'cover', kicker: l === 'en' ? 'Article' : 'Article', title: a.title[l], subtitle: a.description[l] })
    for (const s of a.sections[l]) slides.push({ kind: 'list', heading: s.h, items: s.p.map(p => p.split(/(?<=[.!?])\s/)[0]!), index: 0, total: 0 })
    slides.push({ kind: 'end', title: l === 'en' ? 'Read the full article' : 'Lire l\'article complet', text: a.description[l], url: `${host}${l === 'en' ? `/en/articles/${a.slug.en}` : `/articles/${a.slug.fr}`}` })
  }
  else if (kind === 'beta') {
    slides = [
      { kind: 'cover', kicker: l === 'en' ? 'Beta programme' : 'Programme bêta', title: l === 'en' ? 'Become an official Ipnoria beta tester' : 'Devenez bêta-testeur officiel d\'Ipnoria', subtitle: l === 'en' ? 'DNS, DHCP, IPAM, RADIUS and PKI in one free software appliance.' : 'DNS, DHCP, IPAM, RADIUS et PKI dans une appliance libre.' },
      { kind: 'list', heading: l === 'en' ? 'What you get' : 'Ce que vous y gagnez', items: l === 'en' ? ['Pre-release versions before everyone else', 'A direct line to the team', 'Your priorities weigh on the roadmap'] : ['Les versions préliminaires avant tout le monde', 'Un lien direct avec l\'équipe', 'Vos priorités pèsent sur la feuille de route'], index: 0, total: 0 },
      { kind: 'list', heading: l === 'en' ? 'What we expect' : 'Ce que nous attendons', items: l === 'en' ? ['An isolated test environment', 'A few hours a month', 'Precise reports'] : ['Un environnement de test isolé', 'Quelques heures par mois', 'Des signalements précis'], index: 0, total: 0 },
      { kind: 'end', title: l === 'en' ? 'Apply in two minutes' : 'Postulez en deux minutes', text: l === 'en' ? 'SMBs, local government, schools: we\'re building a varied panel.' : 'PME, collectivités, établissements : nous composons un panel varié.', url: `${host}${l === 'en' ? '/en' : ''}/beta` },
    ]
  }
  else return null
  const lists = slides.filter(s => s.kind === 'list') as Array<Extract<Slide, { kind: 'list' }>>
  lists.forEach((s, i) => { s.index = i + 1; s.total = lists.length })

  const fonts = await ogFontFiles()
  const pdf = await PDFDocument.create()
  pdf.setTitle(slides[0]?.kind === 'cover' ? slides[0].title : 'Ipnoria'); pdf.setCreator('Ipnoria')
  for (const [i, s] of slides.entries()) {
    const png = new Resvg(slideSvg(s, host, `${i + 1} / ${slides.length}`), { font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Geist' } }).render().asPng()
    const img = await pdf.embedPng(png)
    const page = pdf.addPage([1080, 1350])
    page.drawImage(img, { x: 0, y: 0, width: 1080, height: 1350 })
  }
  return Buffer.from(await pdf.save())
}

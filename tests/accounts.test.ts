import { describe, expect, it } from 'vitest'
import { base32Decode, base32Encode, hotp, otpauthUri, verifyTotp } from '../server/utils/account-totp'
import { deriveKey, normalizeRecovery, recoveryCodes, seal, unseal } from '../server/utils/account-crypto'
import { breachCount, deviceLabel, hashPassword, passwordProblem, verifyPassword } from '../server/utils/account-password'
import { ideaSchema, registerSchema } from '#shared/account'

// Vecteurs de la RFC 6238 (annexe B), secret ASCII « 12345678901234567890 », 8 chiffres
const RFC = Buffer.from('12345678901234567890')
describe('TOTP (RFC 6238)', () => {
  it('reproduit les vecteurs de la RFC', () => {
    for (const [t, code] of [[59, '94287082'], [1111111109, '07081804'], [1234567890, '89005924'], [20000000000, '65353130']] as const) {
      expect(hotp(RFC, Math.floor(t / 30), 8)).toBe(code)
    }
  })
  it('accepte un pas d\'écart, refuse au-delà et refuse le rejeu', () => {
    const now = 1111111109 * 1000
    const code = hotp(RFC, Math.floor(now / 30000))
    expect(verifyTotp(RFC, code, { now })).toBe(Math.floor(now / 30000))
    expect(verifyTotp(RFC, code, { now: now + 30_000 })).not.toBeNull()
    expect(verifyTotp(RFC, code, { now: now + 90_000 })).toBeNull()
    expect(verifyTotp(RFC, code, { now, lastStep: Math.floor(now / 30000) })).toBeNull()
    expect(verifyTotp(RFC, '12345', { now })).toBeNull()
  })
  it('encode et décode le base32 des applications', () => {
    expect(base32Encode(RFC)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
    expect(base32Decode('gezd gnbv gy3t qojq gezd gnbv gy3t qojq')).toEqual(RFC)
    expect(otpauthUri(RFC, 'a@b.test')).toBe('otpauth://totp/Ipnoria%3Aa%40b.test?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Ipnoria&algorithm=SHA1&digits=6&period=30')
  })
})

describe('chiffrement et codes de secours', () => {
  it('chiffre de façon authentifiée', () => {
    const k = deriveKey('x'.repeat(32), 'totp')
    const sealed = seal(RFC, k)
    expect(unseal(sealed, k)).toEqual(RFC)
    expect(() => unseal(sealed, deriveKey('y'.repeat(32), 'totp'))).toThrow()
    const [iv, tag, data] = sealed.split('.')
    expect(() => unseal([iv, tag, `A${data!.slice(1)}`].join('.'), k)).toThrow()
  })
  it('produit dix codes distincts, saisis avec ou sans tiret', () => {
    const c = recoveryCodes()
    expect(c).toHaveLength(10)
    expect(new Set(c).size).toBe(10)
    for (const x of c) expect(x).toMatch(/^[a-z2-9]{5}-[a-z2-9]{5}$/)
    expect(normalizeRecovery(' ABCDE-fghjk ')).toBe('abcdefghjk')
  })
})

describe('mots de passe', () => {
  it('hache en Argon2id et vérifie', async () => {
    const h = await hashPassword('une longue phrase de passe')
    expect(h.startsWith('$argon2id$')).toBe(true)
    expect(await verifyPassword(h, 'une longue phrase de passe')).toBe(true)
    expect(await verifyPassword(h, 'autre chose entièrement')).toBe(false)
    expect(await verifyPassword(null, 'x')).toBe(false)
  })
  it('applique la politique', () => {
    expect(passwordProblem('court')).toBe('length')
    expect(passwordProblem('jean.dupont-2026!', 'jean.dupont@exemple.fr')).toBe('email')
    expect(passwordProblem('aaaaaaaaaaaaaaaa')).toBe('common')
    expect(passwordProblem('motdepasse2026!!')).toBe('common')
    expect(passwordProblem('cheval agrafe batterie correcte')).toBeNull()
  })
  it('interroge les fuites par préfixe seulement', async () => {
    let asked = ''
    const fake = (async (url: string) => { asked = url; return new Response('0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:42\r\n') }) as unknown as typeof fetch
    // SHA-1 de « password » : 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    expect(await breachCount('password', fake)).toBe(42)
    expect(asked).toBe('https://api.pwnedpasswords.com/range/5BAA6')
    const down = (async () => { throw new Error('offline') }) as unknown as typeof fetch
    expect(await breachCount('password', down)).toBe(0)
  })
  it('nomme l\'appareil', () => {
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0')).toBe('Firefox, Windows')
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe('Safari, iOS')
  })
})

describe('schémas des formulaires', () => {
  it('valide une inscription et une idée', () => {
    expect(registerSchema.safeParse({ email: ' Jean@Exemple.FR ', password: 'x'.repeat(12), displayName: 'Jean', locale: 'fr', consent: true, startedAt: 1 }).data?.email).toBe('jean@exemple.fr')
    expect(registerSchema.safeParse({ email: 'jean@exemple.fr', password: 'x'.repeat(12), displayName: 'J\nean', locale: 'fr', consent: true, startedAt: 1 }).success).toBe(false)
    expect(ideaSchema.safeParse({ title: 'Exporter les baux en CSV', body: 'x'.repeat(29), locale: 'fr' }).success).toBe(false)
    expect(ideaSchema.safeParse({ title: 'Exporter les baux en CSV', body: 'Besoin de sortir les baux pour l\'inventaire mensuel.', locale: 'fr' }).success).toBe(true)
  })
})

describe('références clients', async () => {
  const { sniffImage } = await import('../server/utils/references')
  const { referenceSchema } = await import('#shared/account')
  const { quoted } = await import('#shared/references')
  it('reconnaît les images par leur contenu et refuse le SVG', () => {
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0]))).toBe('image/png')
    expect(sniffImage(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp')
    expect(sniffImage(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]))).toBe('image/jpeg')
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'))).toBeNull()
  })
  it('exige l\'accord du client pour publier', () => {
    const base = { slug: 'commune-de-kerval', name: 'Commune de Kerval', sector: 'collectivite', size: {}, quote: {}, quoteRole: {}, story: {} }
    expect(referenceSchema.safeParse({ ...base, published: true }).success).toBe(false)
    expect(referenceSchema.safeParse({ ...base, published: true, authorizedBy: 'DSI', authorizedAt: '2026-11-20' }).success).toBe(true)
    expect(referenceSchema.safeParse({ ...base, website: 'javascript:alert(1)' }).success).toBe(false)
    expect(referenceSchema.safeParse({ ...base, slug: 'Pas Bon' }).success).toBe(false)
  })
  it('met les guillemets de la langue', () => {
    expect(quoted('Bien', 'fr')).toBe('« Bien »')
    expect(quoted('Good', 'en')).toBe('“Good”')
  })
})

describe('preuve de travail', async () => {
  const { createChallenge, checkSolution, solve } = await import('../server/utils/pow-core')
  it('accepte une solution juste, refuse une fausse, une expirée ou une autre clé', () => {
    const c = createChallenge('secret', 600, 2000)
    const n = solve(c)!
    const p = { algorithm: c.algorithm, challenge: c.challenge, salt: c.salt, signature: c.signature, number: n }
    expect(checkSolution('secret', p)).toBe(true)
    expect(checkSolution('secret', { ...p, number: n + 1 })).toBe(false)
    expect(checkSolution('autre', p)).toBe(false)
    expect(checkSolution('secret', p, Date.now() + 601_000)).toBe(false)
  })
})

describe('programme bêta', async () => {
  const { applicationSchema, reportSchema, BETA_AGREEMENT } = await import('#shared/beta')
  it('valide candidature et signalement', () => {
    const app = { sector: 'pme', orgSize: 'lt100', hypervisor: 'proxmox', activeDirectory: true, wifi8021x: false, services: ['dhcp'], hours: 'lt2', motivation: 'Remplacer notre DHCP Windows.' }
    expect(applicationSchema.safeParse(app).success).toBe(true)
    expect(applicationSchema.safeParse({ ...app, services: [] }).success).toBe(false)
    expect(applicationSchema.safeParse({ ...app, ref: '../x' }).success).toBe(false)
    expect(reportSchema.safeParse({ version: '0.24', module: 'dns', severity: 'minor', title: 'Titre trop', steps: 'Faire ceci et cela', expected: 'ok', actual: 'ko' }).success).toBe(true)
  })
  it('a un accord complet dans les deux langues', () => {
    expect(BETA_AGREEMENT.fr.length).toBe(BETA_AGREEMENT.en.length)
  })
})

describe('référencement', async () => {
  const { wrap, ogSvg } = await import('../server/utils/og-core')
  const { GLOSSARY } = await import('#shared/glossary')
  const { ARTICLES } = await import('#shared/articles')
  it('coupe les titres longs et échappe le texte', () => {
    const l = wrap('Remplacer un DHCP Windows Server par Linux : méthode et pièges à éviter absolument lors de la bascule', 64, 1040, 2)
    expect(l.length).toBe(2)
    expect(l[1]!.endsWith('…')).toBe(true)
    expect(ogSvg({ kicker: 'A & B', title: '<script>' }, 'x.test')).toContain('&lt;script&gt;')
  })
  it('a un glossaire et des articles complets et cohérents dans les deux langues', () => {
    expect(GLOSSARY.fr.map(t => t.id)).toEqual(GLOSSARY.en.map(t => t.id))
    const ids = new Set(GLOSSARY.fr.map(t => t.id))
    for (const t of GLOSSARY.fr) for (const r of t.related) expect(ids.has(r)).toBe(true)
    for (const a of ARTICLES) {
      expect(a.sections.fr.length).toBe(a.sections.en.length)
      for (const g of a.related.glossary) expect(ids.has(g)).toBe(true)
    }
  })
})

describe('réseaux sociaux', async () => {
  const { releaseHighlights, slideSvg } = await import('../server/utils/carousel-core')
  it('extrait les points forts d\'une note de version', () => {
    const md = '### Nouveautés\n- **Import NPS.** Reprise des clients RADIUS.\n- Simulation d\'une authentification depuis la console. Détails.\n- `x`\n'
    expect(releaseHighlights(md)).toEqual(['Import NPS', 'Simulation d\'une authentification depuis la console'])
  })
  it('dessine des diapositives sans HTML injecté', () => {
    expect(slideSvg({ kind: 'cover', kicker: 'K', title: '<b>T</b>' }, 'x.test', '1 / 3')).toContain('&lt;b&gt;T&lt;/b&gt;')
  })
})

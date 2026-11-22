import { describe, expect, it } from 'vitest'
import { parseChangelog } from '../server/utils/changelog'
import { markdownSections, renderMarkdown } from '../server/utils/markdown'
import { hashToken, isNewer, newToken } from '../server/utils/newsletter'
import { fold } from '#shared/docs'

describe('rendu Markdown de la documentation', () => {
  const render = (src: string, basePath = 'docs/INSTALL.md') => renderMarkdown(src, { basePath, locale: 'fr' }).html

  it('n\'interprète jamais le HTML brut du dépôt', () => {
    const html = render('Texte <script>alert(1)</script> <img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;')
  })

  it('refuse les liens javascript:', () => {
    expect(render('[clic](javascript:alert(1))')).not.toContain('href="javascript:')
  })

  it('réécrit les liens internes vers les pages du site, les autres vers GitHub', () => {
    const html = render('[cluster](ARCHITECTURE-CLUSTER.md#quorum) [script](../build-ipnoria.sh)')
    expect(html).toContain('href="/documentation/cluster#quorum"')
    expect(html).toContain('href="https://github.com/vincenttisseront/ipnoria/blob/main/build-ipnoria.sh"')
    expect(renderMarkdown('[x](docs/INSTALL.md)', { basePath: 'README.en.md', locale: 'en' }).html).toContain('href="/en/docs/installation"')
  })

  it('sert les images de docs/img par le site et ignore les autres', () => {
    expect(render('![IPAM](img/console-ipam.png)')).toContain('src="/docs-assets/console-ipam.png"')
    expect(render('![ext](https://exemple.com/x.png)')).not.toContain('<img')
  })

  it('ajoute des ancres et une table des matières, sans accents dans les identifiants', () => {
    const { html, toc } = renderMarkdown('## Itération 7 : clé\n\n### Détail', { basePath: 'x.md', locale: 'fr' })
    expect(toc).toEqual([{ id: 'iteration-7-cle', title: 'Itération 7 : clé', level: 2 }, { id: 'detail', title: 'Détail', level: 3 }])
    expect(html).toContain('id="iteration-7-cle"')
  })

  it('découpe un document par titre pour la recherche', () => {
    const s = markdownSections('# Titre\nintro\n## Partie\ntexte [lien](x.md) `code`')
    expect(s).toEqual([{ heading: 'Titre', text: 'intro' }, { heading: 'Partie', text: 'texte lien code' }])
  })

  it('normalise accents et casse', () => {
    expect(fold('Réplication Élevée')).toBe('replication elevee')
  })
})

describe('journal des modifications', () => {
  it('lit versions, titres et contenus', () => {
    const entries = parseChangelog('# Journal\n\n## 0.22.0 — « Passerelles »\n\n- point A\n\n## 0.21.3 - Correctif\n- point B\n')
    expect(entries).toEqual([
      { version: '0.22.0', title: 'Passerelles', body: '- point A' },
      { version: '0.21.3', title: 'Correctif', body: '- point B' },
    ])
  })
})

describe('alertes de version', () => {
  it('compare les versions numériquement', () => {
    expect(isNewer('0.22.0', '0.21.9')).toBe(true)
    expect(isNewer('0.10.0', '0.9.0')).toBe(true)
    expect(isNewer('0.22.0', '0.22.0')).toBe(false)
    expect(isNewer('0.21.3', '0.22.0')).toBe(false)
  })

  it('produit des jetons imprévisibles et ne garde que leur empreinte', () => {
    const a = newToken()
    expect(a).toMatch(/^[\w-]{43}$/)
    expect(newToken()).not.toBe(a)
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/)
  })
})

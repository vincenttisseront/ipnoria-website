import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { ogSvg } from './og-core'
import type { OgCard } from './og-core'

// Le moteur lit les polices depuis des fichiers : elles sont extraites une fois dans le dossier temporaire
// (seul emplacement inscriptible du conteneur, monté en tmpfs).
let fontFiles: Promise<string[]> | null = null
function loadFonts(): Promise<string[]> {
  fontFiles ??= (async () => {
    const s = useStorage('assets:fonts')
    const dir = join(tmpdir(), 'ipnoria-og-fonts')
    await mkdir(dir, { recursive: true })
    const keys = (await s.getKeys()).filter(k => k.endsWith('.ttf'))
    return Promise.all(keys.map(async (k) => {
      const path = join(dir, k.replace(/[^\w.-]/g, '_'))
      await writeFile(path, Buffer.from((await s.getItemRaw(k)) as ArrayBuffer))
      return path
    }))
  })().catch((err) => { fontFiles = null; throw err })
  return fontFiles
}

export async function renderOg(card: OgCard): Promise<Buffer> {
  const site = new URL(useRuntimeConfig().public.siteUrl).host
  const r = new Resvg(ogSvg(card, site), { font: { fontFiles: await loadFonts(), loadSystemFonts: false, defaultFontFamily: 'Geist' }, fitTo: { mode: 'width', value: 1200 } })
  return Buffer.from(r.render().asPng())
}
export type { OgCard }

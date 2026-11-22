import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'

// Téléchargement d'une version bêta : lien signé et non expiré, testeur toujours actif, fichier lu dans le dossier configuré.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const q = getQuery(event)
  if (!/^\d{1,12}$/.test(id) || !checkDownload(id, String(q.u ?? ''), String(q.exp ?? ''), String(q.sig ?? ''))) {
    throw createError({ statusCode: 403, statusMessage: 'Link expired or invalid' })
  }
  const db = useDb()
  const tester = await betaState(String(q.u))
  if (!tester.tester) throw createError({ statusCode: 403, statusMessage: 'Not a tester' })
  const rel = (await db.query('SELECT file_name FROM beta_releases WHERE id = $1 AND published', [id])).rows[0]
  const dir = String(useRuntimeConfig().beta.filesDir)
  if (!rel || !dir) throw createError({ statusCode: 404 })
  const path = join(dir, rel.file_name) // nom contrôlé par la base (lettres, chiffres, . _ -)
  const st = await stat(path).catch(() => null)
  if (!st?.isFile()) throw createError({ statusCode: 404 })
  await db.query('INSERT INTO beta_downloads (release_id, user_id) VALUES ($1, $2)', [id, q.u])
  setResponseHeaders(event, {
    'content-type': 'application/octet-stream',
    'content-length': st.size,
    'content-disposition': `attachment; filename="${rel.file_name}"`,
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
  })
  return sendStream(event, createReadStream(path))
})

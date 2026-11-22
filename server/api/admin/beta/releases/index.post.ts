import { adminReleaseSchema } from '#shared/beta'

// Créer ou mettre à jour une version (par numéro). Le fichier doit exister dans le dossier bêta : taille et SHA-256
// sont calculés par le serveur. À la première publication, les testeurs sont prévenus.
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const d = await readJson(event, adminReleaseSchema)
  const file = await hashBetaFile(d.fileName)
  if (!file) throw fail(400, 'file_missing')
  const db = useDb()
  const before = (await db.query('SELECT published FROM beta_releases WHERE version = $1', [d.version])).rows[0]
  const r = await db.query(
    `INSERT INTO beta_releases (version, title, notes, file_name, size_bytes, sha256, published) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (version) DO UPDATE SET title = $2, notes = $3, file_name = $4, size_bytes = $5, sha256 = $6, published = $7
     RETURNING id::text`,
    [d.version, d.title, d.notes, d.fileName, file.size, file.sha256, d.published],
  )
  let notified = 0
  if (d.published && !before?.published) {
    notified = await mailTesters(
      { fr: `Version ${d.version} disponible`, en: `Version ${d.version} available` },
      { fr: `La version bêta ${d.version} est disponible dans votre espace testeur.${d.title.fr ? `\n\n${d.title.fr}` : ''}`, en: `Beta version ${d.version} is available in your tester space.${d.title.en ? `\n\n${d.title.en}` : ''}` },
      { fr: '/espace', en: '/space' },
    )
  }
  await adminAudit(event, admin, before ? 'beta.release.update' : 'beta.release.create', 'beta_release', r.rows[0].id, { version: d.version, published: d.published })
  return { ok: true, id: r.rows[0].id, notified, ...file }
})

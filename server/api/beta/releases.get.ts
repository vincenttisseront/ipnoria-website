// Versions bêta publiées, avec un lien de téléchargement personnel valable 24 heures.
export default defineEventHandler(async (event) => {
  const s = await requireTester(event)
  const r = await useDb().query(
    `SELECT id::text, version, title, notes, file_name AS "fileName", size_bytes AS "size", sha256, created_at AS "createdAt"
       FROM beta_releases WHERE published ORDER BY created_at DESC`,
  )
  return r.rows.map(x => ({ ...x, size: x.size == null ? null : Number(x.size), url: signDownload(x.id, s.user.id) }))
})

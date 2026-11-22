export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const r = await useDb().query(
    `SELECT r.id::text, r.version, r.title, r.notes, r.file_name AS "fileName", r.size_bytes AS size, r.sha256, r.published, r.created_at AS "createdAt",
            (SELECT count(*)::int FROM beta_downloads d WHERE d.release_id = r.id) AS downloads,
            (SELECT count(DISTINCT user_id)::int FROM beta_downloads d WHERE d.release_id = r.id) AS testers
       FROM beta_releases r ORDER BY r.created_at DESC`,
  )
  return { releases: r.rows.map(x => ({ ...x, size: x.size == null ? null : Number(x.size) })), filesDir: Boolean(useRuntimeConfig().beta.filesDir) }
})

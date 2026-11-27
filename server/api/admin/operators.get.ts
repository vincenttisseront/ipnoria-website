// Personnes autorisées : dernier passage et second facteur. Aucun secret n'est renvoyé.
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const emails = adminEmailList()
  const { rows } = await useDb().query<{ email: string, account: boolean, mfa: boolean, last_login: Date | null }>(
    `SELECT e.email,
            (u.id IS NOT NULL) AS account,
            COALESCE(u.totp_secret_enc IS NOT NULL OR EXISTS (SELECT 1 FROM user_passkeys p WHERE p.user_id = u.id), false) AS mfa,
            (SELECT max(a.created_at) FROM admin_audit a WHERE lower(a.admin_email) = e.email AND a.action = 'login') AS last_login
       FROM unnest($1::text[]) AS e(email)
       LEFT JOIN users u ON lower(u.email) = e.email
       ORDER BY e.email`,
    [emails],
  )
  return {
    operators: rows.map(r => ({
      email: r.email,
      account: r.account,
      mfa: Boolean(r.mfa),
      lastLogin: r.last_login,
      self: r.email === admin.email.toLowerCase(),
    })),
  }
})

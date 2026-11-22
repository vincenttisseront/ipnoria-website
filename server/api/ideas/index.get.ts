import { IDEA_STATUSES } from '#shared/account'

// Liste publique : filtre par statut (« ouvertes » = proposées, à l'étude, prévues, en cours), tri par votes ou date,
// recherche dans les titres et textes, ou « mes idées ». Le vote de l'utilisateur connecté est indiqué.
const OPEN = ['proposed', 'review', 'planned', 'progress']
export default defineEventHandler(async (event) => {
  if (!hasDb()) return { items: [], enabled: false }
  const q = getQuery(event)
  const status = String(q.status ?? 'open')
  const sort = q.sort === 'new' ? 'new' : 'top'
  const text = String(q.q ?? '').trim().slice(0, 80)
  const s = accountsEnabled() ? await getAccountSession(event) : null
  const me = s && !s.mfaPending ? s.user.id : null

  const where = ['NOT i.hidden']
  const args: unknown[] = [me]
  if (status === 'open') where.push(`i.status = ANY('{${OPEN.join(',')}}')`)
  else if ((IDEA_STATUSES as readonly string[]).includes(status)) { args.push(status); where.push(`i.status = $${args.length}`) }
  else if (status !== 'all') throw createError({ statusCode: 400 })
  if (status !== 'duplicate' && status !== 'all') where.push(`i.status <> 'duplicate'`)
  if (q.mine === '1') {
    if (!me) return { items: [], enabled: accountsEnabled() }
    where.push(`(i.author_id = $1 OR EXISTS (SELECT 1 FROM idea_votes v WHERE v.idea_id = i.id AND v.user_id = $1))`)
  }
  if (text.length >= 2) {
    args.push(`%${text.replace(/[\\%_]/g, m => `\\${m}`)}%`)
    where.push(`(i.title::text ILIKE $${args.length} OR i.body::text ILIKE $${args.length})`)
  }
  const r = await useDb().query(
    `SELECT ${IDEA_SELECT},
            EXISTS (SELECT 1 FROM idea_votes v WHERE v.idea_id = i.id AND v.user_id = $1) AS voted
       FROM ideas i LEFT JOIN users u ON u.id = i.author_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${sort === 'new' ? 'i.created_at DESC' : 'votes DESC, i.created_at DESC'} LIMIT 200`,
    args,
  )
  return { items: r.rows.map(({ hidden: _h, ...x }) => ({ ...x, body: undefined, excerpt: x.body })), enabled: accountsEnabled() }
})

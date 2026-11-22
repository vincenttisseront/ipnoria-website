import type { H3Event } from 'h3'
import { checkSolution, createChallenge } from './pow-core'
import type { PowPayload } from './pow-core'

const powSecret = () => `pow:${useRuntimeConfig().ipHashSalt}`
export const newPowChallenge = () => createChallenge(powSecret())

/** Exige une preuve de travail valide et jamais utilisée (payload : JSON en base64). */
export async function verifyPow(event: H3Event, payload: string | undefined): Promise<void> {
  if (String(useRuntimeConfig().powDisabled) === 'true') return
  let p: PowPayload
  try { p = JSON.parse(Buffer.from(String(payload ?? ''), 'base64').toString('utf8')) }
  catch { throw fail(400, 'pow_required') }
  if (!checkSolution(powSecret(), p)) throw fail(400, 'pow_invalid')
  const db = useDb()
  await db.query('DELETE FROM pow_used WHERE expires_at < now()')
  const exp = Number(/[?&]expires=(\d+)/.exec(p.salt)?.[1])
  const r = await db.query('INSERT INTO pow_used (challenge, expires_at) VALUES ($1, to_timestamp($2)) ON CONFLICT DO NOTHING', [p.challenge, exp])
  if (!r.rowCount) throw fail(400, 'pow_invalid')
  void event
}

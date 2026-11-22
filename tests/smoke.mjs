// Test de fumée contre le serveur construit (node .output/server/index.mjs) et une vraie base.
// BASE_URL (défaut http://localhost:3000). Échoue au premier écart.
import assert from 'node:assert/strict'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const ORIGIN = new URL(BASE).origin

async function waitReady() {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${BASE}/api/health`)).ok) return } catch { /* pas encore prêt */ }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error('le serveur ne répond pas')
}

const checks = []
const check = (name, fn) => checks.push([name, fn])

check('pages FR et EN', async () => {
  for (const [path, text] of [
    ['/', 'Une seule appliance'], ['/en', 'One appliance'],
    ['/documentation', 'Documentation'], ['/en/docs', 'Documentation'],
    ['/contact', 'Envoyer le message'], ['/en/contact', 'Send the message'],
    ['/mentions-legales', 'Mentions légales'], ['/en/legal-notice', 'Legal notice'],
    ['/confidentialite', 'Confidentialité'], ['/en/privacy', 'Privacy'],
  ]) {
    const res = await fetch(BASE + path, { headers: { 'accept-language': 'fr' } })
    assert.equal(res.status, 200, path)
    assert.ok((await res.text()).includes(text), `${path} : « ${text} » absent`)
  }
})

check('page inconnue : 404', async () => {
  assert.equal((await fetch(`${BASE}/nexiste-pas`)).status, 404)
})

check('en-têtes de sécurité', async () => {
  const h = (await fetch(`${BASE}/`)).headers
  assert.match(h.get('content-security-policy') ?? '', /default-src 'none'/)
  assert.match(h.get('content-security-policy') ?? '', /script-src 'self' 'strict-dynamic' 'nonce-/)
  assert.equal(h.get('x-frame-options'), 'DENY')
  assert.equal(h.get('x-content-type-options'), 'nosniff')
  assert.ok(h.get('strict-transport-security'))
  assert.equal(h.get('x-powered-by'), null)
})

const form = (extra = {}) => ({
  name: 'Test Fumée', email: 'fumee@example.org', company: '', topic: 'question',
  message: 'Message du test de fumée, à ignorer.', consent: true, locale: 'fr', website: '',
  startedAt: Date.now() - 10_000, ...extra,
})
const post = (body, headers = {}) => fetch(`${BASE}/api/contact`, {
  method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers }, body: JSON.stringify(body),
})

check('formulaire : envoi valide', async () => {
  assert.equal((await post(form())).status, 201)
})
check('formulaire : champs invalides nommés', async () => {
  const res = await post(form({ email: 'x', consent: false }))
  assert.equal(res.status, 400)
  assert.deepEqual((await res.json()).data.fields, ['email', 'consent'])
})
check('formulaire : autre origine refusée', async () => {
  assert.equal((await post(form(), { origin: 'https://evil.example' })).status, 403)
})
check('formulaire : piège à robots silencieux', async () => {
  assert.equal((await post(form({ website: 'http://spam' }))).status, 200)
})
check('formulaire : limitation de débit', async () => {
  let last = 0
  for (let i = 0; i < 6; i++) last = (await post(form({ email: 'x' }))).status
  assert.equal(last, 429)
})

await waitReady()
let failed = 0
for (const [name, fn] of checks) {
  try { await fn(); console.info(`ok   ${name}`) }
  catch (e) { failed++; console.error(`ÉCHEC ${name} : ${e.message}`) }
}
process.exit(failed ? 1 : 0)

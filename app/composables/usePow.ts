// Preuve de travail côté navigateur : un défi est demandé et résolu en arrière-plan dès l'ouverture du formulaire,
// puis joint à l'envoi. Calcul par lots pour ne pas figer la page.
export function usePow() {
  const solution = ref<string | null>(null)
  const solving = ref(false)
  let pending: Promise<string> | null = null
  async function digest(s: string) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
    return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('')
  }
  async function run(): Promise<string> {
    solving.value = true
    try {
      const c = await $fetch<{ algorithm: string, challenge: string, maxnumber: number, salt: string, signature: string }>('/api/pow')
      for (let n = 0; n <= c.maxnumber; n++) {
        if (await digest(`${c.salt}${n}`) === c.challenge) {
          solution.value = btoa(JSON.stringify({ algorithm: c.algorithm, challenge: c.challenge, number: n, salt: c.salt, signature: c.signature }))
          return solution.value
        }
        if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0))
      }
      throw new Error('pow unsolved')
    }
    finally { solving.value = false }
  }
  /** Lance la résolution si besoin et renvoie la solution (à usage unique : on en prépare une nouvelle ensuite). */
  async function get(): Promise<string> {
    const s = solution.value ?? await (pending ??= run())
    solution.value = null; pending = null
    return s
  }
  const prepare = () => { if (import.meta.client && !pending && !solution.value) pending = run().catch(() => { pending = null; return '' }) }
  return { solving, prepare, get }
}

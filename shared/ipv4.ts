// Calculs IPv4 sans dépendance (outils du site, exécutés dans le navigateur)
export function ipToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim())
  if (!m) return null
  const parts = m.slice(1).map(Number)
  if (parts.some(p => p > 255)) return null
  return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!
}

export const intToIp = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')

export function maskToPrefix(mask: string): number | null {
  const n = ipToInt(mask)
  if (n === null) return null
  const bits = n.toString(2).padStart(32, '0')
  return /^1*0*$/.test(bits) ? bits.indexOf('0') === -1 ? 32 : bits.indexOf('0') : null
}

export const prefixToMask = (p: number) => intToIp(p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0)

export interface Cidr { network: number, prefix: number }

export function parseCidr(s: string): Cidr | null {
  const m = /^\s*([\d.]+)\s*\/\s*(\d{1,2})\s*$/.exec(s)
  if (!m) return null
  const ip = ipToInt(m[1]!), prefix = Number(m[2])
  if (ip === null || prefix > 32) return null
  const size = 2 ** (32 - prefix)
  return { network: Math.floor(ip / size) * size, prefix }
}

export const cidrToString = (c: Cidr) => `${intToIp(c.network)}/${c.prefix}`
export const cidrSize = (c: Cidr) => 2 ** (32 - c.prefix)

export function cidrDetails(c: Cidr) {
  const size = cidrSize(c)
  const last = c.network + size - 1
  const usable = c.prefix >= 31 ? size : size - 2
  return {
    cidr: cidrToString(c),
    mask: prefixToMask(c.prefix),
    network: intToIp(c.network),
    first: intToIp(c.prefix >= 31 ? c.network : c.network + 1),
    last: intToIp(c.prefix >= 31 ? last : last - 1),
    broadcast: c.prefix >= 31 ? '' : intToIp(last),
    hosts: usable,
  }
}

/** Plus petit préfixe dont le nombre d'adresses utilisables couvre `hosts`. */
export function prefixForHosts(hosts: number): number {
  for (let p = 30; p >= 0; p--) if (2 ** (32 - p) - 2 >= hosts) return p
  return 0
}

export interface PlanRequest { name: string, vlan: string, hosts: number }
export interface PlanResult { name: string, vlan: string, hosts: number, cidr: Cidr }

/**
 * Découpage à masque variable (VLSM) : les besoins sont servis du plus grand au plus petit, chacun aligné sur sa taille.
 * Renvoie les sous-réseaux alloués et ceux qui ne tiennent pas dans le bloc.
 */
export function planVlsm(block: Cidr, reqs: PlanRequest[]): { allocated: PlanResult[], unplaced: PlanRequest[], free: Cidr[] } {
  const sorted = [...reqs].filter(r => r.hosts > 0).sort((a, b) => b.hosts - a.hosts)
  const end = block.network + cidrSize(block)
  let cursor = block.network
  const allocated: PlanResult[] = []
  const unplaced: PlanRequest[] = []
  for (const r of sorted) {
    const prefix = Math.max(prefixForHosts(r.hosts), block.prefix)
    const size = 2 ** (32 - prefix)
    const start = Math.ceil(cursor / size) * size
    if (start + size > end || 2 ** (32 - prefix) - 2 < r.hosts) { unplaced.push(r); continue }
    allocated.push({ ...r, cidr: { network: start, prefix } })
    cursor = start + size
  }
  return { allocated, unplaced, free: freeBlocks(cursor, end) }
}

/** Découpe l'espace libre [from, to[ en blocs CIDR alignés, du plus grand possible au plus petit. */
export function freeBlocks(from: number, to: number): Cidr[] {
  const out: Cidr[] = []
  let cur = from
  while (cur < to) {
    let prefix = 32
    while (prefix > 0) {
      const size = 2 ** (32 - (prefix - 1))
      if (cur % size !== 0 || cur + size > to) break
      prefix--
    }
    out.push({ network: cur, prefix })
    cur += 2 ** (32 - prefix)
  }
  return out
}

/** Découpage en N sous-réseaux égaux (N arrondi à la puissance de 2 supérieure). */
export function splitEqual(block: Cidr, count: number): Cidr[] {
  const bits = Math.ceil(Math.log2(Math.max(1, count)))
  const prefix = Math.min(32, block.prefix + bits)
  const size = 2 ** (32 - prefix)
  return Array.from({ length: Math.min(2 ** bits, 1024) }, (_, i) => ({ network: block.network + i * size, prefix }))
}

/** Normalise une adresse MAC (séparateurs « - », « : », « . » ou aucun) en minuscules avec « : ». */
export function normMac(s: string): string | null {
  const hex = s.replace(/[-:.\s]/g, '').toLowerCase()
  return /^[0-9a-f]{12}$/.test(hex) ? hex.match(/.{2}/g)!.join(':') : null
}

// Aperçu de l'import d'un export DHCP Windows (Export-DhcpServer), calculé dans le navigateur.
// Mêmes règles que l'importeur de la console Ipnoria (webui/server/utils/ad.ts, parseDhcpExport) : étendues IPv4,
// plages moins exclusions, options 3/6/15/42/66/67/119, réservations avec MAC valide, durée de bail.
import { cidrToString, intToIp, ipToInt, maskToPrefix, normMac, parseCidr } from './ipv4'

export interface PreviewScope {
  cidr: string, name: string, leaseSeconds: number, enabled: boolean
  pools: Array<{ start: string, end: string }>
  exclusions: Array<{ start: string, end: string }>
  options: Record<string, string | string[]>
  reservations: Array<{ mac: string, ip: string, hostname: string | null, description: string | null }>
}
export interface PreviewWarning { scope?: string, code: 'xml_invalid' | 'no_ipv4_section' | 'scope_invalid' | 'reservation_invalid' | 'option_unmapped', detail?: string }
export interface Preview { scopes: PreviewScope[], warnings: PreviewWarning[], notImported: string[] }

const OPT: Record<string, string> = { 3: 'routers', 6: 'dnsServers', 15: 'domainName', 42: 'ntpServers', 119: 'domainSearch', 66: 'tftpServer', 67: 'bootFile' }
const OPT_ARRAY = new Set(['routers', 'dnsServers', 'ntpServers', 'domainSearch'])

// Recherche sans casse des balises (l'export varie selon les versions de Windows)
const kids = (el: Element | null | undefined, name: string): Element[] =>
  el ? [...el.children].filter(c => c.localName.toLowerCase() === name) : []
const kid = (el: Element | null | undefined, name: string) => kids(el, name)[0] ?? null
const text = (el: Element | null | undefined, name: string) => (kid(el, name)?.textContent ?? '').trim()

export function parseWindowsLease(s: string): number | null {
  const m = /^(?:(\d+)\.)?(\d+):(\d+):(\d+)$/.exec(s)
  if (!m) return /^\d+$/.test(s) ? Number(s) : null
  return Number(m[1] ?? 0) * 86400 + Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4])
}

export function subtractRanges(start: number, end: number, excl: Array<[number, number]>): Array<[number, number]> {
  let out: Array<[number, number]> = [[start, end]]
  for (const [a, b] of excl) {
    const next: Array<[number, number]> = []
    for (const [s, e] of out) {
      if (b < s || a > e) { next.push([s, e]); continue }
      if (a > s) next.push([s, a - 1])
      if (b < e) next.push([b + 1, e])
    }
    out = next
  }
  return out
}

function readOptions(container: Element | null, warnings: PreviewWarning[], scope?: string) {
  const out: Record<string, string | string[]> = {}
  for (const o of kids(kid(container, 'optionvalues'), 'optionvalue')) {
    const id = text(o, 'optionid')
    const key = OPT[id]
    const values = kids(o, 'value').map(v => (v.textContent ?? '').trim()).filter(Boolean)
    if (!key) { warnings.push({ scope, code: 'option_unmapped', detail: id }); continue }
    out[key] = OPT_ARRAY.has(key) ? values : values[0] ?? ''
  }
  return out
}

/** `doc` vient de `new DOMParser().parseFromString(xml, 'application/xml')`. */
export function previewDhcpExport(doc: Document): Preview {
  const preview: Preview = { scopes: [], warnings: [], notImported: [] }
  if (doc.getElementsByTagName('parsererror').length) { preview.warnings.push({ code: 'xml_invalid' }); return preview }
  const root = doc.documentElement
  const v4 = root && root.localName.toLowerCase() === 'dhcpserver' ? kid(root, 'ipv4') : null
  if (!v4) { preview.warnings.push({ code: 'no_ipv4_section' }); return preview }

  // Ce que l'export contient mais que l'import ne reprend pas : à recréer à la main
  const extra: Array<[Element | null, string, string]> = [
    [root, 'ipv6', 'ipv6'], [v4, 'policies', 'policies'], [v4, 'classes', 'classes'], [v4, 'filters', 'filters'],
    [v4, 'failover', 'failover'], [v4, 'superscopes', 'superscopes'], [v4, 'multicastscopes', 'multicast'],
  ]
  for (const [el, tag, code] of extra) {
    const node = kid(el, tag)
    if (node && node.children.length) preview.notImported.push(code)
  }

  const global = readOptions(v4, preview.warnings)
  for (const sc of kids(kid(v4, 'scopes'), 'scope')) {
    const id = text(sc, 'scopeid'), mask = text(sc, 'subnetmask')
    const label = id || '?'
    const prefix = maskToPrefix(mask)
    const net = prefix === null || ipToInt(id) === null ? null : parseCidr(`${id}/${prefix}`)
    if (!net) { preview.warnings.push({ scope: label, code: 'scope_invalid' }); continue }
    const start = ipToInt(text(sc, 'startrange')), end = ipToInt(text(sc, 'endrange'))
    const excl: Array<[number, number]> = kids(kid(sc, 'exclusionranges'), 'iprange').flatMap((r) => {
      const a = ipToInt(text(r, 'startrange')), b = ipToInt(text(r, 'endrange'))
      return a !== null && b !== null ? [[a, b] as [number, number]] : []
    })
    const pools = start !== null && end !== null ? subtractRanges(start, end, excl).map(([a, b]) => ({ start: intToIp(a), end: intToIp(b) })) : []
    const options = { ...global, ...readOptions(sc, preview.warnings, label) }
    const reservations: PreviewScope['reservations'] = []
    for (const r of kids(kid(sc, 'reservations'), 'reservation')) {
      const ip = ipToInt(text(r, 'ipaddress')), mac = normMac(text(r, 'clientid'))
      if (ip === null || !mac) { preview.warnings.push({ scope: label, code: 'reservation_invalid', detail: text(r, 'clientid') }); continue }
      const host = text(r, 'name').toLowerCase().split('.')[0]!.replace(/[^a-z0-9-]/g, '')
      reservations.push({ mac, ip: intToIp(ip), hostname: host || null, description: text(r, 'description') || null })
    }
    preview.scopes.push({
      cidr: cidrToString(net), name: text(sc, 'name') || label, leaseSeconds: parseWindowsLease(text(sc, 'leaseduration')) ?? 86400,
      enabled: text(sc, 'state').toLowerCase() !== 'inactive', pools, options, reservations,
      exclusions: excl.map(([a, b]) => ({ start: intToIp(a), end: intToIp(b) })),
    })
  }
  return preview
}

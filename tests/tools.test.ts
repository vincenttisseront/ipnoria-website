// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { previewDhcpExport } from '#shared/dhcp-preview'
import { cidrDetails, cidrToString, freeBlocks, maskToPrefix, normMac, parseCidr, planVlsm, prefixForHosts, splitEqual } from '#shared/ipv4'
import { size } from '#shared/sizing'
import { candidateSlots, localDay, parseIcsBusy, zonedToUtc } from '../server/utils/booking-core'
import { inboxWhere } from '../server/utils/admin-inbox'
import { toCsv } from '../server/utils/csv'

describe('calculs IPv4', () => {
  it('normalise un bloc sur sa frontière', () => {
    expect(cidrToString(parseCidr('10.20.4.77/24')!)).toBe('10.20.4.0/24')
    expect(parseCidr('10.0.0.0/33')).toBeNull()
    expect(parseCidr('256.0.0.0/8')).toBeNull()
  })
  it('détaille un réseau', () => {
    expect(cidrDetails(parseCidr('192.168.1.0/26')!)).toEqual({ cidr: '192.168.1.0/26', mask: '255.255.255.192', network: '192.168.1.0', first: '192.168.1.1', last: '192.168.1.62', broadcast: '192.168.1.63', hosts: 62 })
    expect(cidrDetails(parseCidr('10.0.0.0/31')!).hosts).toBe(2)
  })
  it('convertit masque et besoin en préfixe', () => {
    expect(maskToPrefix('255.255.252.0')).toBe(22)
    expect(maskToPrefix('255.0.255.0')).toBeNull()
    expect(prefixForHosts(400)).toBe(23)
    expect(prefixForHosts(254)).toBe(24)
    expect(prefixForHosts(255)).toBe(23)
  })
  it('découpe à masque variable, du plus grand au plus petit, sans chevauchement', () => {
    const plan = planVlsm(parseCidr('10.20.0.0/22')!, [
      { name: 'a', vlan: '', hosts: 60 }, { name: 'b', vlan: '', hosts: 400 }, { name: 'c', vlan: '', hosts: 14 }, { name: 'trop', vlan: '', hosts: 2000 },
    ])
    expect(plan.allocated.map(a => [a.name, cidrToString(a.cidr)])).toEqual([['b', '10.20.0.0/23'], ['a', '10.20.2.0/26'], ['c', '10.20.2.64/28']])
    expect(plan.unplaced.map(u => u.name)).toEqual(['trop'])
    expect(plan.free.map(cidrToString)).toEqual(['10.20.2.80/28', '10.20.2.96/27', '10.20.2.128/25', '10.20.3.0/24'])
  })
  it('découpe en parts égales', () => {
    expect(splitEqual(parseCidr('10.0.0.0/24')!, 3).map(cidrToString)).toEqual(['10.0.0.0/26', '10.0.0.64/26', '10.0.0.128/26', '10.0.0.192/26'])
    expect(freeBlocks(0, 3).length).toBe(2)
  })
  it('normalise les MAC', () => {
    expect(normMac('00-15-5D-01-02-0A')).toBe('00:15:5d:01:02:0a')
    expect(normMac('0015.5d01.020a')).toBe('00:15:5d:01:02:0a')
    expect(normMac('00-15-5D')).toBeNull()
  })
})

const XML = `<?xml version="1.0" encoding="utf-8"?>
<DHCPServer>
  <IPv4>
    <OptionValues><OptionValue><OptionId>6</OptionId><Value>10.0.0.2</Value><Value>10.0.0.3</Value></OptionValue></OptionValues>
    <Classes><Class><Name>Vendor</Name></Class></Classes>
    <Scopes>
      <Scope>
        <ScopeId>10.20.20.0</ScopeId><SubnetMask>255.255.255.0</SubnetMask><Name>Postes bureau</Name>
        <StartRange>10.20.20.10</StartRange><EndRange>10.20.20.200</EndRange><LeaseDuration>8.00:00:00</LeaseDuration><State>Active</State>
        <ExclusionRanges><IPRange><StartRange>10.20.20.50</StartRange><EndRange>10.20.20.59</EndRange></IPRange></ExclusionRanges>
        <OptionValues>
          <OptionValue><OptionId>3</OptionId><Value>10.20.20.1</Value></OptionValue>
          <OptionValue><OptionId>252</OptionId><Value>http://wpad</Value></OptionValue>
        </OptionValues>
        <Reservations>
          <Reservation><Name>imprimante-rdc.corp.local</Name><IPAddress>10.20.20.20</IPAddress><ClientId>02-42-ac-96-62-e3</ClientId><Description>RDC</Description></Reservation>
          <Reservation><Name>bad</Name><IPAddress>10.20.20.21</IPAddress><ClientId>xyz</ClientId></Reservation>
        </Reservations>
      </Scope>
      <Scope><ScopeId>10.30.0.0</ScopeId><SubnetMask>255.0.255.0</SubnetMask><Name>Cassée</Name></Scope>
      <Scope><ScopeId>10.40.0.0</ScopeId><SubnetMask>255.255.0.0</SubnetMask><Name>Arrêtée</Name><StartRange>10.40.1.1</StartRange><EndRange>10.40.1.100</EndRange><State>InActive</State></Scope>
    </Scopes>
  </IPv4>
</DHCPServer>`

describe('aperçu de l\'import DHCP Windows (mêmes règles que la console)', () => {
  const parse = (xml: string) => previewDhcpExport(new DOMParser().parseFromString(xml, 'application/xml'))
  const p = parse(XML)

  it('reprend étendues, plages moins exclusions, options et réservations', () => {
    expect(p.scopes.map(s => s.cidr)).toEqual(['10.20.20.0/24', '10.40.0.0/16'])
    const s = p.scopes[0]!
    expect(s.pools).toEqual([{ start: '10.20.20.10', end: '10.20.20.49' }, { start: '10.20.20.60', end: '10.20.20.200' }])
    expect(s.leaseSeconds).toBe(8 * 86400)
    expect(s.options).toEqual({ dnsServers: ['10.0.0.2', '10.0.0.3'], routers: ['10.20.20.1'] })
    expect(s.reservations).toEqual([{ mac: '02:42:ac:96:62:e3', ip: '10.20.20.20', hostname: 'imprimante-rdc', description: 'RDC' }])
    expect(p.scopes[1]!.enabled).toBe(false)
  })
  it('signale ce qui est ignoré et ce qui reste à refaire', () => {
    expect(p.warnings.map(w => w.code).sort()).toEqual(['option_unmapped', 'reservation_invalid', 'scope_invalid'])
    expect(p.notImported).toEqual(['classes'])
  })
  it('refuse un fichier qui n\'est pas un export', () => {
    expect(parse('<a><b></a>').warnings[0]!.code).toBe('xml_invalid')
    expect(parse('<Autre/>').warnings[0]!.code).toBe('no_ipv4_section')
  })
})

describe('dimensionnement', () => {
  it('part du minimum documenté', () => {
    const r = size({ devices: 500, sites: 1, wifi8021x: false, pki: false, dnsFiltering: false, highAvailability: false })
    expect(r.nodes).toEqual([{ role: 'single', count: 1, vcpu: 2, ramGb: 4, diskGb: 40 }])
  })
  it('ajoute la PKI, le journal DNS et le cluster avec arbitre', () => {
    const r = size({ devices: 5000, sites: 3, wifi8021x: true, pki: true, dnsFiltering: true, highAvailability: true })
    expect(r.topology).toBe('cluster')
    expect(r.nodes[0]).toEqual({ role: 'data', count: 2, vcpu: 4, ramGb: 10, diskGb: 110 })
    expect(r.nodes[1]!.role).toBe('witness')
    expect(r.notes).toEqual(expect.arrayContaining(['pki', 'dnslog', 'relays', 'cluster']))
  })
})

describe('créneaux de démonstration', () => {
  it('donne le jour calendaire dans le fuseau, pas en UTC', () => {
    expect(localDay(new Date('2026-11-23T22:30:00Z'), 'Europe/Paris')).toBe('2026-11-23')
    expect(localDay(new Date('2026-11-23T23:30:00Z'), 'Europe/Paris')).toBe('2026-11-24')
  })
  it('convertit l\'heure de Paris en UTC, heure d\'été comprise', () => {
    expect(zonedToUtc(2026, 1, 15, 10, 0, 'Europe/Paris').toISOString()).toBe('2026-01-15T09:00:00.000Z')
    expect(zonedToUtc(2026, 7, 15, 10, 0, 'Europe/Paris').toISOString()).toBe('2026-07-15T08:00:00.000Z')
  })
  it('ne propose que les jours ouvrés, après le délai de prévenance', () => {
    const now = new Date('2026-11-20T12:00:00Z') // vendredi
    const slots = candidateSlots({ timezone: 'Europe/Paris', days: [1, 2, 3, 4, 5], times: ['10:00', '14:00'], durationMin: 30, horizonDays: 4, minNoticeHours: 24 }, now)
    expect(slots.map(d => d.toISOString())).toEqual(['2026-11-23T09:00:00.000Z', '2026-11-23T13:00:00.000Z', '2026-11-24T09:00:00.000Z', '2026-11-24T13:00:00.000Z'])
  })
  it('lit les occupations d\'un agenda iCalendar', () => {
    const busy = parseIcsBusy([
      'BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'DTSTART:20261123T090000Z', 'DTEND:20261123T100000Z', 'END:VEVENT',
      'BEGIN:VEVENT', 'DTSTART;TZID=Europe/Paris:20261124T140000', 'DTEND;TZID=Europe/Paris:20261124T150000', 'END:VEVENT',
      'BEGIN:VEVENT', 'DTSTART:20261125T090000Z', 'DTEND:20261125T100000Z', 'TRANSP:TRANSPARENT', 'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n'), 'Europe/Paris')
    expect(busy).toEqual([
      { start: Date.parse('2026-11-23T09:00:00Z'), end: Date.parse('2026-11-23T10:00:00Z') },
      { start: Date.parse('2026-11-24T13:00:00Z'), end: Date.parse('2026-11-24T14:00:00Z') },
    ])
  })
})

describe('administration', () => {
  it('laisse le terme de recherche en paramètre et échappe les jokers', () => {
    expect(inboxWhere('ouverts', 'a%_b')).toEqual({
      sql: `handled_at IS NULL AND (name ILIKE $1 ESCAPE '\\' OR email ILIKE $1 ESCAPE '\\' OR company ILIKE $1 ESCAPE '\\')`,
      args: ['%a\\%\\_b%'],
    })
    expect(inboxWhere('tous', '  ')).toEqual({ sql: 'TRUE', args: [] })
    expect(inboxWhere('n’importe', '').sql).toBe('handled_at IS NULL')
  })
  it('neutralise une formule de tableur dans le CSV', () => {
    expect(toCsv([['=1+1', 'a,b']])).toBe('\uFEFF\'=1+1,"a,b"\r\n')
  })
})

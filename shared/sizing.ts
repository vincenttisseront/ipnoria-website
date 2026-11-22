// Dimensionnement indicatif. Point de départ documenté : 2 vCPU, 4 Go de mémoire, 40 Go de disque (docs/INSTALL.md).
// Au-delà, des paliers prudents : c'est un ordre de grandeur, à confirmer par un essai sur votre charge réelle.
export interface SizingInput {
  devices: number          // appareils qui prennent une adresse (postes, téléphones, imprimantes, IoT)
  sites: number
  wifi8021x: boolean        // authentification 802.1X / VPN par RADIUS
  pki: boolean              // PKI intégrée (EJBCA)
  dnsFiltering: boolean     // filtrage DNS avec journal des requêtes
  highAvailability: boolean
}

export interface NodeSpec { role: 'single' | 'data' | 'witness', count: number, vcpu: number, ramGb: number, diskGb: number }
export interface SizingResult { topology: 'single' | 'cluster', nodes: NodeSpec[], notes: string[], tier: 0 | 1 | 2 | 3 }

export function size(input: SizingInput): SizingResult {
  const devices = Math.max(0, Math.round(input.devices))
  const tier: 0 | 1 | 2 | 3 = devices <= 2000 ? 0 : devices <= 10000 ? 1 : devices <= 30000 ? 2 : 3
  let vcpu = [2, 4, 8, 8][tier]!
  let ram = [4, 8, 16, 32][tier]!
  let disk = [40, 60, 100, 200][tier]!
  const notes: string[] = []

  // La PKI (EJBCA, Java dans un conteneur) demande de la mémoire en plus
  if (input.pki) { ram += 2; notes.push('pki') }
  if (input.wifi8021x) notes.push('radius')
  // Journal des requêtes DNS : volume proportionnel au nombre d'appareils
  if (input.dnsFiltering) { disk += Math.ceil(devices / 1000) * 10; notes.push('dnslog') }
  if (tier === 3) notes.push('large')
  if (input.sites > 1) notes.push('relays')

  const ha = input.highAvailability
  if (ha) notes.push('cluster')
  vcpu = Math.max(vcpu, 2)
  return {
    topology: ha ? 'cluster' : 'single',
    tier,
    nodes: ha
      ? [
          { role: 'data', count: 2, vcpu, ramGb: ram, diskGb: disk },
          // L'arbitre ne porte qu'etcd : une petite machine suffit
          { role: 'witness', count: 1, vcpu: 1, ramGb: 1, diskGb: 10 },
        ]
      : [{ role: 'single', count: 1, vcpu, ramGb: ram, diskGb: disk }],
    notes,
  }
}

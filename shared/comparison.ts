// Comparatif honnête : ce que fait l'existant Windows (rôles DNS, DHCP, NPS et AD CS de Windows Server) face à Ipnoria.
// « yes » = couvert, « partial » = possible avec limites ou composant additionnel, « no » = absent.
export type Mark = 'yes' | 'partial' | 'no'
export interface CompareRow { feature: string, windows: Mark, ddi: Mark, note?: string }

const fr: CompareRow[] = [
  { feature: 'DNS faisant autorité, zones inverses, redirections', windows: 'yes', ddi: 'yes' },
  { feature: 'Zones DNS intégrées à Active Directory', windows: 'yes', ddi: 'no', note: 'Ipnoria reprend les zones par transfert ou import ; il ne stocke pas les zones dans l\'AD.' },
  { feature: 'DHCP en haute disponibilité', windows: 'yes', ddi: 'yes', note: 'Kea en répartition de charge sur deux nœuds de données.' },
  { feature: 'IPAM qui crée DNS et réservation DHCP dans la même transaction', windows: 'partial', ddi: 'yes', note: 'Côté Windows, l\'IPAM est un rôle séparé qui observe plus qu\'il n\'orchestre.' },
  { feature: 'Filtrage DNS (RPZ) et détection de tunnels DNS', windows: 'partial', ddi: 'yes' },
  { feature: 'RADIUS 802.1X par groupe AD, groupes imbriqués', windows: 'yes', ddi: 'yes' },
  { feature: 'Simulation d\'une authentification avant déploiement', windows: 'no', ddi: 'yes' },
  { feature: 'Second facteur pour le VPN', windows: 'partial', ddi: 'yes', note: 'Windows : extension NPS d\'un fournisseur. Ipnoria : fournisseur externe configurable, par client RADIUS.' },
  { feature: 'Autorités de certification, CRL, SCEP', windows: 'yes', ddi: 'yes', note: 'Windows : AD CS, et NDES pour SCEP.' },
  { feature: 'Certificats de postes émis automatiquement', windows: 'yes', ddi: 'yes' },
  { feature: 'Une seule console web pour tout', windows: 'no', ddi: 'yes' },
  { feature: 'Point de restauration avant chaque changement, retour à la minute près', windows: 'no', ddi: 'yes' },
  { feature: 'Installation depuis une seule ISO', windows: 'no', ddi: 'yes' },
  { feature: 'Support commercial de l\'éditeur', windows: 'yes', ddi: 'no', note: 'Ipnoria : tickets publics et contact direct.' },
  { feature: 'Licences', windows: 'partial', ddi: 'yes', note: 'Windows Server et CAL d\'un côté ; logiciel libre AGPL-3.0 de l\'autre.' },
]

const en: CompareRow[] = [
  { feature: 'Authoritative DNS, reverse zones, forwarding', windows: 'yes', ddi: 'yes' },
  { feature: 'Active Directory–integrated DNS zones', windows: 'yes', ddi: 'no', note: 'Ipnoria takes zones over by transfer or import; it does not store zones in AD.' },
  { feature: 'Highly available DHCP', windows: 'yes', ddi: 'yes', note: 'Kea load-balancing across two data nodes.' },
  { feature: 'IPAM that creates DNS and DHCP reservation in one transaction', windows: 'partial', ddi: 'yes', note: 'On Windows, IPAM is a separate role that observes more than it orchestrates.' },
  { feature: 'DNS filtering (RPZ) and DNS tunnel detection', windows: 'partial', ddi: 'yes' },
  { feature: '802.1X RADIUS by AD group, nested groups', windows: 'yes', ddi: 'yes' },
  { feature: 'Simulate an authentication before deploying', windows: 'no', ddi: 'yes' },
  { feature: 'Second factor for VPN', windows: 'partial', ddi: 'yes', note: 'Windows: a vendor\'s NPS extension. Ipnoria: configurable external provider, per RADIUS client.' },
  { feature: 'Certificate authorities, CRLs, SCEP', windows: 'yes', ddi: 'yes', note: 'Windows: AD CS, plus NDES for SCEP.' },
  { feature: 'Workstation certificates issued automatically', windows: 'yes', ddi: 'yes' },
  { feature: 'One web console for everything', windows: 'no', ddi: 'yes' },
  { feature: 'Restore point before every change, point-in-time recovery', windows: 'no', ddi: 'yes' },
  { feature: 'Installs from a single ISO', windows: 'no', ddi: 'yes' },
  { feature: 'Vendor commercial support', windows: 'yes', ddi: 'no', note: 'Ipnoria: public issues and direct contact.' },
  { feature: 'Licensing', windows: 'partial', ddi: 'yes', note: 'Windows Server and CALs on one side; free software under AGPL-3.0 on the other.' },
]

export const COMPARISON = { fr, en } as const

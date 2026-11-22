// Pages « Pour qui » : besoins typiques d'un profil, ce qui y répond dans Ipnoria, et par où commencer.
export interface Profile {
  id: 'pme' | 'collectivites' | 'enseignement'
  slug: { fr: string, en: string }
  title: string
  lead: string
  needs: Array<{ title: string, text: string }>
  answers: Array<{ title: string, text: string }>
  start: Array<{ label: string, route: { name: string, params?: Record<string, string> } }>
}

const fr: Profile[] = [
  {
    id: 'pme', slug: { fr: 'pme', en: 'smb' },
    title: 'Pour les PME',
    lead: 'Une équipe informatique réduite, un Active Directory, un Wi‑Fi d\'entreprise, et des services Windows dont personne ne veut plus s\'occuper.',
    needs: [
      { title: 'Moins de serveurs à maintenir', text: 'DNS, DHCP, NPS et AD CS tournent souvent sur des serveurs Windows distincts, chacun avec sa console.' },
      { title: 'Un Wi‑Fi sûr sans complexité', text: 'Le 802.1X par certificat est la bonne pratique, mais une PKI fait peur.' },
      { title: 'Savoir qui a quelle adresse', text: 'Le tableur d\'adresses n\'est jamais à jour.' },
    ],
    answers: [
      { title: 'Une appliance, une console', text: 'IPAM, DNS, DHCP, RADIUS et PKI se pilotent au même endroit, installés depuis une seule ISO.' },
      { title: 'Certificats de postes automatiques', text: 'La PKI intégrée émet les certificats des postes du domaine, déployés par GPO depuis la console.' },
      { title: 'L\'IPAM fait foi', text: 'Allouer une adresse crée le DNS et la réservation DHCP dans la même transaction.' },
      { title: 'Se tromper sans risque', text: 'Point de restauration avant chaque changement, retour arrière automatique.' },
    ],
    start: [
      { label: 'Migrer un DHCP Windows', route: { name: 'guides-slug', params: { slug: 'dhcp-windows' } } },
      { label: 'Dimensionner', route: { name: 'outils-dimensionnement' } },
      { label: 'Préparer l\'installation', route: { name: 'outils-checklist' } },
    ],
  },
  {
    id: 'collectivites', slug: { fr: 'collectivites', en: 'local-government' },
    title: 'Pour les collectivités',
    lead: 'Plusieurs sites, des réseaux métiers séparés, des exigences de sécurité et de traçabilité, et un budget de licences à justifier.',
    needs: [
      { title: 'Plusieurs sites, un seul plan d\'adressage', text: 'Mairie, écoles, services techniques : des réseaux et des VLAN qui se multiplient.' },
      { title: 'Traçabilité', text: 'Qui a modifié quoi, qui s\'est connecté au réseau, et quand.' },
      { title: 'Continuité de service', text: 'Le DHCP et le DNS ne doivent pas tomber avec un serveur.' },
    ],
    answers: [
      { title: 'Espaces IP et gabarits', text: 'Espaces qui se chevauchent, VLAN, gabarits de réseau qui appliquent étendue, options et règle de nommage.' },
      { title: 'Journal d\'audit et SIEM', text: 'Chaque action est journalisée avec son motif, exportable vers un SIEM ; journal des authentifications RADIUS.' },
      { title: 'Cluster avec arbitre', text: 'Deux nœuds de données et un arbitre : DHCP réparti, DNS primaire et secondaire, bascule testée depuis la console.' },
      { title: 'Logiciel libre', text: 'Licence AGPL-3.0 : pas de licence par serveur ni par poste.' },
    ],
    start: [
      { label: 'Comparatif avec Windows Server', route: { name: 'comparatif' } },
      { label: 'Architecture du cluster', route: { name: 'documentation-slug', params: { slug: 'cluster' } } },
      { label: 'Planifier les sous-réseaux', route: { name: 'outils-sous-reseaux' } },
    ],
  },
  {
    id: 'enseignement', slug: { fr: 'enseignement', en: 'education' },
    title: 'Pour l\'enseignement',
    lead: 'Des milliers d\'appareils, beaucoup qui ne sont pas au domaine, des réseaux pédagogiques et administratifs à séparer, et un filtrage à assurer.',
    needs: [
      { title: 'Des appareils de toutes sortes', text: 'Postes du domaine, portables personnels, tablettes, imprimantes : tous n\'ont pas de certificat.' },
      { title: 'Séparer les publics', text: 'Élèves, enseignants, administration : chacun sur son VLAN.' },
      { title: 'Filtrer', text: 'Bloquer des catégories de sites et repérer les usages anormaux.' },
    ],
    answers: [
      { title: 'EAP-TLS et mot de passe', text: 'EAP-TLS pour les postes gérés, PEAP-MSCHAPv2 ou EAP-TTLS/PAP pour les autres, avec des règles par groupe AD.' },
      { title: 'Un VLAN par public', text: 'Les règles d\'accès attribuent le VLAN selon le type de compte et le groupe.' },
      { title: 'Filtrage DNS', text: 'Listes de blocage, journal des requêtes, pause et liste blanche en un clic, détection de tunnels DNS.' },
      { title: 'Baux lisibles', text: 'Chaque bail montre le nom annoncé par l\'appareil ; la découverte repère les adresses fantômes.' },
    ],
    start: [
      { label: 'Remplacer un NPS', route: { name: 'guides-slug', params: { slug: 'nps' } } },
      { label: 'Visite : écrire une règle Wi‑Fi', route: { name: 'visite' } },
      { label: 'Dimensionner', route: { name: 'outils-dimensionnement' } },
    ],
  },
]

const en: Profile[] = [
  {
    id: 'pme', slug: { fr: 'pme', en: 'smb' },
    title: 'For small and mid-sized businesses',
    lead: 'A small IT team, an Active Directory, corporate Wi‑Fi, and Windows services nobody wants to look after anymore.',
    needs: [
      { title: 'Fewer servers to maintain', text: 'DNS, DHCP, NPS and AD CS often run on separate Windows servers, each with its own console.' },
      { title: 'Secure Wi‑Fi without complexity', text: 'Certificate-based 802.1X is best practice, but a PKI is intimidating.' },
      { title: 'Knowing who has which address', text: 'The address spreadsheet is never up to date.' },
    ],
    answers: [
      { title: 'One appliance, one console', text: 'IPAM, DNS, DHCP, RADIUS and PKI are driven from one place, installed from a single ISO.' },
      { title: 'Automatic workstation certificates', text: 'The built-in PKI issues certificates to domain workstations, deployed by GPO from the console.' },
      { title: 'IPAM is the source of truth', text: 'Allocating an address creates DNS and the DHCP reservation in the same transaction.' },
      { title: 'Make mistakes safely', text: 'A restore point before every change, automatic rollback.' },
    ],
    start: [
      { label: 'Migrate a Windows DHCP', route: { name: 'guides-slug', params: { slug: 'dhcp-windows' } } },
      { label: 'Size your deployment', route: { name: 'outils-dimensionnement' } },
      { label: 'Prepare the installation', route: { name: 'outils-checklist' } },
    ],
  },
  {
    id: 'collectivites', slug: { fr: 'collectivites', en: 'local-government' },
    title: 'For local government',
    lead: 'Several sites, separate business networks, security and traceability requirements, and a license budget to justify.',
    needs: [
      { title: 'Several sites, one addressing plan', text: 'Town hall, schools, technical services: networks and VLANs keep multiplying.' },
      { title: 'Traceability', text: 'Who changed what, who connected to the network, and when.' },
      { title: 'Service continuity', text: 'DHCP and DNS must not go down with a server.' },
    ],
    answers: [
      { title: 'IP spaces and templates', text: 'Overlapping spaces, VLANs, network templates that apply scope, options and naming rule.' },
      { title: 'Audit log and SIEM', text: 'Every action is logged with its reason, exportable to a SIEM; RADIUS authentication log.' },
      { title: 'Cluster with a witness', text: 'Two data nodes and a witness: load-balanced DHCP, primary and secondary DNS, switchover tested from the console.' },
      { title: 'Free software', text: 'AGPL-3.0 license: no per-server or per-device license.' },
    ],
    start: [
      { label: 'Comparison with Windows Server', route: { name: 'comparatif' } },
      { label: 'Cluster architecture', route: { name: 'documentation-slug', params: { slug: 'cluster' } } },
      { label: 'Plan your subnets', route: { name: 'outils-sous-reseaux' } },
    ],
  },
  {
    id: 'enseignement', slug: { fr: 'enseignement', en: 'education' },
    title: 'For education',
    lead: 'Thousands of devices, many outside the domain, teaching and administrative networks to separate, and filtering to provide.',
    needs: [
      { title: 'All kinds of devices', text: 'Domain workstations, personal laptops, tablets, printers: not all of them have a certificate.' },
      { title: 'Separate audiences', text: 'Students, teachers, administration: each on their own VLAN.' },
      { title: 'Filtering', text: 'Block site categories and spot abnormal usage.' },
    ],
    answers: [
      { title: 'EAP-TLS and passwords', text: 'EAP-TLS for managed devices, PEAP-MSCHAPv2 or EAP-TTLS/PAP for the rest, with rules per AD group.' },
      { title: 'One VLAN per audience', text: 'Access rules assign the VLAN by account type and group.' },
      { title: 'DNS filtering', text: 'Block lists, query log, one-click pause and allow list, DNS tunnel detection.' },
      { title: 'Readable leases', text: 'Each lease shows the name announced by the device; discovery spots ghost addresses.' },
    ],
    start: [
      { label: 'Replace an NPS', route: { name: 'guides-slug', params: { slug: 'nps' } } },
      { label: 'Tour: write a Wi‑Fi rule', route: { name: 'visite' } },
      { label: 'Size your deployment', route: { name: 'outils-dimensionnement' } },
    ],
  },
]

export const PROFILES = { fr, en } as const
export const profileBySlug = (locale: 'fr' | 'en', slug: string) => PROFILES[locale].find(p => p.slug[locale] === slug)

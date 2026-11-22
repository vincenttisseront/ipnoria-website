// Visite guidée : parcours sur les vraies captures de la console. Les points (x, y) sont en % de l'image.
export interface TourStep { x: number, y: number, title: string, text: string }
export interface TourScenario { id: string, title: string, summary: string, image: { file: string, w: number, h: number }, steps: TourStep[] }

const IMG = {
  ipam: { file: 'console-ipam-adresses', w: 1440, h: 830 },
  dns: { file: 'console-dns-enregistrements', w: 1440, h: 640 },
  dhcp: { file: 'console-dhcp-reservations', w: 1440, h: 385 },
  radius: { file: 'console-radius-regles', w: 1210, h: 409 },
}

const fr: TourScenario[] = [
  {
    id: 'adresse', title: 'Allouer une adresse', summary: 'De l\'IPAM au DNS et au DHCP, en une seule action.', image: IMG.ipam,
    steps: [
      { x: 38, y: 10.2, title: 'La liste des adresses', text: 'Toutes les adresses d\'un espace IP, filtrables par réseau, statut ou label. Les passerelles apparaissent d\'elles-mêmes.' },
      { x: 73.5, y: 19, title: 'Prochaine adresse libre', text: 'La console propose la première adresse libre du réseau, jamais une passerelle ni un routeur DHCP.' },
      { x: 67.8, y: 19, title: 'Ajouter', text: 'À l\'enregistrement, l\'IPAM crée dans la même transaction l\'enregistrement DNS (A et PTR) et, avec une adresse MAC, la réservation DHCP.' },
      { x: 27.4, y: 32, title: 'Statut et MAC', text: 'Utilisée, réservation DHCP, passerelle : chaque ligne dit ce que l\'adresse est réellement, avec sa MAC.' },
      { x: 59, y: 44.7, title: 'Alias DNS', text: 'Les alias (CNAME) suivent l\'adresse : la renommer ou la libérer met le DNS à jour.' },
      { x: 81, y: 19, title: 'Exporter', text: 'La vue courante s\'exporte en CSV, filtres compris.' },
    ],
  },
  {
    id: 'dns', title: 'Gérer une zone DNS', summary: 'Enregistrements, protection, historique et déploiement validé.', image: IMG.dns,
    steps: [
      { x: 39.2, y: 13.3, title: 'Enregistrements', text: 'Les enregistrements de toutes les zones, avec type, durée de vie et valeur.' },
      { x: 92.7, y: 24.8, title: 'Ajouter un enregistrement', text: 'A, AAAA, CNAME, MX, TXT, SRV… La valeur est contrôlée à la saisie.' },
      { x: 70.8, y: 33.9, title: 'Protection', text: 'Un enregistrement protégé ne se modifie qu\'avec les droits d\'administrateur : utile pour les noms critiques.' },
      { x: 61.1, y: 13.3, title: 'Historique', text: 'Chaque modification est conservée ; un état précédent se restaure en un clic.' },
      { x: 92, y: 13.3, title: 'Valider et déployer', text: 'Les fichiers BIND sont vérifiés par les outils officiels avant d\'être appliqués, avec retour arrière automatique en cas d\'échec.' },
    ],
  },
  {
    id: 'dhcp', title: 'Réserver une adresse DHCP', summary: 'Plages, réservations et baux d\'un réseau.', image: IMG.dhcp,
    steps: [
      { x: 26.3, y: 32.2, title: 'Choisir le réseau', text: 'Les réseaux viennent de l\'IPAM : pas de double saisie entre IPAM et DHCP.' },
      { x: 29.2, y: 73.5, title: 'Plages d\'adresses', text: 'Les plages distribuées dynamiquement. Les exclusions d\'un export Windows deviennent des plages découpées.' },
      { x: 69.4, y: 73.5, title: 'Réservations', text: 'Une MAC, une adresse, un nom : la réservation est aussi visible dans l\'IPAM.' },
      { x: 91.9, y: 58.2, title: 'Ajouter une réservation', text: 'L\'adresse proposée est libre dans l\'IPAM et hors des plages dynamiques.' },
      { x: 65.6, y: 22.1, title: 'Baux', text: 'Les baux en cours, avec le nom annoncé par la machine.' },
      { x: 91, y: 22.1, title: 'Valider et déployer', text: 'La configuration Kea est testée (kea-dhcp4 -t) avant d\'être appliquée.' },
    ],
  },
  {
    id: 'radius', title: 'Écrire une règle d\'accès Wi‑Fi', summary: 'Qui entre sur quel VLAN, lu de haut en bas.', image: IMG.radius,
    steps: [
      { x: 14.9, y: 38.4, title: 'Une règle lisible', text: 'Postes du domaine vers le VLAN des postes : la règle se lit comme une phrase.' },
      { x: 14, y: 43, title: 'Qui et où', text: 'Type de compte (machine ou utilisateur), groupe Active Directory, groupes imbriqués compris, et client RADIUS (borne, VPN, commutateur).' },
      { x: 7.7, y: 47.7, title: 'Le VLAN attribué', text: 'Le VLAN est renvoyé à l\'équipement avec l\'acceptation.' },
      { x: 90.5, y: 38.4, title: 'L\'ordre compte', text: 'Les règles sont jouées de haut en bas ; la première qui correspond décide. Une simulation montre laquelle s\'applique avant tout déploiement.' },
      { x: 11.6, y: 80, title: 'Refus par défaut', text: 'Ce qui ne correspond à aucune règle est refusé.' },
      { x: 69.4, y: 6.1, title: 'Second facteur', text: 'Un second facteur peut être exigé par client RADIUS, par exemple pour le VPN.' },
      { x: 93, y: 6.1, title: 'Import NPS', text: 'Les clients et stratégies d\'un NPS existant se reprennent en un plan à valider.' },
    ],
  },
]

const en: TourScenario[] = [
  {
    id: 'adresse', title: 'Allocate an address', summary: 'From IPAM to DNS and DHCP, in one action.', image: IMG.ipam,
    steps: [
      { x: 38, y: 10.2, title: 'The address list', text: 'Every address of an IP space, filterable by network, status or label. Gateways show up on their own.' },
      { x: 73.5, y: 19, title: 'Next free address', text: 'The console suggests the first free address of the network, never a gateway or a DHCP router.' },
      { x: 67.8, y: 19, title: 'Add', text: 'On save, IPAM creates the DNS record (A and PTR) and, with a MAC address, the DHCP reservation, in the same transaction.' },
      { x: 27.4, y: 32, title: 'Status and MAC', text: 'In use, DHCP reservation, gateway: each row says what the address really is, with its MAC.' },
      { x: 59, y: 44.7, title: 'DNS aliases', text: 'Aliases (CNAME) follow the address: renaming or releasing it updates DNS.' },
      { x: 81, y: 19, title: 'Export', text: 'The current view exports to CSV, filters included.' },
    ],
  },
  {
    id: 'dns', title: 'Manage a DNS zone', summary: 'Records, protection, history and validated deployment.', image: IMG.dns,
    steps: [
      { x: 39.2, y: 13.3, title: 'Records', text: 'Records of every zone, with type, TTL and value.' },
      { x: 92.7, y: 24.8, title: 'Add a record', text: 'A, AAAA, CNAME, MX, TXT, SRV… The value is checked as you type.' },
      { x: 70.8, y: 33.9, title: 'Protection', text: 'A protected record can only be changed with administrator rights: useful for critical names.' },
      { x: 61.1, y: 13.3, title: 'History', text: 'Every change is kept; a previous state is restored in one click.' },
      { x: 92, y: 13.3, title: 'Validate and deploy', text: 'BIND files are checked with the official tools before being applied, with automatic rollback on failure.' },
    ],
  },
  {
    id: 'dhcp', title: 'Reserve a DHCP address', summary: 'Ranges, reservations and leases of a network.', image: IMG.dhcp,
    steps: [
      { x: 26.3, y: 32.2, title: 'Pick the network', text: 'Networks come from IPAM: nothing is typed twice between IPAM and DHCP.' },
      { x: 29.2, y: 73.5, title: 'Address ranges', text: 'The dynamically served ranges. Exclusions from a Windows export become split ranges.' },
      { x: 69.4, y: 73.5, title: 'Reservations', text: 'A MAC, an address, a name: the reservation also shows in IPAM.' },
      { x: 91.9, y: 58.2, title: 'Add a reservation', text: 'The suggested address is free in IPAM and outside the dynamic ranges.' },
      { x: 65.6, y: 22.1, title: 'Leases', text: 'Current leases, with the name announced by the machine.' },
      { x: 91, y: 22.1, title: 'Validate and deploy', text: 'The Kea configuration is tested (kea-dhcp4 -t) before being applied.' },
    ],
  },
  {
    id: 'radius', title: 'Write a Wi‑Fi access rule', summary: 'Who goes on which VLAN, read top to bottom.', image: IMG.radius,
    steps: [
      { x: 14.9, y: 38.4, title: 'A readable rule', text: 'Domain workstations to the workstation VLAN: the rule reads like a sentence.' },
      { x: 14, y: 43, title: 'Who and where', text: 'Account type (machine or user), Active Directory group, nested groups included, and RADIUS client (access point, VPN, switch).' },
      { x: 7.7, y: 47.7, title: 'The assigned VLAN', text: 'The VLAN is returned to the device with the acceptance.' },
      { x: 90.5, y: 38.4, title: 'Order matters', text: 'Rules are played top to bottom; the first match decides. A simulation shows which one applies before any deployment.' },
      { x: 11.6, y: 80, title: 'Deny by default', text: 'Anything that matches no rule is denied.' },
      { x: 69.4, y: 6.1, title: 'Second factor', text: 'A second factor can be required per RADIUS client, for the VPN for example.' },
      { x: 93, y: 6.1, title: 'NPS import', text: 'Clients and policies of an existing NPS are brought over as a plan to approve.' },
    ],
  },
]

export const TOUR = { fr, en } as const

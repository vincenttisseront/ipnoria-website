// Checklist avant installation, tirée de la documentation du produit (INSTALL, ARCHITECTURE, ARCHITECTURE-CLUSTER).
// `cluster: true` : à cocher seulement pour un cluster.
export interface CheckItem { id: string, title: string, text: string, cluster?: boolean }
export interface CheckGroup { id: string, title: string, items: CheckItem[] }

const fr: CheckGroup[] = [
  { id: 'vm', title: 'Machine', items: [
    { id: 'vm-size', title: 'Machine virtuelle prête', text: '2 vCPU, 4 Go de mémoire, 40 Go de disque au minimum (voir l\'outil de dimensionnement au-delà de 2 000 appareils).' },
    { id: 'vm-iso', title: 'ISO accessible', text: 'ISO téléversée dans le datastore ou la bibliothèque de l\'hyperviseur ; démarrage BIOS ou UEFI.' },
    { id: 'vm-disk', title: 'Disque cible vide', text: 'L\'installation automatique efface le disque cible : aucune donnée à conserver dessus.' },
    { id: 'vm-nic', title: 'Carte réseau sur le bon réseau', text: 'VMXNET 3 sous VMware ; le réseau de service de l\'appliance.' },
  ] },
  { id: 'net', title: 'Réseau', items: [
    { id: 'net-ip', title: 'Adresse fixe réservée', text: 'Adresse, masque, passerelle de l\'appliance, hors de toute plage DHCP.' },
    { id: 'net-name', title: 'Nom de l\'appliance', text: 'Nom DNS complet (ex. ddi1.exemple.lan), utilisé pour la console et son certificat.' },
    { id: 'net-forwarders', title: 'Redirecteurs DNS', text: 'Serveurs DNS amont pour la résolution d\'Internet, et zones AD à rediriger le cas échéant.' },
    { id: 'net-admin', title: 'Réseaux d\'administration', text: 'Réseaux autorisés à joindre SSH (22) et la console (443). Demandés au premier démarrage.' },
    { id: 'net-ntp', title: 'Heure fiable', text: 'Source NTP joignable : Kerberos, certificats et cluster en dépendent.' },
  ] },
  { id: 'fw', title: 'Pare-feu', items: [
    { id: 'fw-dns', title: 'DNS : 53 TCP et UDP', text: 'Ouvert depuis les clients vers l\'appliance.' },
    { id: 'fw-dhcp', title: 'DHCP : 67 UDP', text: 'Depuis les relais DHCP (ip helper-address) vers l\'appliance.' },
    { id: 'fw-admin', title: 'Administration : 22 et 443 TCP', text: 'Seulement depuis les réseaux d\'administration.' },
    { id: 'fw-radius', title: 'RADIUS : 1812 et 1813 UDP', text: 'Depuis les bornes Wi‑Fi, commutateurs et concentrateurs VPN déclarés.' },
    { id: 'fw-pki', title: 'PKI : 8080 TCP', text: 'Publication des CRL et des certificats d\'autorité, depuis les réseaux qui vérifient les certificats.' },
    { id: 'fw-cluster', title: 'Entre nœuds du cluster', text: 'TCP 2379, 2380 (etcd), 5432 (PostgreSQL), 8000 (Kea HA), 8008 (Patroni) et protocole IP 112 (VRRP).', cluster: true },
  ] },
  { id: 'cluster', title: 'Cluster', items: [
    { id: 'cl-three', title: 'Trois machines', text: 'Deux nœuds de données et un arbitre. Sans arbitre, un cluster à deux nœuds ne tolère aucune panne.', cluster: true },
    { id: 'cl-net', title: 'Réseau dédié', text: 'Un réseau pour la réplication et la haute disponibilité, entre les trois machines.', cluster: true },
    { id: 'cl-vip', title: 'Adresse virtuelle', text: 'Une adresse libre pour le service, qui suit le nœud leader ; VRRP autorisé par les commutateurs.', cluster: true },
    { id: 'cl-relays', title: 'Relais DHCP vers les deux nœuds', text: 'Les relais listent les deux adresses réelles des nœuds de données : le DHCP ne passe pas par l\'adresse virtuelle.', cluster: true },
  ] },
  { id: 'ad', title: 'Active Directory', items: [
    { id: 'ad-ldaps', title: 'LDAPS sur les contrôleurs', text: 'Les contrôleurs de domaine répondent en LDAPS (636) ; certificat de leur autorité disponible.' },
    { id: 'ad-account', title: 'Compte de service en lecture', text: 'Compte dédié, lecture seule, pour l\'annuaire (règles RADIUS, connexion à la console).' },
    { id: 'ad-groups', title: 'Groupes de sécurité', text: 'Groupes qui donneront accès à la console et aux réseaux (Wi‑Fi, VPN).' },
  ] },
  { id: 'migration', title: 'Reprise de l\'existant', items: [
    { id: 'mig-dhcp', title: 'Export DHCP Windows', text: 'Export-DhcpServer, et l\'export des baux si les clients doivent garder leur adresse.' },
    { id: 'mig-dns', title: 'Zones DNS', text: 'Zones primaires exportées, ou transfert de zone autorisé vers l\'appliance.' },
    { id: 'mig-nps', title: 'Export NPS', text: 'netsh nps export, si un NPS est remplacé (fichier à supprimer après l\'import).' },
    { id: 'mig-window', title: 'Fenêtre de bascule', text: 'Date de bascule, TTL DNS abaissés la veille, retour arrière préparé.' },
  ] },
]

const en: CheckGroup[] = [
  { id: 'vm', title: 'Machine', items: [
    { id: 'vm-size', title: 'Virtual machine ready', text: '2 vCPU, 4 GB of memory, 40 GB of disk at least (see the sizing tool beyond 2,000 devices).' },
    { id: 'vm-iso', title: 'ISO available', text: 'ISO uploaded to the hypervisor datastore or library; BIOS or UEFI boot.' },
    { id: 'vm-disk', title: 'Empty target disk', text: 'The automatic installation erases the target disk: nothing to keep on it.' },
    { id: 'vm-nic', title: 'Network card on the right network', text: 'VMXNET 3 on VMware; the appliance\'s service network.' },
  ] },
  { id: 'net', title: 'Network', items: [
    { id: 'net-ip', title: 'Fixed address reserved', text: 'Address, mask, gateway of the appliance, outside any DHCP range.' },
    { id: 'net-name', title: 'Appliance name', text: 'Fully qualified DNS name (e.g. ddi1.example.lan), used for the console and its certificate.' },
    { id: 'net-forwarders', title: 'DNS forwarders', text: 'Upstream DNS servers for Internet resolution, and AD zones to forward if needed.' },
    { id: 'net-admin', title: 'Administration networks', text: 'Networks allowed to reach SSH (22) and the console (443). Asked on first boot.' },
    { id: 'net-ntp', title: 'Reliable time', text: 'Reachable NTP source: Kerberos, certificates and the cluster depend on it.' },
  ] },
  { id: 'fw', title: 'Firewall', items: [
    { id: 'fw-dns', title: 'DNS: 53 TCP and UDP', text: 'Open from clients to the appliance.' },
    { id: 'fw-dhcp', title: 'DHCP: 67 UDP', text: 'From DHCP relays (ip helper-address) to the appliance.' },
    { id: 'fw-admin', title: 'Administration: 22 and 443 TCP', text: 'Only from administration networks.' },
    { id: 'fw-radius', title: 'RADIUS: 1812 and 1813 UDP', text: 'From declared Wi‑Fi access points, switches and VPN concentrators.' },
    { id: 'fw-pki', title: 'PKI: 8080 TCP', text: 'Publication of CRLs and CA certificates, from networks that check certificates.' },
    { id: 'fw-cluster', title: 'Between cluster nodes', text: 'TCP 2379, 2380 (etcd), 5432 (PostgreSQL), 8000 (Kea HA), 8008 (Patroni) and IP protocol 112 (VRRP).', cluster: true },
  ] },
  { id: 'cluster', title: 'Cluster', items: [
    { id: 'cl-three', title: 'Three machines', text: 'Two data nodes and a witness. Without a witness, a two-node cluster tolerates no failure.', cluster: true },
    { id: 'cl-net', title: 'Dedicated network', text: 'A network for replication and high availability, between the three machines.', cluster: true },
    { id: 'cl-vip', title: 'Virtual address', text: 'A free address for the service, which follows the leader node; VRRP allowed by the switches.', cluster: true },
    { id: 'cl-relays', title: 'DHCP relays to both nodes', text: 'Relays list the real addresses of both data nodes: DHCP does not go through the virtual address.', cluster: true },
  ] },
  { id: 'ad', title: 'Active Directory', items: [
    { id: 'ad-ldaps', title: 'LDAPS on domain controllers', text: 'Domain controllers answer LDAPS (636); their CA certificate is available.' },
    { id: 'ad-account', title: 'Read-only service account', text: 'Dedicated read-only account for the directory (RADIUS rules, console sign-in).' },
    { id: 'ad-groups', title: 'Security groups', text: 'Groups that will grant access to the console and to networks (Wi‑Fi, VPN).' },
  ] },
  { id: 'migration', title: 'Bringing over what exists', items: [
    { id: 'mig-dhcp', title: 'Windows DHCP export', text: 'Export-DhcpServer, and the lease export if clients must keep their address.' },
    { id: 'mig-dns', title: 'DNS zones', text: 'Primary zones exported, or zone transfer allowed to the appliance.' },
    { id: 'mig-nps', title: 'NPS export', text: 'netsh nps export, if an NPS is replaced (delete the file after import).' },
    { id: 'mig-window', title: 'Switchover window', text: 'Switchover date, DNS TTLs lowered the day before, rollback prepared.' },
  ] },
]

export const CHECKLIST = { fr, en } as const

// Feuille de route publique : capacités à venir (reprises de docs/ROADMAP.md du produit), soumises aux votes.
// L'identifiant est stable (il sert de clé aux votes) ; le texte peut évoluer.
export interface RoadmapItem { id: string, status: 'study' | 'planned', title: { fr: string, en: string }, text: { fr: string, en: string } }

export const ROADMAP: RoadmapItem[] = [
  { id: 'dnssec', status: 'study', title: { fr: 'DNSSEC géré', en: 'Managed DNSSEC' }, text: { fr: 'Signature des zones, rotation des clés, suivi des DS chez le parent, alerte avant expiration.', en: 'Zone signing, key rollover, DS tracking at the parent, alert before expiry.' } },
  { id: 'dns-scheduler', status: 'study', title: { fr: 'Changements DNS planifiés', en: 'Scheduled DNS changes' }, text: { fr: 'Créer, modifier ou supprimer un enregistrement à une date donnée, avec retour arrière automatique.', en: 'Create, change or delete a record at a given time, with automatic rollback.' } },
  { id: 'health-probes', status: 'study', title: { fr: 'Sondes de services', en: 'Service probes' }, text: { fr: 'Sondes TCP, HTTP et ICMP sur les noms, bascule vers une adresse de secours.', en: 'TCP, HTTP and ICMP probes on names, failover to a backup address.' } },
  { id: 'drift', status: 'study', title: { fr: 'Dérive de configuration', en: 'Configuration drift' }, text: { fr: 'Comparer l\'état voulu dans la console et l\'état servi par BIND et Kea, alerter, resynchroniser.', en: 'Compare the desired state in the console with what BIND and Kea serve, alert, resync.' } },
  { id: 'reports', status: 'study', title: { fr: 'Rapports planifiés', en: 'Scheduled reports' }, text: { fr: 'Inventaire, occupation des réseaux, alertes et zones sans propriétaire, envoyés par e-mail en PDF.', en: 'Inventory, network occupancy, alerts and ownerless zones, emailed as PDF.' } },
  { id: 'lifecycle', status: 'study', title: { fr: 'Propriétaires et cycle de vie', en: 'Owners and lifecycle' }, text: { fr: 'Propriétaire, expiration et revue périodique des adresses ; libération des adresses abandonnées.', en: 'Owner, expiry and periodic review of addresses; release of abandoned addresses.' } },
  { id: 'map', status: 'study', title: { fr: 'Carte du réseau', en: 'Network map' }, text: { fr: 'Vue graphique des espaces, réseaux, VLAN, zones et serveurs ; parcours depuis une adresse.', en: 'Graphical view of spaces, networks, VLANs, zones and servers; walk from an address.' } },
  { id: 'dns-hygiene', status: 'study', title: { fr: 'Contrôles de sécurité DNS', en: 'DNS security checks' }, text: { fr: 'Sous-domaines pendants, jokers involontaires, SPF et DMARC absents.', en: 'Dangling subdomains, unintended wildcards, missing SPF and DMARC.' } },
  { id: 'iac', status: 'study', title: { fr: 'Terraform et Ansible', en: 'Terraform and Ansible' }, text: { fr: 'Fournisseur Terraform et module Ansible sur l\'API, jetons à portée limitée.', en: 'Terraform provider and Ansible module on the API, scoped tokens.' } },
  { id: 'four-eyes', status: 'study', title: { fr: 'Validation à deux', en: 'Four-eyes approval' }, text: { fr: 'Les changements sensibles attendent l\'accord d\'un second administrateur.', en: 'Sensitive changes wait for a second administrator\'s approval.' } },
  { id: 'dhcpv6', status: 'study', title: { fr: 'DHCPv6 et DNS dynamique IPv6', en: 'DHCPv6 and IPv6 dynamic DNS' }, text: { fr: 'Baux DHCPv6, mises à jour dynamiques signées, droits par client.', en: 'DHCPv6 leases, signed dynamic updates, per-client rights.' } },
  { id: 'user-trace', status: 'study', title: { fr: 'Qui était derrière cette adresse', en: 'Who was behind this address' }, text: { fr: 'Relier bail, MAC, nom et utilisateur Active Directory à un instant donné.', en: 'Link lease, MAC, name and Active Directory user at a given time.' } },
]

export const roadmapItem = (id: string) => ROADMAP.find(i => i.id === id)

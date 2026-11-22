// Articles techniques : réponses aux questions que se posent les équipes avant de choisir ou de migrer.
// Adresse traduite par langue (slug.fr / slug.en), sections en paragraphes, liens vers guides, outils et glossaire.
export interface Article {
  id: string
  slug: { fr: string, en: string }
  date: string
  minutes: number
  title: Record<'fr' | 'en', string>
  description: Record<'fr' | 'en', string>
  sections: Record<'fr' | 'en', Array<{ h: string, p: string[] }>>
  related: { glossary: string[], links: Array<{ name: string, params?: Record<string, string>, label: Record<'fr' | 'en', string> }> }
}

export const ARTICLES: Article[] = [
  {
    id: 'ddi',
    slug: { fr: 'qu-est-ce-qu-une-solution-ddi', en: 'what-is-ddi' },
    date: '2026-11-20',
    minutes: 5,
    title: { fr: 'Qu\'est-ce qu\'une solution DDI, et quand en avoir besoin ?', en: 'What is DDI, and when do you need it?' },
    description: {
      fr: 'DNS, DHCP et IPAM séparés finissent toujours par se contredire. Les signes qui montrent qu\'il est temps de les réunir, et ce qu\'il faut attendre d\'une solution DDI.',
      en: 'Separate DNS, DHCP and IPAM always end up contradicting each other. The signs it\'s time to bring them together, and what to expect from a DDI solution.',
    },
    sections: {
      fr: [
        { h: 'Trois services, une seule source de vérité', p: ['Le DHCP distribue les adresses, le DNS leur donne un nom, l\'IPAM tient l\'inventaire. Dans la plupart des organisations, ces trois services vivent séparément : deux consoles Windows et un tableur partagé, ou des fichiers de configuration modifiés à la main.', 'Le problème n\'est pas chaque outil pris isolément, mais l\'écart entre eux. Une adresse attribuée n\'a pas de nom, un nom pointe vers une adresse libérée depuis des mois, la zone inverse est à moitié vide. Personne ne peut dire avec certitude qui utilise 10.20.30.42.'] },
        { h: 'Les signes qui ne trompent pas', p: ['Le tableur des adresses n\'est jamais à jour, et chaque nouveau serveur commence par un ping pour vérifier qu\'une adresse est libre. Les conflits d\'adresses arrivent après chaque intervention. Les noms DNS des machines supprimées restent en place. Il faut une demi-journée pour répondre à une question d\'audit sur un réseau.', 'Un autre signe : la dépendance à une seule personne qui « sait comment c\'est configuré ». Le jour où elle est absente, une modification de zone DNS devient un risque.'] },
        { h: 'Ce que change une solution DDI', p: ['Une solution DDI réunit les trois services autour d\'une base commune. Allouer une adresse crée le nom DNS, l\'enregistrement inverse et, si besoin, la réservation DHCP, en une seule action tracée. Libérer l\'adresse retire le tout.', 'Le gain est double : moins d\'erreurs, et un historique qui répond aux questions « qui a changé quoi, quand et pourquoi ». Les bonnes solutions vérifient aussi chaque modification avant de la publier, pour qu\'une faute de frappe ne rende pas une zone entière muette.'] },
        { h: 'Ce qu\'il faut regarder avant de choisir', p: ['La reprise de l\'existant d\'abord : importer les étendues et réservations DHCP, les zones DNS et les baux en cours, sans tout ressaisir. Puis la haute disponibilité : DNS et DHCP en panne, c\'est tout le réseau qui s\'arrête. Enfin, ce qui entoure le DDI : contrôle d\'accès 802.1X, certificats, filtrage DNS.', 'Ipnoria réunit ces briques dans une appliance libre. Pour vous faire une idée, la visite guidée montre l\'allocation d\'une adresse de bout en bout, et l\'aperçu d\'import montre ce que deviendrait votre DHCP Windows.'] },
      ],
      en: [
        { h: 'Three services, one source of truth', p: ['DHCP hands out addresses, DNS gives them names, IPAM keeps the inventory. In most organizations, the three live apart: two Windows consoles and a shared spreadsheet, or configuration files edited by hand.', 'The problem isn\'t each tool on its own but the gap between them. An assigned address has no name, a name points to an address released months ago, the reverse zone is half empty. Nobody can say for sure who uses 10.20.30.42.'] },
        { h: 'Telltale signs', p: ['The address spreadsheet is never up to date, and every new server starts with a ping to check an address is free. Address conflicts show up after every change. DNS names of deleted machines stay in place. Answering an audit question about a network takes half a day.', 'Another sign: depending on the one person who “knows how it\'s set up”. The day they\'re away, a DNS zone change becomes a risk.'] },
        { h: 'What a DDI solution changes', p: ['A DDI solution brings the three services around a shared database. Allocating an address creates the DNS name, the reverse record and, if needed, the DHCP reservation, in a single logged action. Releasing the address removes all of it.', 'The gain is twofold: fewer mistakes, and a history that answers “who changed what, when and why”. Good solutions also check every change before publishing it, so a typo doesn\'t silence a whole zone.'] },
        { h: 'What to look at before choosing', p: ['Migration first: importing DHCP scopes and reservations, DNS zones and current leases without retyping everything. Then high availability: when DNS and DHCP fail, the whole network stops. Finally, what surrounds DDI: 802.1X access control, certificates, DNS filtering.', 'Ipnoria brings these pieces together in a free software appliance. To get a feel for it, the guided tour shows allocating an address end to end, and the import preview shows what your Windows DHCP would become.'] },
      ],
    },
    related: { glossary: ['ddi', 'ipam', 'ptr', 'haute-disponibilite'], links: [{ name: 'visite', label: { fr: 'Visite guidée', en: 'Guided tour' } }, { name: 'outils-import-dhcp', label: { fr: 'Aperçu de l\'import DHCP', en: 'DHCP import preview' } }] },
  },
  {
    id: 'dhcp-windows-linux',
    slug: { fr: 'remplacer-un-dhcp-windows-par-linux', en: 'replace-windows-dhcp-with-linux' },
    date: '2026-11-21',
    minutes: 6,
    title: { fr: 'Remplacer un DHCP Windows Server par Linux : méthode et pièges', en: 'Replacing a Windows Server DHCP with Linux: method and pitfalls' },
    description: {
      fr: 'Inventaire, export, reprise des baux, coexistence puis bascule : comment quitter un DHCP Windows sans coupure, et les cinq pièges qui font échouer une migration.',
      en: 'Inventory, export, lease takeover, coexistence then switchover: how to leave a Windows DHCP without downtime, and the five pitfalls that make a migration fail.',
    },
    sections: {
      fr: [
        { h: 'Pourquoi migrer maintenant', p: ['Fin de support d\'une version de Windows Server, coût des licences et des CAL, envie de réunir DHCP, DNS et inventaire : les raisons varient, la crainte est la même. Le DHCP est invisible tant qu\'il marche, et une erreur se voit tout de suite, sur tous les postes.', 'Bonne nouvelle : c\'est l\'un des services les plus simples à migrer proprement, à condition de suivre l\'ordre et de ne rien laisser au hasard.'] },
        { h: 'La méthode en quatre temps', p: ['D\'abord l\'inventaire : étendues, réservations, options, stratégies, basculement existant. Ensuite l\'export complet du serveur (Export-DhcpServer) et son import, en vérifiant ce qui sera créé. Puis la reprise des baux actifs, pour que chaque poste retrouve son adresse.', 'Vient alors la coexistence : le nouveau serveur est prêt mais pas encore annoncé. La bascule consiste à pointer les relais DHCP vers lui, réseau par réseau, et à désactiver les étendues côté Windows. Le retour arrière reste possible tant que l\'ancien serveur n\'est pas éteint.'] },
        { h: 'Cinq pièges classiques', p: ['Les stratégies et classes DHCP Windows n\'ont pas d\'équivalent direct : elles se recréent à la main, d\'où l\'intérêt de les lister avant. Les options propriétaires (252 pour WPAD, options de fournisseurs) sont souvent oubliées. Deux serveurs actifs sur la même étendue distribuent des adresses en double : désactivez avant d\'activer.', 'Les relais DHCP, eux, sont dans les routeurs et les commutateurs, pas sur le serveur : listez-les tous. Enfin, la durée des baux : réduisez-la quelques jours avant la bascule, pour que les postes renouvellent vite et prennent en compte le nouveau serveur.'] },
        { h: 'Tester avant de toucher à la production', p: ['L\'aperçu de l\'import DHCP lit votre export dans le navigateur, sans l\'envoyer, et montre ce qu\'Ipnoria créerait et ce qu\'il faudra reprendre à la main. Le guide de migration détaille chaque commande, la coexistence et le retour arrière.'] },
      ],
      en: [
        { h: 'Why migrate now', p: ['A Windows Server version reaching end of support, license and CAL costs, the wish to bring DHCP, DNS and inventory together: the reasons vary, the fear is the same. DHCP is invisible while it works, and a mistake shows up immediately, on every device.', 'Good news: it\'s one of the simplest services to migrate cleanly, as long as you follow the order and leave nothing to chance.'] },
        { h: 'The method in four steps', p: ['First the inventory: scopes, reservations, options, policies, existing failover. Then the full server export (Export-DhcpServer) and its import, checking what will be created. Then the takeover of active leases, so every device gets its address back.', 'Next comes coexistence: the new server is ready but not announced yet. Switching over means pointing DHCP relays to it, network by network, and disabling scopes on the Windows side. Rolling back stays possible as long as the old server is still running.'] },
        { h: 'Five classic pitfalls', p: ['Windows DHCP policies and classes have no direct equivalent: they are recreated by hand, which is why you list them first. Vendor-specific options (252 for WPAD, vendor options) are often forgotten. Two servers active on the same scope hand out duplicate addresses: disable before you enable.', 'DHCP relays live in routers and switches, not on the server: list them all. Finally, lease duration: shorten it a few days before switching, so devices renew quickly and pick up the new server.'] },
        { h: 'Test before touching production', p: ['The DHCP import preview reads your export in the browser, without sending it, and shows what Ipnoria would create and what will need redoing by hand. The migration guide details every command, coexistence and rollback.'] },
      ],
    },
    related: { glossary: ['dhcp', 'relais-dhcp', 'ddns'], links: [{ name: 'guides-slug', params: { slug: 'dhcp-windows' }, label: { fr: 'Guide : migrer un DHCP Windows', en: 'Guide: migrate a Windows DHCP' } }, { name: 'outils-import-dhcp', label: { fr: 'Aperçu de l\'import DHCP', en: 'DHCP import preview' } }] },
  },
  {
    id: 'eap-tls',
    slug: { fr: 'wifi-8021x-eap-tls-sans-ad-cs-ni-nps', en: '8021x-wifi-eap-tls-without-ad-cs-or-nps' },
    date: '2026-11-22',
    minutes: 6,
    title: { fr: 'Wi‑Fi 802.1X en EAP-TLS sans AD CS ni NPS', en: '802.1X Wi‑Fi with EAP-TLS without AD CS or NPS' },
    description: {
      fr: 'L\'authentification par certificat est la plus sûre pour le Wi‑Fi d\'entreprise. Comment la mettre en place sans les rôles Windows habituels, et comment passer d\'un mot de passe partagé à un certificat par poste.',
      en: 'Certificate authentication is the safest choice for enterprise Wi‑Fi. How to set it up without the usual Windows roles, and how to move from a shared password to one certificate per device.',
    },
    sections: {
      fr: [
        { h: 'Pourquoi EAP-TLS', p: ['Un Wi‑Fi protégé par une clé partagée, ou par identifiant et mot de passe (PEAP), reste exposé : la clé circule, les mots de passe se hameçonnent, un appareil perdu garde son accès. Avec EAP-TLS, chaque poste présente un certificat : rien à saisir, rien à voler, et la révocation coupe l\'accès d\'un appareil précis.', 'C\'est aussi la méthode recommandée par les guides de sécurité pour les réseaux d\'entreprise.'] },
        { h: 'Les trois pièces du puzzle', p: ['Il faut une autorité de certification qui émet un certificat à chaque poste, un serveur RADIUS qui vérifie ces certificats et décide du VLAN, et des bornes ou commutateurs configurés en 802.1X. Sous Windows, ce sont AD CS et NPS, deux rôles exigeants à maintenir.', 'Une appliance qui réunit PKI et RADIUS supprime l\'essentiel de cette complexité : la confiance entre les deux est établie d\'office, et les règles se lisent au même endroit.'] },
        { h: 'Distribuer les certificats', p: ['Pour les postes du domaine, les certificats peuvent être demandés automatiquement. Pour les téléphones, tablettes et postes hors domaine, SCEP permet à l\'outil de gestion de flotte de demander un certificat par appareil, avec un secret à usage unique.', 'Prévoyez le renouvellement dès le départ : un certificat expiré, c\'est un poste sans réseau un lundi matin.'] },
        { h: 'Migrer sans tout couper', p: ['Gardez le réseau Wi‑Fi actuel pendant la transition et ouvrez un nouveau SSID en 802.1X. Déployez les certificats par groupe, vérifiez avec la simulation d\'authentification, puis déplacez les utilisateurs. Une fois le dernier poste migré, l\'ancien réseau s\'éteint.', 'Si vous remplacez un NPS existant, le guide dédié explique comment reprendre clients RADIUS et stratégies depuis son export.'] },
      ],
      en: [
        { h: 'Why EAP-TLS', p: ['Wi‑Fi protected by a shared key, or by username and password (PEAP), stays exposed: the key gets around, passwords get phished, a lost device keeps its access. With EAP-TLS, each device presents a certificate: nothing to type, nothing to steal, and revocation cuts off one specific device.', 'It\'s also the method recommended by security guidance for enterprise networks.'] },
        { h: 'The three pieces of the puzzle', p: ['You need a certificate authority issuing a certificate to each device, a RADIUS server that checks those certificates and decides the VLAN, and access points or switches configured for 802.1X. On Windows, that\'s AD CS and NPS, two demanding roles to maintain.', 'An appliance bringing PKI and RADIUS together removes most of that complexity: trust between the two is set up from the start, and rules are read in one place.'] },
        { h: 'Distributing certificates', p: ['Domain-joined computers can request certificates automatically. For phones, tablets and non-domain devices, SCEP lets the device-management tool request one certificate per device, with a one-time secret.', 'Plan renewal from day one: an expired certificate means a device without network on a Monday morning.'] },
        { h: 'Migrating without cutting everything', p: ['Keep the current Wi‑Fi network during the transition and open a new 802.1X SSID. Roll out certificates group by group, check with the authentication simulation, then move users. Once the last device has moved, the old network goes off.', 'If you\'re replacing an existing NPS, the dedicated guide explains how to take over RADIUS clients and policies from its export.'] },
      ],
    },
    related: { glossary: ['eap-tls', '8021x', 'radius', 'pki', 'scep'], links: [{ name: 'guides-slug', params: { slug: 'nps' }, label: { fr: 'Guide : remplacer un NPS', en: 'Guide: replace an NPS' } }, { name: 'comparatif', label: { fr: 'Comparatif avec Windows Server', en: 'Comparison with Windows Server' } }] },
  },
]

export const articleBySlug = (l: 'fr' | 'en', slug: string) => ARTICLES.find(a => a.slug[l] === slug)

// Guides de migration : contenu tiré de la console Ipnoria (page Import / AD, onglet « Import NPS » de la page RADIUS).
// Les commandes sont celles que la console affiche elle-même ; aucune ne modifie le serveur Windows sauf mention contraire.
export interface GuideStep { title: string, text: string, code?: string, warn?: string }
export interface Guide { slug: string, title: string, summary: string, intro: string, steps: GuideStep[], outro: string }

const fr: Guide[] = [
  {
    slug: 'dhcp-windows',
    title: 'Migrer un DHCP Windows Server',
    summary: 'Reprendre étendues, réservations et baux, coexister sans coupure, puis basculer avec un retour arrière prêt.',
    intro: 'La reprise se fait sans toucher à la configuration Windows jusqu\'au jour de la bascule. Les clients gardent leur adresse : les baux actifs sont importés, puis tenus à jour pendant la coexistence.',
    steps: [
      { title: 'Faire l\'inventaire', text: 'Sur le serveur Windows (ou un poste avec les outils RSAT DNS et DHCP), en administrateur. Le script ne fait que lire : il produit la liste des étendues, des stratégies, des classes et du basculement DHCP existant.', code: 'Get-DhcpServerv4Scope | Select-Object ScopeId, Name, SubnetMask, StartRange, EndRange, LeaseDuration, State |\n  Export-Csv "$env:TEMP\\dhcp-scopes.csv" -NoTypeInformation -Encoding UTF8' },
      { title: 'Exporter la configuration DHCP', text: 'Étendues, plages, exclusions, réservations et options en un seul fichier XML.', code: 'Export-DhcpServer -ComputerName $env:COMPUTERNAME -File "$env:TEMP\\dhcp-export.xml" -Force' },
      { title: 'Importer dans la console', text: 'Dans Import / AD, onglet DHCP, déposez dhcp-export.xml. La console affiche ce qu\'elle va créer (réseaux IPAM, étendues, réservations) avant de l\'appliquer ; un point de restauration est pris avant l\'import.' },
      { title: 'Reprendre les baux actifs', text: 'Exportez les baux puis déposez le fichier à l\'étape DHCP : chaque client retrouvera son adresse après la bascule.', code: 'Get-DhcpServerv4Scope | ForEach-Object { Get-DhcpServerv4Lease -ScopeId $_.ScopeId } |\n  Select-Object IPAddress, ClientId, HostName, AddressState, @{ n = \'ExpiryUtc\'; e = { $_.LeaseExpiryTime.ToUniversalTime().ToString(\'s\') } } |\n  Export-Csv "$env:TEMP\\dhcp-leases.csv" -NoTypeInformation -Encoding UTF8' },
      { title: 'Coexister le temps qu\'il faut', text: 'Tant que Windows sert les clients, une tâche planifiée peut envoyer les baux à la console toutes les 5 minutes avec un jeton d\'API (rôle opérateur). Le script complet, avec épinglage du certificat de la console, est affiché dans la page Import / AD.' },
      { title: 'Basculer', text: 'Désactivez les étendues Windows (la liste est gardée pour le retour arrière), puis faites pointer les relais DHCP (ip helper-address) vers les adresses réelles des deux nœuds de données du cluster.', code: '$ids = Get-DhcpServerv4Scope | Where-Object State -eq \'Active\' | Select-Object -ExpandProperty ScopeId\n$ids | ForEach-Object { $_.IPAddressToString } | Out-File "$env:TEMP\\scopes-actives.txt"\n$ids | ForEach-Object { Set-DhcpServerv4Scope -ScopeId $_ -State InActive }', warn: 'Ce script modifie le serveur Windows.' },
      { title: 'Revenir en arrière si besoin', text: 'Réactivez les étendues listées à l\'étape précédente, puis remettez les relais DHCP sur Windows.', code: 'Get-Content "$env:TEMP\\scopes-actives.txt" | ForEach-Object { Set-DhcpServerv4Scope -ScopeId $_ -State Active }' },
      { title: 'Retirer le rôle Windows', text: 'Après une période d\'observation seulement : désautorisez le serveur dans Active Directory et arrêtez le service. C\'est réversible tant que le rôle n\'est pas désinstallé.', code: 'Remove-DhcpServerInDC -DnsName $env:COMPUTERNAME\nStop-Service DHCPServer; Set-Service DHCPServer -StartupType Disabled', warn: 'Ce script modifie le serveur Windows et Active Directory.' },
    ],
    outro: 'Le DNS se migre de la même façon depuis la même page : export des zones primaires au format fichier de zone, import zone par zone, et TTL abaissé à 300 s la veille de la bascule.',
  },
  {
    slug: 'nps',
    title: 'Remplacer un NPS',
    summary: 'Reprendre clients RADIUS et stratégies d\'un NPS, vérifier par simulation, puis déplacer bornes et VPN.',
    intro: 'La console lit l\'export du NPS et en tire un plan : clients RADIUS avec leur secret, règles d\'accès par groupe Active Directory. Rien n\'est créé tant que vous n\'avez pas validé ce plan.',
    steps: [
      { title: 'Exporter la configuration du NPS', text: 'En administrateur, sur le serveur NPS. netsh exige exportPSK=YES : les secrets partagés sont écrits en clair dans le fichier.', code: '$f = "$env:TEMP\\nps-export.xml"\nnetsh nps export filename="$f" exportPSK=YES', warn: 'Supprimez ce fichier dès l\'import terminé (Remove-Item $f).' },
      { title: 'Connecter l\'Active Directory', text: 'Les stratégies du NPS désignent des groupes par leur SID : la console les résout dans l\'annuaire connecté pour écrire des règles lisibles, groupes imbriqués compris.' },
      { title: 'Lire le plan d\'import', text: 'Page RADIUS, onglet Import NPS : déposez nps-export.xml. Pour chaque client, choisissez son usage (Wi‑Fi, VPN, commutateurs). Le plan liste les clients et les règles qui seront créés.' },
      { title: 'Valider', text: 'À la validation, les clients sont créés avec leur secret chiffré en base, et l\'import est inscrit au journal d\'audit. Si l\'export a changé entre l\'aperçu et la validation, la console refuse et demande de relire le plan.' },
      { title: 'Choisir les méthodes', text: 'EAP-TLS pour les postes du domaine (les certificats peuvent venir de la PKI intégrée, émis automatiquement), PEAP-MSCHAPv2 ou EAP-TTLS/PAP pour les postes hors domaine, et un second facteur par client RADIUS, par exemple pour le VPN.' },
      { title: 'Simuler avant de déployer', text: 'La simulation joue une demande d\'accès contre les règles, de haut en bas, et montre celle qui s\'applique. Vérifiez un compte de chaque profil avant de toucher aux équipements.' },
      { title: 'Déplacer bornes et VPN', text: 'Configurez les bornes Wi‑Fi, commutateurs et concentrateurs VPN avec l\'adresse virtuelle du cluster : le service RADIUS suit le leader. Gardez le NPS en secours le temps de la transition ; le journal des authentifications de la console montre qui passe déjà par elle.' },
    ],
    outro: 'Le NPS peut ensuite être arrêté. Si l\'AD CS ne servait qu\'au Wi‑Fi et au VPN, la PKI intégrée prend le relais : autorités publiées dans l\'AD, SCEP pour les équipements, certificats de postes émis automatiquement.',
  },
]

const en: Guide[] = [
  {
    slug: 'dhcp-windows',
    title: 'Migrate a Windows Server DHCP',
    summary: 'Bring over scopes, reservations and leases, run both side by side, then switch over with a rollback ready.',
    intro: 'Nothing changes on Windows until switchover day. Clients keep their address: active leases are imported, then kept up to date while both servers coexist.',
    steps: [
      { title: 'Take an inventory', text: 'On the Windows server (or a workstation with the RSAT DNS and DHCP tools), as an administrator. The script only reads: it lists scopes, policies, classes and any existing DHCP failover.', code: 'Get-DhcpServerv4Scope | Select-Object ScopeId, Name, SubnetMask, StartRange, EndRange, LeaseDuration, State |\n  Export-Csv "$env:TEMP\\dhcp-scopes.csv" -NoTypeInformation -Encoding UTF8' },
      { title: 'Export the DHCP configuration', text: 'Scopes, ranges, exclusions, reservations and options in a single XML file.', code: 'Export-DhcpServer -ComputerName $env:COMPUTERNAME -File "$env:TEMP\\dhcp-export.xml" -Force' },
      { title: 'Import into the console', text: 'In Import / AD, DHCP tab, drop dhcp-export.xml. The console shows what it will create (IPAM networks, scopes, reservations) before applying it, and takes a restore point first.' },
      { title: 'Bring over active leases', text: 'Export the leases and drop the file in the DHCP step: every client gets its address back after switchover.', code: 'Get-DhcpServerv4Scope | ForEach-Object { Get-DhcpServerv4Lease -ScopeId $_.ScopeId } |\n  Select-Object IPAddress, ClientId, HostName, AddressState, @{ n = \'ExpiryUtc\'; e = { $_.LeaseExpiryTime.ToUniversalTime().ToString(\'s\') } } |\n  Export-Csv "$env:TEMP\\dhcp-leases.csv" -NoTypeInformation -Encoding UTF8' },
      { title: 'Coexist as long as needed', text: 'While Windows still serves clients, a scheduled task can push leases to the console every 5 minutes with an API token (operator role). The full script, with console certificate pinning, is shown on the Import / AD page.' },
      { title: 'Switch over', text: 'Disable the Windows scopes (the list is kept for rollback), then point the DHCP relays (ip helper-address) to the real addresses of both cluster data nodes.', code: '$ids = Get-DhcpServerv4Scope | Where-Object State -eq \'Active\' | Select-Object -ExpandProperty ScopeId\n$ids | ForEach-Object { $_.IPAddressToString } | Out-File "$env:TEMP\\scopes-actives.txt"\n$ids | ForEach-Object { Set-DhcpServerv4Scope -ScopeId $_ -State InActive }', warn: 'This script changes the Windows server.' },
      { title: 'Roll back if needed', text: 'Re-enable the scopes listed in the previous step, then point the DHCP relays back to Windows.', code: 'Get-Content "$env:TEMP\\scopes-actives.txt" | ForEach-Object { Set-DhcpServerv4Scope -ScopeId $_ -State Active }' },
      { title: 'Retire the Windows role', text: 'Only after an observation period: unauthorize the server in Active Directory and stop the service. This stays reversible until the role is uninstalled.', code: 'Remove-DhcpServerInDC -DnsName $env:COMPUTERNAME\nStop-Service DHCPServer; Set-Service DHCPServer -StartupType Disabled', warn: 'This script changes the Windows server and Active Directory.' },
    ],
    outro: 'DNS migrates the same way from the same page: export primary zones as zone files, import them one by one, and lower the TTL to 300 s the day before switchover.',
  },
  {
    slug: 'nps',
    title: 'Replace an NPS',
    summary: 'Bring over an NPS\'s RADIUS clients and policies, check them by simulation, then move access points and VPN.',
    intro: 'The console reads the NPS export and builds a plan from it: RADIUS clients with their secret, access rules by Active Directory group. Nothing is created until you approve that plan.',
    steps: [
      { title: 'Export the NPS configuration', text: 'As an administrator, on the NPS server. netsh requires exportPSK=YES: shared secrets are written in clear text in the file.', code: '$f = "$env:TEMP\\nps-export.xml"\nnetsh nps export filename="$f" exportPSK=YES', warn: 'Delete this file as soon as the import is done (Remove-Item $f).' },
      { title: 'Connect Active Directory', text: 'NPS policies refer to groups by SID: the console resolves them in the connected directory to write readable rules, nested groups included.' },
      { title: 'Read the import plan', text: 'RADIUS page, Import NPS tab: drop nps-export.xml. For each client, choose its use (Wi‑Fi, VPN, switches). The plan lists the clients and rules that will be created.' },
      { title: 'Approve', text: 'On approval, clients are created with their secret encrypted in the database, and the import is written to the audit log. If the export changed between preview and approval, the console refuses and asks you to read the plan again.' },
      { title: 'Choose the methods', text: 'EAP-TLS for domain workstations (certificates can come from the built-in PKI, issued automatically), PEAP-MSCHAPv2 or EAP-TTLS/PAP for machines outside the domain, and a second factor per RADIUS client, for the VPN for example.' },
      { title: 'Simulate before deploying', text: 'The simulation plays an access request against the rules, top to bottom, and shows which one applies. Check one account of each profile before touching any device.' },
      { title: 'Move access points and VPN', text: 'Configure Wi‑Fi access points, switches and VPN concentrators with the cluster\'s virtual address: the RADIUS service follows the leader. Keep the NPS as a fallback during the transition; the console\'s authentication log shows who already goes through it.' },
    ],
    outro: 'The NPS can then be shut down. If AD CS only served Wi‑Fi and VPN, the built-in PKI takes over: authorities published in AD, SCEP for devices, workstation certificates issued automatically.',
  },
]

export const GUIDES = { fr, en } as const
export const guideBySlug = (locale: 'fr' | 'en', slug: string) => GUIDES[locale].find(g => g.slug === slug)

---
name: ui-ux-moderne
description: Règles de design et d'UX du site vitrine Ipnoria (style « produit sombre »). À suivre pour toute page, composant ou retouche visuelle du site.
---

# Design et UX du site Ipnoria

Le site présente un produit d'infrastructure à des administrateurs systèmes et réseau. Il doit avoir l'allure d'un produit logiciel sérieux et récent (familles Linear, Tailscale, Vercel), pas d'un gabarit généré. Le produit se montre : captures réelles, démonstration interactive, commandes exactes.

## Jetons (app/assets/css/main.css, bloc @theme)

| Jeton | Valeur | Usage |
|---|---|---|
| `bg` | `#07090f` | fond de page |
| `surface` | `#0d111a` | panneaux (`.panel`) |
| `raised` | `#141a28` | onglet actif, élément au-dessus d'un panneau |
| `line` / `line-strong` | blanc 8 % / 16 % | bordures, séparateurs |
| `fg` / `muted` | `#edf0f7` / `#9aa3b8` | texte ; `muted` garde un contraste ≥ 7:1 |
| `accent` | `#5b8cff` | actions, focus, données mises en avant — jamais en aplat décoratif |
| `ok` / `warn` / `alert` | vert / ambre / rouge | états uniquement |

N'ajoute pas de couleur en dur dans un composant : étends le `@theme`.

## Typographie

- Une seule famille : **Geist** (texte) et **Geist Mono** (adresses IP, MAC, commandes, URL — les données, pas les étiquettes).
- Titres en 600, approche resserrée (`--text-display`, `--text-h2` déjà réglés). Pas de gras 800/900.
- Lignes de texte ≤ 70 caractères (`.measure`, `max-w-2xl`).
- Pas d'étiquette en capitales espacées au-dessus des titres, pas de mot isolé coloré dans un titre, pas de « → » ajouté aux boutons, pas de séparateur « · ».
- Trait d'union insécable (U+2011) dans « Wi‑Fi » pour éviter « Wi- / Fi » en fin de ligne.

## Mise en page

- Ouverture centrée : badge de version, titre, une phrase, deux boutons, puis la console réelle dans une fenêtre.
- Fonctionnalités en grille irrégulière : seules les tuiles qui *montrent* quelque chose sont grandes (démo IPAM, schéma du cluster). Les autres : icône, titre, deux phrases.
- Les listes homogènes (modules) ne sont pas des cartes : icône + texte, sans cadre.
- Une numérotation n'apparaît que pour une vraie séquence (construction de l'ISO).
- Espacement vertical des sections : `py-20` ; entre titre de section et contenu : `mt-12`.

## Mouvement

- Un seul mouvement non déclenché : la capture de l'ouverture qui se redresse au chargement.
- Tout le reste répond à une action (allocation d'une adresse, changement d'onglet, copie).
- `prefers-reduced-motion` est respecté globalement : ne le contourne pas.

## Interaction et accessibilité

- Focus visible partout (`:focus-visible` bleu), ordre de tabulation logique, lien d'évitement.
- Groupes de contrôles au clavier : onglets ARIA (flèches, Début, Fin), grille d'adresses à tabindex mobile.
- Toute action un peu longue affiche un indicateur d'attente (spinner) et désactive son bouton.
- Aucune boîte de dialogue système (`alert`, `confirm`) : messages dans la page.
- Formulaires : libellé visible sur chaque champ, erreur sous le champ reliée par `aria-describedby`, résumé `role="alert"` qui prend le focus.
- Cibles tactiles ≥ 44 px pour les boutons.

## Rédaction

- Phrases courtes, voix active, ce que l'utilisateur obtient plutôt que la technique : « Télécharger », « Envoyer le message ».
- Une action garde le même nom tout du long (bouton « Envoyer le message » → « Message envoyé »).
- Erreurs : ce qui s'est passé et quoi faire, sans excuse.
- FR et EN toujours mis à jour ensemble (`i18n/locales/*.json`) ; aucun texte en dur dans les composants.

## Contraintes techniques

- CSP stricte : aucune ressource tierce (police, image, script), aucun `style` ou `script` inline hors nonce, aucune police en `data:`.
- Images : WebP + PNG de repli dans `<picture>`, `width`/`height` renseignés.
- Vérifier chaque changement visuel par une capture à 1440 px et à 390 px avant de le livrer.

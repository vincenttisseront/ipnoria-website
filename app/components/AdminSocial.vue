<script setup lang="ts">
// Réseaux sociaux (administration, en français) : textes prêts à publier, carrousels PDF, liens de campagne.
type Net = 'linkedin' | 'mastodon' | 'bluesky'
type Source = { kind: string, key: string, label: string, date: string | null, carousel: boolean, posts: Record<Net, Record<'fr' | 'en', string>> }
const { data } = await useFetch<{ sources: Source[], limits: Record<Net, number>, statsUrl: string }>('/api/admin/social/sources', { default: () => ({ sources: [], limits: { linkedin: 3000, mastodon: 500, bluesky: 300 }, statsUrl: '' }) })
const KIND: Record<string, string> = { beta: 'Bêta', release: 'Versions', article: 'Articles', idea: 'Idées livrées', ref: 'Références' }
const NET: Record<Net, string> = { linkedin: 'LinkedIn', mastodon: 'Mastodon', bluesky: 'Bluesky' }
const kindFilter = ref('all')
const shown = computed(() => data.value.sources.filter(s => kindFilter.value === 'all' || s.kind === kindFilter.value))
const sel = ref<Source | null>(null)
const net = ref<Net>('linkedin')
const lang = ref<'fr' | 'en'>('fr')
const text = ref('')
watch([sel, net, lang], () => { text.value = sel.value?.posts[net.value][lang.value] ?? '' })
watchEffect(() => { if (!sel.value && data.value.sources[0]) sel.value = data.value.sources[0] })
// Bluesky compte les liens pour 23 caractères environ ; on affiche la longueur brute, prudente
const over = computed(() => text.value.length > data.value.limits[net.value])
const copied = ref(false)
async function copy() {
  try { await navigator.clipboard.writeText(text.value); copied.value = true; setTimeout(() => (copied.value = false), 1600) }
  catch { /* sélection manuelle possible */ }
}
const ogPath = computed(() => {
  const s = sel.value
  if (!s) return ''
  const k = s.kind === 'beta' ? ['page', 'beta'] : s.kind === 'release' ? ['release', s.key] : s.kind === 'article' ? ['article', s.key] : s.kind === 'idea' ? ['idea', s.key] : ['ref', s.key]
  return `/og/${k[0]}/${encodeURIComponent(k[1]!)}.png?lang=${lang.value}`
})

// Générateur de liens de campagne (UTM)
const PAGES = [['/', 'Accueil'], ['/beta', 'Programme bêta'], ['/feuille-de-route', 'Feuille de route'], ['/outils', 'Outils'], ['/visite', 'Visite guidée'], ['/rendez-vous', 'Rendez-vous'], ['/references', 'Références'], ['/articles', 'Articles']] as const
const link = reactive({ path: '/beta', custom: '', source: 'linkedin', medium: 'social', campaign: '', content: '', en: false })
const linkUrl = computed(() => {
  const base = useRequestURL().origin
  let path = link.custom.trim() || link.path
  if (!path.startsWith('/')) path = `/${path}`
  if (link.en && !path.startsWith('/en')) path = path === '/' ? '/en' : `/en${path}`
  const u = new URL(path, base)
  const slug = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (link.source) u.searchParams.set('utm_source', slug(link.source))
  if (link.medium) u.searchParams.set('utm_medium', slug(link.medium))
  if (link.campaign) u.searchParams.set('utm_campaign', slug(link.campaign))
  if (link.content) u.searchParams.set('utm_content', slug(link.content))
  return u.toString()
})
const linkCopied = ref(false)
async function copyLink() {
  try { await navigator.clipboard.writeText(linkUrl.value); linkCopied.value = true; setTimeout(() => (linkCopied.value = false), 1600) }
  catch { /* sélection manuelle possible */ }
}
</script>

<template>
  <section aria-labelledby="sx-title">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h2 id="sx-title" class="text-xl font-semibold tracking-tight">Réseaux sociaux</h2>
      <a v-if="data.statsUrl" :href="data.statsUrl" class="link text-sm" rel="noopener" target="_blank">Résultats des campagnes (statistiques)</a>
    </div>
    <div class="mt-6 grid gap-6 lg:grid-cols-[20rem_1fr]">
      <div>
        <label class="flex items-center gap-2 text-sm">Afficher
          <select v-model="kindFilter" class="field !w-auto py-1.5 text-sm"><option value="all">Tout</option><option v-for="(l, k) in KIND" :key="k" :value="k">{{ l }}</option></select>
        </label>
        <ul class="panel mt-3 max-h-[34rem] divide-y divide-line overflow-y-auto">
          <li v-for="s in shown" :key="`${s.kind}-${s.key}`">
            <button type="button" class="w-full px-4 py-3 text-left hover:bg-raised" :class="sel === s ? 'bg-raised' : ''" @click="sel = s">
              <p class="text-sm font-medium">{{ s.label }}</p>
              <p class="text-xs text-muted">{{ KIND[s.kind] }}<template v-if="s.date">, {{ new Date(s.date).toLocaleDateString('fr-FR') }}</template></p>
            </button>
          </li>
        </ul>
      </div>
      <div v-if="sel" class="panel space-y-4 p-6">
        <div class="flex flex-wrap items-center gap-3">
          <div role="tablist" class="flex gap-1 rounded-lg border border-line p-1">
            <button v-for="(l, k) in NET" :key="k" type="button" role="tab" :aria-selected="net === k" class="rounded-md px-3 py-1 text-sm" :class="net === k ? 'bg-raised text-fg' : 'text-muted'" @click="net = k">{{ l }}</button>
          </div>
          <div role="radiogroup" aria-label="Langue" class="flex gap-1 rounded-lg border border-line p-1">
            <button v-for="x in (['fr', 'en'] as const)" :key="x" type="button" role="radio" :aria-checked="lang === x" class="rounded-md px-3 py-1 text-sm uppercase" :class="lang === x ? 'bg-raised text-fg' : 'text-muted'" @click="lang = x">{{ x }}</button>
          </div>
        </div>
        <label for="sx-text" class="sr-only">Texte du message</label>
        <textarea id="sx-text" v-model="text" class="field min-h-56 text-[0.95rem]" />
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm" :class="over ? 'text-alert' : 'text-muted'">{{ text.length }} / {{ data.limits[net] }} caractères<template v-if="over"> : trop long pour {{ NET[net] }}</template></p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" @click="copy"><AppIcon :name="copied ? 'check' : 'copy'" :size="16" />{{ copied ? 'Copié' : 'Copier le texte' }}</button>
            <template v-if="sel.carousel">
              <a :href="`/api/admin/social/carousel?kind=${sel.kind}&key=${encodeURIComponent(sel.key)}&lang=${lang}`" class="btn btn-secondary" download><AppIcon name="download" :size="16" />Carrousel PDF</a>
            </template>
          </div>
        </div>
        <div>
          <p class="text-sm text-muted">Image d'aperçu affichée par les réseaux pour ce lien :</p>
          <img :src="ogPath" alt="Image d'aperçu" width="600" height="315" class="mt-2 w-full max-w-xl rounded-lg border border-line">
        </div>
      </div>
    </div>

    <div class="panel mt-6 p-6">
      <h3 class="font-semibold">Lien de campagne</h3>
      <p class="mt-1 text-sm text-muted">Un lien par publication ou par annonce : les statistiques (sans cookie) comptent visites, candidatures bêta, inscriptions et rendez-vous par campagne.</p>
      <div class="mt-4 grid gap-4 sm:grid-cols-3">
        <div><label for="lk-p" class="field-label">Page</label><select id="lk-p" v-model="link.path" class="field"><option v-for="[p, l] in PAGES" :key="p" :value="p">{{ l }}</option></select></div>
        <div><label for="lk-c" class="field-label">ou chemin précis</label><input id="lk-c" v-model="link.custom" class="field font-mono" placeholder="/articles/…"></div>
        <label class="flex items-end gap-2 pb-3"><input v-model="link.en" type="checkbox" class="size-4 accent-[#5b8cff]">Version anglaise</label>
        <div><label for="lk-s" class="field-label">Source</label><input id="lk-s" v-model="link.source" class="field" list="lk-sources"><datalist id="lk-sources"><option value="linkedin" /><option value="mastodon" /><option value="bluesky" /><option value="newsletter" /><option value="salon" /></datalist></div>
        <div><label for="lk-m" class="field-label">Support</label><select id="lk-m" v-model="link.medium" class="field"><option value="social">Publication</option><option value="paid">Annonce payante</option><option value="email">E-mail</option><option value="event">Événement</option></select></div>
        <div><label for="lk-n" class="field-label">Campagne</label><input id="lk-n" v-model="link.campaign" class="field" placeholder="recrutement-beta-2026"></div>
        <div class="sm:col-span-3"><label for="lk-t" class="field-label">Variante (facultatif)</label><input id="lk-t" v-model="link.content" class="field" placeholder="visuel-a"></div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <input :value="linkUrl" readonly class="field flex-1 font-mono text-sm" aria-label="Lien de campagne" @focus="($event.target as HTMLInputElement).select()">
        <button type="button" class="btn btn-secondary" @click="copyLink"><AppIcon :name="linkCopied ? 'check' : 'copy'" :size="16" />{{ linkCopied ? 'Copié' : 'Copier' }}</button>
      </div>
    </div>
  </section>
</template>

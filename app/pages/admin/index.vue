<script setup lang="ts">
// Espace d'administration (français seulement, non indexé). Une section à la fois.
definePageMeta({ layout: false })
useSeoMeta({ title: 'Administration', robots: 'noindex, nofollow' })

const sections = [
  { id: 'messages', label: 'Messages' },
  { id: 'activite', label: 'Activité' },
  { id: 'elements', label: 'Éléments' },
  { id: 'beta', label: 'Bêta' },
  { id: 'idees', label: 'Idées' },
  { id: 'references', label: 'Références' },
  { id: 'securite', label: 'Sécurité' },
  { id: 'reseaux', label: 'Réseaux' },
] as const
type SectionId = (typeof sections)[number]['id']

const route = useRoute()
const section = computed<SectionId>(() => {
  const q = route.query.section
  return sections.some(s => s.id === q) ? q as SectionId : 'messages'
})
const mainEl = ref<HTMLElement | null>(null)
async function openSection(id: SectionId) {
  if (id === section.value) return
  await navigateTo({ path: '/admin', query: id === 'messages' ? {} : { section: id } })
  await nextTick()
  mainEl.value?.focus()
}

interface Message {
  id: string, created_at: string, locale: string, name: string, email: string, company: string, topic: string,
  message: string, handled_at: string | null, replied_at: string | null, reply_body: string | null
}
const { data: me, refresh: refreshMe } = await useFetch<{ enabled: boolean, user: { email: string, name: string } | null, pending: 'mfa' | 'setup' | null, passkey: boolean }>('/api/admin/me')

const filter = ref<'ouverts' | 'traites' | 'tous'>('ouverts')
const searchDraft = ref('')
const search = ref('')
const { data: list, refresh, status } = await useFetch<{ messages: Message[], stats: { open: number, total: number, subscribers: number } }>(
  '/api/admin/messages',
  { query: computed(() => ({ filtre: filter.value, q: search.value || undefined })), immediate: Boolean(me.value?.user), watch: [filter, search] },
)
const { data: counts, refresh: refreshCounts } = await useFetch<{ messages: number, bookings: number }>('/api/admin/counts', { immediate: Boolean(me.value?.user) })
type Template = { id: string, title: string, body: string }
const { data: templates, refresh: refreshTemplates } = await useFetch<Template[]>('/api/admin/reply-templates', { immediate: Boolean(me.value?.user), default: () => [] })
const templateTitle = ref('')
const pickedTemplate = ref('')
const { data: overview, refresh: refreshOverview } = await useFetch<{
  bookings: Array<{ id: string, starts_at: string, name: string, email: string, company: string, notes: string }>
  closures: Array<{ day: string, note: string }>
  ideas: Record<string, number>
  users: { total: number, verified: number, mfa: number }
}>(
  '/api/admin/overview', { immediate: false },
)
watch(section, (id) => { if (id === 'activite' && me.value?.user) refreshOverview() }, { immediate: true })
const selectedId = ref<string | null>(null)
const selected = computed(() => {
  const messages = list.value?.messages ?? []
  if (selectedId.value) return messages.find(m => String(m.id) === String(selectedId.value)) ?? null
  return messages[0] ?? null
})
watch(() => route.query.message, (id) => {
  if (typeof id === 'string' && /^\d+$/.test(id)) {
    filter.value = 'tous'
    searchDraft.value = ''
    search.value = ''
    selectedId.value = id
  }
}, { immediate: true })

function badge(id: SectionId) {
  if (id === 'messages') return counts.value?.messages || 0
  if (id === 'activite') return counts.value?.bookings || 0
  return 0
}
function setFilter(next: 'ouverts' | 'traites' | 'tous') {
  filter.value = next
  selectedId.value = null
  if (route.query.message) navigateTo({ path: '/admin', query: {} })
}
function applySearch() {
  search.value = searchDraft.value.trim()
  selectedId.value = null
  if (route.query.message) navigateTo({ path: '/admin', query: {} })
}
const messageExportHref = computed(() => {
  const p = new URLSearchParams({ filtre: filter.value })
  if (search.value) p.set('q', search.value)
  return `/api/admin/messages/export?${p.toString()}`
})

const busy = ref<'' | 'handled' | 'reply' | 'delete' | 'logout' | 'template' | 'close' | 'cancel'>('')
const notice = ref<{ kind: 'ok' | 'error', text: string } | null>(null)
const reply = ref('')
function applyTemplate(event: Event) {
  const id = (event.target as HTMLSelectElement).value
  const found = templates.value?.find(t => t.id === id)
  if (found) reply.value = found.body
  nextTick(() => { pickedTemplate.value = '' })
}
const confirmDelete = ref(false)
const confirmBtn = ref<HTMLButtonElement | null>(null)
const closureDay = ref('')
const closureNote = ref('')
const cancelId = ref<string | null>(null)

const topics: Record<string, string> = { demo: 'Démonstration', question: 'Question technique', feedback: 'Retour d\'essai', partnership: 'Partenariat', other: 'Autre' }
const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { dateStyle: 'full' })

async function act(kind: typeof busy.value, fn: () => Promise<unknown>, ok: string) {
  busy.value = kind
  notice.value = null
  try { await fn(); notice.value = { kind: 'ok', text: ok }; await Promise.all([refresh(), refreshCounts()]) }
  catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode
    notice.value = { kind: 'error', text: code === 401 ? 'Reconnectez-vous.' : 'L\'action a échoué. Réessayez.' }
  }
  finally { busy.value = '' }
}
const toggleHandled = (m: Message) => act('handled', () => $fetch(`/api/admin/messages/${m.id}`, { method: 'PATCH', body: { handled: !m.handled_at } }), m.handled_at ? 'Message remis à traiter.' : 'Message marqué traité.')
const sendReply = (m: Message) => act('reply', async () => { await $fetch(`/api/admin/messages/${m.id}/reply`, { method: 'POST', body: { body: reply.value } }); reply.value = '' }, 'Réponse envoyée.')
const doDelete = (m: Message) => act('delete', async () => { await $fetch(`/api/admin/messages/${m.id}`, { method: 'DELETE' }); confirmDelete.value = false; selectedId.value = null }, 'Message supprimé.')
async function saveTemplate() {
  if (templateTitle.value.trim().length < 1 || reply.value.trim().length < 2) {
    notice.value = { kind: 'error', text: 'Indiquez un titre et un texte d’au moins deux caractères.' }
    return
  }
  await act('template', async () => {
    await $fetch('/api/admin/reply-templates', { method: 'POST', body: { title: templateTitle.value.trim(), body: reply.value } })
    templateTitle.value = ''
    await refreshTemplates()
  }, 'Texte enregistré.')
}
const removeTemplate = (id: string) => act('template', async () => {
  await $fetch(`/api/admin/reply-templates/${id}`, { method: 'DELETE' })
  await refreshTemplates()
}, 'Texte retiré.')
async function closeDay() {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(closureDay.value)) {
    notice.value = { kind: 'error', text: 'Choisissez un jour.' }
    return
  }
  busy.value = 'close'
  notice.value = null
  try {
    await $fetch('/api/admin/closures', { method: 'POST', body: { day: closureDay.value, note: closureNote.value } })
    closureNote.value = ''
    await refreshOverview()
    notice.value = { kind: 'ok', text: 'Jour fermé aux démonstrations.' }
  }
  catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode
    notice.value = { kind: 'error', text: code === 409 ? 'Ce jour est déjà fermé.' : code === 401 ? 'Reconnectez-vous.' : 'Le jour n’a pas été fermé. Réessayez.' }
  }
  finally { busy.value = '' }
}
const reopenDay = (day: string) => act('close', async () => {
  await $fetch(`/api/admin/closures/${day}`, { method: 'DELETE' })
  await refreshOverview()
}, 'Jour rouvert.')
async function cancelBooking(id: string) {
  busy.value = 'cancel'
  notice.value = null
  try {
    const r = await $fetch<{ mailed: boolean }>(`/api/admin/bookings/${id}/cancel`, { method: 'POST' })
    cancelId.value = null
    await Promise.all([refreshOverview(), refreshCounts()])
    notice.value = {
      kind: r.mailed ? 'ok' : 'error',
      text: r.mailed ? 'Démonstration annulée. Le visiteur est prévenu.' : 'Démonstration annulée. Le message au visiteur n’a pas pu partir.',
    }
  }
  catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode
    notice.value = { kind: 'error', text: code === 401 ? 'Reconnectez-vous.' : code === 404 ? 'Cette démonstration n’est plus réservée.' : 'L’annulation a échoué. Réessayez.' }
  }
  finally { busy.value = '' }
}
async function logout() {
  busy.value = 'logout'
  try { await $fetch('/auth/logout', { method: 'POST' }) }
  finally { await navigateTo('/admin', { external: true }) }
}
watch(confirmDelete, async (open) => { if (open) { await nextTick(); confirmBtn.value?.focus() } })
</script>

<template>
  <div v-if="!me?.user" class="min-h-dvh">
    <header class="border-b border-line">
      <div class="wrap flex h-16 items-center">
        <NuxtLink to="/" class="flex items-center gap-2.5 text-fg no-underline"><BrandMark /><span class="font-semibold">Ipnoria</span><span class="text-muted">administration</span></NuxtLink>
      </div>
    </header>
    <main class="wrap py-10">
      <div v-if="!me?.enabled" class="panel max-w-xl p-7">
        <h1 class="text-xl font-semibold">Administration</h1>
        <p class="mt-2 text-muted">Cette page n’est pas disponible.</p>
      </div>
      <AdminLogin v-else :resume="me.pending" :passkey="me.passkey" @ready="refreshMe()" />
    </main>
  </div>

  <div v-else class="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
    <aside class="border-b border-line lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-b-0 lg:border-r">
      <div class="flex items-center justify-between gap-3 border-b border-line px-4 py-3 lg:h-16 lg:border-b-0 lg:py-0">
        <NuxtLink to="/" class="flex min-w-0 items-center gap-2.5 text-fg no-underline"><BrandMark /><span class="font-semibold">Ipnoria</span></NuxtLink>
        <button type="button" class="btn btn-secondary shrink-0 lg:hidden" :disabled="busy === 'logout'" @click="logout">Se déconnecter</button>
      </div>
        <p class="truncate px-4 pb-2 text-sm text-muted lg:hidden">{{ me.user.email }}</p>
      <nav aria-label="Sections" class="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-3 lg:pb-4 [&::-webkit-scrollbar]:hidden">
        <button
          v-for="s in sections" :key="s.id" type="button"
          class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-left text-sm lg:flex lg:w-full lg:justify-between"
          :class="section === s.id ? 'bg-raised text-fg' : 'text-muted hover:bg-raised hover:text-fg'"
          :aria-current="section === s.id ? 'page' : undefined"
          @click="openSection(s.id)"
        >
          <span>{{ s.label }}</span>
          <span v-if="badge(s.id)" class="font-mono text-xs tabular-nums text-muted">{{ badge(s.id) }}<span class="sr-only">{{ s.id === 'messages' ? ' à traiter' : ' à venir' }}</span></span>
        </button>
      </nav>
    </aside>

    <div class="min-w-0">
      <header class="hidden h-16 items-center justify-end gap-4 border-b border-line px-8 lg:flex">
        <span class="truncate text-sm text-muted">{{ me.user.email }}</span>
        <button type="button" class="btn btn-secondary" :disabled="busy === 'logout'" @click="logout">Se déconnecter</button>
      </header>

      <main ref="mainEl" tabindex="-1" class="px-4 py-8 outline-none sm:px-6 lg:px-10">
        <p v-if="notice" :role="notice.kind === 'error' ? 'alert' : 'status'" class="mb-6 rounded-lg px-4 py-3 text-sm" :class="notice.kind === 'error' ? 'border-l-4 border-alert bg-surface text-alert' : 'border-l-4 border-ok bg-surface text-ok'">{{ notice.text }}</p>
        <div v-show="section === 'messages'">
          <div class="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 class="text-xl font-semibold tracking-tight">Messages</h1>
              <p v-if="list" class="mt-2 text-muted">{{ list.stats.open }} à traiter sur {{ list.stats.total }}, {{ list.stats.subscribers }} abonné(s) aux alertes de version</p>
            </div>
            <div role="radiogroup" aria-label="Filtre" class="flex rounded-lg border border-line p-1 text-sm">
              <button
                v-for="f in (['ouverts', 'traites', 'tous'] as const)" :key="f" type="button" role="radio" :aria-checked="filter === f"
                class="min-h-11 rounded-md px-3" :class="filter === f ? 'bg-raised text-fg' : 'text-muted hover:text-fg'" @click="setFilter(f)"
              >{{ { ouverts: 'À traiter', traites: 'Traités', tous: 'Tous' }[f] }}</button>
            </div>
          </div>

          <form class="mt-6 flex flex-wrap items-end gap-2" @submit.prevent="applySearch">
            <div class="w-full sm:w-auto sm:min-w-64 sm:flex-1">
              <label for="msg-q" class="field-label">Recherche</label>
              <input id="msg-q" v-model="searchDraft" class="field min-h-11" maxlength="120" placeholder="Nom, adresse ou société" autocomplete="off">
            </div>
            <button type="submit" class="btn btn-secondary">Rechercher</button>
            <a class="btn btn-secondary" :href="messageExportHref">Télécharger</a>
          </form>

        <div v-if="status === 'pending' && !list" class="mt-10 flex items-center gap-3 text-muted">
          <span class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />Chargement des messages
        </div>
        <p v-else-if="list && !list.messages.length" class="panel mt-8 p-7 text-muted">Aucun message dans cette vue.</p>

        <div v-else-if="list" class="mt-8 grid gap-6 lg:grid-cols-[22rem_1fr]">
          <ul class="panel max-h-[70dvh] divide-y divide-line overflow-y-auto">
            <li v-for="m in list.messages" :key="m.id">
              <button
                type="button" class="block w-full px-4 py-3 text-left hover:bg-raised"
                :class="selected?.id === m.id ? 'bg-raised' : ''" :aria-current="selected?.id === m.id" @click="selectedId = m.id; reply = ''"
              >
                <span class="flex items-center justify-between gap-2">
                  <span class="truncate font-medium">{{ m.name }}</span>
                  <span v-if="!m.handled_at" class="size-2 shrink-0 rounded-full bg-accent" aria-label="à traiter" />
                </span>
                <span class="mt-0.5 block truncate text-sm text-muted">{{ topics[m.topic] }}, {{ fmt(m.created_at) }}</span>
              </button>
            </li>
          </ul>

          <article v-if="selected" class="panel p-6 sm:p-8">
            <header class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 class="text-xl font-semibold">{{ selected.name }}</h2>
                <p class="mt-1 text-sm text-muted">
                  <a :href="`mailto:${selected.email}`" class="link">{{ selected.email }}</a>
                  <template v-if="selected.company">, {{ selected.company }}</template>
                </p>
                <p class="mt-1 text-sm text-muted">{{ topics[selected.topic] }}, reçu le {{ fmt(selected.created_at) }}, en {{ selected.locale === 'en' ? 'anglais' : 'français' }}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-secondary text-sm" :disabled="busy !== ''" @click="toggleHandled(selected)">
                  <span v-if="busy === 'handled'" class="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />
                  {{ selected.handled_at ? 'Remettre à traiter' : 'Marquer traité' }}
                </button>
                <button type="button" class="btn btn-secondary text-sm text-alert" :disabled="busy !== ''" @click="confirmDelete = true">Supprimer</button>
              </div>
            </header>

            <p class="mt-6 whitespace-pre-wrap rounded-xl border border-line bg-bg p-4 text-[0.95rem]">{{ selected.message }}</p>

            <div v-if="selected.replied_at" class="mt-6">
              <p class="text-sm text-muted">Réponse envoyée le {{ fmt(selected.replied_at) }}</p>
              <p class="mt-2 whitespace-pre-wrap rounded-xl border border-ok/30 bg-ok/5 p-4 text-[0.95rem]">{{ selected.reply_body }}</p>
            </div>

            <form class="mt-6" @submit.prevent="sendReply(selected)">
              <label for="reply" class="field-label">{{ selected.replied_at ? 'Nouvelle réponse' : 'Répondre' }}</label>
              <textarea id="reply" v-model="reply" class="field min-h-36" maxlength="10000" required />
              <div class="mt-3 flex flex-wrap items-end gap-2">
                <div class="w-full sm:max-w-xs sm:flex-1">
                  <label for="tpl" class="field-label">Réponse type</label>
                  <select id="tpl" v-model="pickedTemplate" class="field min-h-11" @change="applyTemplate">
                    <option value="">Choisir un texte enregistré</option>
                    <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.title }}</option>
                  </select>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap items-end gap-2">
                <div class="w-full sm:max-w-xs sm:flex-1">
                  <label for="tpl-title" class="field-label">Enregistrer ce texte</label>
                  <input id="tpl-title" v-model="templateTitle" class="field min-h-11" maxlength="80" placeholder="Titre">
                </div>
                <button type="button" class="btn btn-secondary" :disabled="busy !== ''" @click="saveTemplate">Enregistrer</button>
              </div>
              <ul v-if="templates?.length" class="mt-3 divide-y divide-line text-sm">
                <li v-for="t in templates" :key="t.id" class="flex items-center justify-between gap-3">
                  <span class="truncate">{{ t.title }}</span>
                  <button type="button" class="min-h-11 shrink-0 px-2 text-muted hover:text-alert" :disabled="busy !== ''" @click="removeTemplate(t.id)">Retirer</button>
                </li>
              </ul>
              <p class="mt-1.5 text-sm text-muted">Envoyée par e-mail à {{ selected.email }}, avec le message d'origine cité.</p>
              <button type="submit" class="btn btn-primary mt-4" :disabled="busy !== '' || reply.trim().length < 2">
                <span v-if="busy === 'reply'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
                {{ busy === 'reply' ? 'Envoi de la réponse' : 'Envoyer la réponse' }}
              </button>
            </form>
          </article>
          <article v-else-if="selectedId" class="panel p-6 sm:p-8">
            <p class="text-muted">Ce message n’apparaît pas dans la liste. Élargissez la recherche ou affichez tous les messages.</p>
          </article>
        </div>
        </div>

        <div v-if="section === 'activite'">
          <h1 class="text-xl font-semibold tracking-tight">Activité</h1>
          <p class="mt-2 text-muted">Démonstrations réservées et comptes du site.</p>
          <div v-if="!overview" class="mt-8 flex items-center gap-3 text-muted">
            <span class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />Chargement
          </div>
          <div v-else class="mt-8 space-y-6">
            <div class="grid gap-6 lg:grid-cols-2">
            <section class="panel p-6">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-lg font-semibold">Démonstrations à venir</h2>
                <a class="btn btn-secondary text-sm" href="/api/admin/bookings/export">Télécharger</a>
              </div>
              <p v-if="!overview.bookings.length" class="mt-3 text-muted">Aucune démonstration réservée.</p>
              <ul v-else class="mt-3 divide-y divide-line">
                <li v-for="b in overview.bookings" :key="b.id" class="py-3">
                  <p class="font-medium">{{ fmt(b.starts_at) }}</p>
                  <p class="text-sm text-muted">{{ b.name }}<template v-if="b.company">, {{ b.company }}</template>, <a :href="`mailto:${b.email}`" class="link">{{ b.email }}</a></p>
                  <p v-if="b.notes" class="mt-1 whitespace-pre-wrap text-sm">{{ b.notes }}</p>
                  <div v-if="cancelId === b.id" class="mt-3 flex flex-wrap gap-2">
                    <button type="button" class="btn btn-secondary text-sm" :disabled="busy === 'cancel'" @click="cancelId = null">Garder</button>
                    <button type="button" class="btn bg-alert text-sm text-bg hover:opacity-90" :disabled="busy === 'cancel'" @click="cancelBooking(b.id)">
                      <span v-if="busy === 'cancel'" class="size-3.5 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
                      Annuler la démonstration
                    </button>
                  </div>
                  <button v-else type="button" class="btn btn-secondary mt-3 text-sm" :disabled="busy !== ''" @click="cancelId = b.id">Annuler</button>
                </li>
              </ul>
            </section>
            <section class="panel p-6">
              <h2 class="text-lg font-semibold">Comptes et idées</h2>
              <p class="mt-3 text-sm text-muted">{{ overview.users.total }} comptes, dont {{ overview.users.verified }} vérifiés et {{ overview.users.mfa }} avec un second facteur.</p>
              <ul class="mt-4 flex flex-wrap gap-2 text-sm">
                <li v-for="(n, st) in overview.ideas" :key="st" class="min-h-11 rounded-full border border-line px-3 py-2"><IdeaStatus :status="st as any" /> <span class="ml-1 font-mono">{{ n }}</span></li>
              </ul>
            </section>
            </div>
            <section class="panel p-6">
              <h2 class="text-lg font-semibold">Jours fermés</h2>
              <p class="mt-1 text-sm text-muted">Aucun créneau n’est proposé ces jours-là. Une démonstration déjà prise reste au calendrier tant qu’elle n’est pas annulée.</p>
              <form class="mt-4 flex flex-wrap items-end gap-2" @submit.prevent="closeDay">
                <div>
                  <label for="close-day" class="field-label">Jour</label>
                  <input id="close-day" v-model="closureDay" type="date" class="field min-h-11" required>
                </div>
                <div class="w-full sm:max-w-sm sm:flex-1">
                  <label for="close-note" class="field-label">Motif, facultatif</label>
                  <input id="close-note" v-model="closureNote" class="field min-h-11" maxlength="200">
                </div>
                <button type="submit" class="btn btn-secondary" :disabled="busy !== ''">Fermer ce jour</button>
              </form>
              <ul v-if="overview.closures?.length" class="mt-4 divide-y divide-line">
                <li v-for="c in overview.closures" :key="c.day" class="flex flex-wrap items-center justify-between gap-3 py-2">
                  <p>{{ dayLabel(c.day) }}<span v-if="c.note" class="text-muted">, {{ c.note }}</span></p>
                  <button type="button" class="btn btn-secondary text-sm" :disabled="busy !== ''" @click="reopenDay(c.day)">Rouvrir</button>
                </li>
              </ul>
              <p v-else class="mt-4 text-sm text-muted">Aucun jour fermé.</p>
            </section>
          </div>
        </div>

        <div v-if="section === 'elements'">
          <AdminFeatures />
          <AdminAnnouncement />
        </div>
        <AdminBeta v-if="section === 'beta'" />
        <AdminIdeas v-if="section === 'idees'" />
        <AdminReferences v-if="section === 'references'" />
        <AdminSecurity v-if="section === 'securite'" />
        <AdminSocial v-if="section === 'reseaux'" />
      </main>
    </div>

    <!-- Confirmation de suppression : fenêtre de l'interface, jamais une boîte système -->
    <div v-if="confirmDelete && selected" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" @keydown.esc="confirmDelete = false">
      <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-text" class="panel w-full max-w-md p-6 shadow-2xl shadow-black">
        <h2 id="del-title" class="text-lg font-semibold">Supprimer ce message ?</h2>
        <p id="del-text" class="mt-2 text-muted">Le message de {{ selected.name }} et la réponse éventuelle seront effacés définitivement. Cette action ne peut pas être annulée.</p>
        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="btn btn-secondary" @click="confirmDelete = false">Annuler</button>
          <button ref="confirmBtn" type="button" class="btn bg-alert text-bg hover:opacity-90" :disabled="busy === 'delete'" @click="doDelete(selected)">
            <span v-if="busy === 'delete'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
            Supprimer le message
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

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
const { data: list, refresh, status } = await useFetch<{ messages: Message[], stats: { open: number, total: number, subscribers: number } }>(
  '/api/admin/messages', { query: { filtre: filter }, immediate: Boolean(me.value?.user), watch: [filter] },
)
const { data: overview, refresh: refreshOverview } = await useFetch<{ bookings: Array<{ id: string, starts_at: string, name: string, email: string, company: string, notes: string }>, ideas: Record<string, number>, users: { total: number, verified: number, mfa: number } }>(
  '/api/admin/overview', { immediate: false },
)
watch(section, (id) => { if (id === 'activite' && me.value?.user) refreshOverview() }, { immediate: true })
const selectedId = ref<string | null>(null)
const selected = computed(() => list.value?.messages.find(m => m.id === selectedId.value) ?? list.value?.messages[0] ?? null)

const busy = ref<'' | 'handled' | 'reply' | 'delete' | 'logout'>('')
const notice = ref<{ kind: 'ok' | 'error', text: string } | null>(null)
const reply = ref('')
const confirmDelete = ref(false)
const confirmBtn = ref<HTMLButtonElement | null>(null)

const topics: Record<string, string> = { demo: 'Démonstration', question: 'Question technique', feedback: 'Retour d\'essai', partnership: 'Partenariat', other: 'Autre' }
const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

async function act(kind: typeof busy.value, fn: () => Promise<unknown>, ok: string) {
  busy.value = kind
  notice.value = null
  try { await fn(); notice.value = { kind: 'ok', text: ok }; await refresh() }
  catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode
    notice.value = { kind: 'error', text: code === 401 ? 'Reconnectez-vous.' : 'L\'action a échoué. Réessayez.' }
  }
  finally { busy.value = '' }
}
const toggleHandled = (m: Message) => act('handled', () => $fetch(`/api/admin/messages/${m.id}`, { method: 'PATCH', body: { handled: !m.handled_at } }), m.handled_at ? 'Message remis à traiter.' : 'Message marqué traité.')
const sendReply = (m: Message) => act('reply', async () => { await $fetch(`/api/admin/messages/${m.id}/reply`, { method: 'POST', body: { body: reply.value } }); reply.value = '' }, 'Réponse envoyée.')
const doDelete = (m: Message) => act('delete', async () => { await $fetch(`/api/admin/messages/${m.id}`, { method: 'DELETE' }); confirmDelete.value = false; selectedId.value = null }, 'Message supprimé.')
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
          class="min-h-11 shrink-0 rounded-lg px-3 text-left text-sm lg:w-full"
          :class="section === s.id ? 'bg-raised text-fg' : 'text-muted hover:bg-raised hover:text-fg'"
          :aria-current="section === s.id ? 'page' : undefined"
          @click="openSection(s.id)"
        >{{ s.label }}</button>
      </nav>
    </aside>

    <div class="min-w-0">
      <header class="hidden h-16 items-center justify-end gap-4 border-b border-line px-8 lg:flex">
        <span class="truncate text-sm text-muted">{{ me.user.email }}</span>
        <button type="button" class="btn btn-secondary" :disabled="busy === 'logout'" @click="logout">Se déconnecter</button>
      </header>

      <main ref="mainEl" tabindex="-1" class="px-4 py-8 outline-none sm:px-6 lg:px-10">
        <div v-show="section === 'messages'">
          <div class="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 class="text-xl font-semibold tracking-tight">Messages</h1>
              <p v-if="list" class="mt-2 text-muted">{{ list.stats.open }} à traiter sur {{ list.stats.total }}, {{ list.stats.subscribers }} abonné(s) aux alertes de version</p>
            </div>
            <div role="radiogroup" aria-label="Filtre" class="flex rounded-lg border border-line p-1 text-sm">
              <button
                v-for="f in (['ouverts', 'traites', 'tous'] as const)" :key="f" type="button" role="radio" :aria-checked="filter === f"
                class="min-h-11 rounded-md px-3" :class="filter === f ? 'bg-raised text-fg' : 'text-muted hover:text-fg'" @click="filter = f; selectedId = null"
              >{{ { ouverts: 'À traiter', traites: 'Traités', tous: 'Tous' }[f] }}</button>
            </div>
          </div>

        <p v-if="notice" :role="notice.kind === 'error' ? 'alert' : 'status'" class="mt-6 rounded-lg px-4 py-3 text-sm" :class="notice.kind === 'error' ? 'border-l-4 border-alert bg-surface text-alert' : 'border-l-4 border-ok bg-surface text-ok'">{{ notice.text }}</p>

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
              <p class="mt-1.5 text-sm text-muted">Envoyée par e-mail à {{ selected.email }}, avec le message d'origine cité.</p>
              <button type="submit" class="btn btn-primary mt-4" :disabled="busy !== '' || reply.trim().length < 2">
                <span v-if="busy === 'reply'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
                {{ busy === 'reply' ? 'Envoi de la réponse' : 'Envoyer la réponse' }}
              </button>
            </form>
          </article>
        </div>
        </div>

        <div v-if="section === 'activite'">
          <h1 class="text-xl font-semibold tracking-tight">Activité</h1>
          <p class="mt-2 text-muted">Démonstrations réservées et comptes du site.</p>
          <div v-if="!overview" class="mt-8 flex items-center gap-3 text-muted">
            <span class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />Chargement
          </div>
          <div v-else class="mt-8 grid gap-6 lg:grid-cols-2">
            <section class="panel p-6">
              <h2 class="text-lg font-semibold">Démonstrations à venir</h2>
              <p v-if="!overview.bookings.length" class="mt-3 text-muted">Aucune démonstration réservée.</p>
              <ul v-else class="mt-3 divide-y divide-line">
                <li v-for="b in overview.bookings" :key="b.id" class="py-3">
                  <p class="font-medium">{{ fmt(b.starts_at) }}</p>
                  <p class="text-sm text-muted">{{ b.name }}<template v-if="b.company">, {{ b.company }}</template>, <a :href="`mailto:${b.email}`" class="link">{{ b.email }}</a></p>
                  <p v-if="b.notes" class="mt-1 whitespace-pre-wrap text-sm">{{ b.notes }}</p>
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
        </div>

        <AdminFeatures v-if="section === 'elements'" />
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

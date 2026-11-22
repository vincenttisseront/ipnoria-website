<script setup lang="ts">
// Espace d'administration (français seulement, non indexé) : messages de contact, réponses, effacement.
definePageMeta({ layout: false })
useSeoMeta({ title: 'Administration', robots: 'noindex, nofollow' })

interface Message {
  id: string, created_at: string, locale: string, name: string, email: string, company: string, topic: string,
  message: string, handled_at: string | null, replied_at: string | null, reply_body: string | null
}
const route = useRoute()
const { data: me } = await useFetch<{ enabled: boolean, user: { email: string, name: string } | null }>('/api/admin/me')

const filter = ref<'ouverts' | 'traites' | 'tous'>('ouverts')
const { data: list, refresh, status } = await useFetch<{ messages: Message[], stats: { open: number, total: number, subscribers: number } }>(
  '/api/admin/messages', { query: { filtre: filter }, immediate: Boolean(me.value?.user), watch: [filter] },
)
const { data: overview } = await useFetch<{ bookings: Array<{ id: string, starts_at: string, name: string, email: string, company: string, notes: string }>, votes: Array<{ id: string, title: string, votes: number, pending: number }> }>(
  '/api/admin/overview', { immediate: Boolean(me.value?.user) },
)
const selectedId = ref<string | null>(null)
const selected = computed(() => list.value?.messages.find(m => m.id === selectedId.value) ?? list.value?.messages[0] ?? null)

const busy = ref<'' | 'handled' | 'reply' | 'delete' | 'logout'>('')
const notice = ref<{ kind: 'ok' | 'error', text: string } | null>(null)
const reply = ref('')
const confirmDelete = ref(false)
const confirmBtn = ref<HTMLButtonElement | null>(null)

const errors: Record<string, string> = {
  session: 'La connexion a expiré avant la fin. Reconnectez-vous.',
  fournisseur: 'Le fournisseur d\'identité a refusé la connexion. Réessayez, ou vérifiez la configuration OIDC.',
  refuse: 'Ce compte n\'est pas autorisé. Ajoutez son adresse à NUXT_ADMIN_EMAILS.',
}
const loginError = computed(() => errors[String(route.query.erreur ?? '')] ?? '')

const topics: Record<string, string> = { demo: 'Démonstration', question: 'Question technique', feedback: 'Retour d\'essai', partnership: 'Partenariat', other: 'Autre' }
const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

async function act(kind: typeof busy.value, fn: () => Promise<unknown>, ok: string) {
  busy.value = kind
  notice.value = null
  try { await fn(); notice.value = { kind: 'ok', text: ok }; await refresh() }
  catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode
    notice.value = { kind: 'error', text: code === 503 ? 'Envoi impossible : le serveur SMTP n\'est pas configuré.' : code === 401 ? 'Session expirée : reconnectez-vous.' : 'L\'action a échoué. Réessayez.' }
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
  <div class="min-h-dvh">
    <header class="border-b border-line">
      <div class="wrap flex h-16 items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2.5 text-fg no-underline"><BrandMark /><span class="font-semibold">Ipnoria</span><span class="text-muted">administration</span></NuxtLink>
        <div v-if="me?.user" class="flex items-center gap-4 text-sm">
          <span class="text-muted">{{ me.user.email }}</span>
          <button type="button" class="btn btn-secondary !min-h-9 !py-1.5" :disabled="busy === 'logout'" @click="logout">Se déconnecter</button>
        </div>
      </div>
    </header>

    <main class="wrap py-10">
      <div v-if="!me?.enabled" class="panel max-w-xl p-7">
        <h1 class="text-xl font-semibold">Administration désactivée</h1>
        <p class="mt-2 text-muted">Renseignez NUXT_OIDC_ISSUER, NUXT_OIDC_CLIENT_ID, NUXT_SESSION_PASSWORD (32 caractères au moins) et NUXT_ADMIN_EMAILS, puis redémarrez le site.</p>
      </div>

      <div v-else-if="!me.user" class="panel max-w-xl p-7">
        <h1 class="text-xl font-semibold">Connexion</h1>
        <p class="mt-2 text-muted">L'accès passe par votre fournisseur d'identité (SSO).</p>
        <p v-if="loginError" role="alert" class="mt-4 rounded-lg border-l-4 border-alert bg-bg px-4 py-3 text-alert">{{ loginError }}</p>
        <a href="/auth/login" class="btn btn-primary mt-6">Se connecter avec le SSO</a>
      </div>

      <template v-else>
        <div class="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 class="text-h2">Messages</h1>
            <p v-if="list" class="mt-2 text-muted">{{ list.stats.open }} à traiter sur {{ list.stats.total }}, {{ list.stats.subscribers }} abonné(s) aux alertes de version</p>
          </div>
          <div role="radiogroup" aria-label="Filtre" class="flex rounded-lg border border-line p-0.5 text-sm">
            <button
              v-for="f in (['ouverts', 'traites', 'tous'] as const)" :key="f" type="button" role="radio" :aria-checked="filter === f"
              class="rounded-md px-3 py-1.5" :class="filter === f ? 'bg-raised text-fg' : 'text-muted hover:text-fg'" @click="filter = f; selectedId = null"
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
              <div class="flex gap-2">
                <button type="button" class="btn btn-secondary !min-h-9 !py-1.5 text-sm" :disabled="busy !== ''" @click="toggleHandled(selected)">
                  <span v-if="busy === 'handled'" class="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />
                  {{ selected.handled_at ? 'Remettre à traiter' : 'Marquer traité' }}
                </button>
                <button type="button" class="btn btn-secondary !min-h-9 !py-1.5 text-sm text-alert" :disabled="busy !== ''" @click="confirmDelete = true">Supprimer</button>
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
        <div v-if="overview" class="mt-14 grid gap-6 lg:grid-cols-2">
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
            <h2 class="text-lg font-semibold">Votes de la feuille de route</h2>
            <table class="mt-3 w-full text-sm">
              <thead><tr class="text-left text-muted"><th class="py-1.5 font-medium">Élément</th><th class="py-1.5 font-medium">Votes</th><th class="py-1.5 font-medium">En attente</th></tr></thead>
              <tbody>
                <tr v-for="v in overview.votes" :key="v.id" class="border-t border-line"><td class="py-1.5">{{ v.title }}</td><td class="py-1.5 font-mono">{{ v.votes }}</td><td class="py-1.5 font-mono text-muted">{{ v.pending }}</td></tr>
              </tbody>
            </table>
          </section>
        </div>
      </template>
    </main>

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

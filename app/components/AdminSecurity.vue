<script setup lang="ts">
// Sécurité (administration) : journal des actions d'administration, remerciements de la page de divulgation.
type Entry = { id: string, admin: string, action: string, targetType: string, targetId: string | null, details: Record<string, unknown>, at: string }
type Ack = { id: string, name: string, url: string | null, summary: Record<string, string>, month: string }
const filterAdmin = ref('')
const adminDraft = ref('')
const filterType = ref('')
const { data: log, refresh: refreshLog } = await useFetch<Entry[]>('/api/admin/audit', { query: computed(() => ({ admin: filterAdmin.value || undefined, type: filterType.value || undefined })), default: () => [] })
const { data: sec, refresh: refreshSec } = await useFetch<{ acknowledgments: Ack[] }>('/api/security', { default: () => ({ acknowledgments: [] }) })
type Operator = { email: string, account: boolean, mfa: boolean, lastLogin: string | null, self: boolean }
const { data: people, refresh: refreshPeople } = await useFetch<{ operators: Operator[] }>('/api/admin/operators', { default: () => ({ operators: [] }) })
const ACTIONS: Record<string, string> = {
  login: 'Connexion',
  'mfa.enable': 'Second facteur activé',
  'feature.enable': 'Élément affiché',
  'feature.disable': 'Élément masqué',
  'message.update': 'Message mis à jour',
  'message.delete': 'Message supprimé',
  'message.reply': 'Réponse envoyée',
  'template.create': 'Texte enregistré',
  'template.delete': 'Texte retiré',
  'booking.cancel': 'Démonstration annulée',
  'booking.close': 'Jour fermé',
  'booking.open': 'Jour rouvert',
  'announcement.update': 'Annonce mise à jour',
  'session.revoke': 'Session clôturée',
  'beta.remind': 'Testeurs relancés',
  'beta.quotas': 'Objectifs enregistrés',
  'beta.decision': 'Candidature mise à jour',
  'beta.campaign.update': 'Campagne mise à jour',
  'beta.campaign.create': 'Campagne créée',
  'beta.release.update': 'Version mise à jour',
  'beta.release.create': 'Version créée',
  'reference.create': 'Référence créée',
  'reference.update': 'Référence mise à jour',
  'reference.delete': 'Référence retirée',
  'reference.logo': 'Logo enregistré',
  'reference.logo.delete': 'Logo retiré',
  'security.ack.create': 'Remerciement ajouté',
  'security.ack.delete': 'Remerciement retiré',
  'social.carousel': 'Visuel préparé',
  'idea.update': 'Idée mise à jour',
  'idea.reply': 'Réponse publiée',
  'idea.comment.hide': 'Commentaire masqué',
}
const TARGETS: Record<string, string> = {
  session: 'Connexion',
  user: 'Compte',
  feature: 'Élément du site',
  contact_message: 'Message',
  reply_template: 'Réponse type',
  booking: 'Démonstration',
  booking_closure: 'Jour fermé',
  announcement: 'Annonce',
  beta_settings: 'Objectifs',
  beta_application: 'Candidature',
  beta_campaign: 'Campagne',
  beta_release: 'Version',
  customer_reference: 'Référence',
  security_acknowledgment: 'Remerciement',
  idea: 'Idée',
  idea_comment: 'Commentaire',
}
const FEATURES: Record<string, string> = { contact: 'Contact', booking: 'Rendez-vous', demo: 'Démo', newsletter: 'Alertes de version' }
const actionLabel = (action: string) => ACTIONS[action] ?? 'Action'
const objectLabel = (e: Entry) => {
  if (e.targetType === 'feature' && e.targetId && FEATURES[e.targetId]) return FEATURES[e.targetId]
  if (e.targetType === 'session' && e.targetId?.includes('@')) return e.targetId
  if (e.targetType === 'booking_closure' && e.targetId) return e.targetId
  return TARGETS[e.targetType] || 'Élément'
}
function objectHref(e: Entry): string | null {
  if (e.targetType === 'contact_message' && e.targetId) return `/admin?section=messages&message=${encodeURIComponent(e.targetId)}`
  if (e.targetType === 'customer_reference') return '/admin?section=references'
  if (e.targetType === 'feature' || e.targetType === 'announcement') return '/admin?section=elements'
  if (e.targetType === 'beta_application' || e.targetType === 'beta_release' || e.targetType === 'beta_campaign') return '/admin?section=beta'
  if (e.targetType === 'idea' || e.targetType === 'idea_comment') return '/admin?section=idees'
  if (e.targetType === 'booking' || e.targetType === 'booking_closure') return '/admin?section=activite'
  if (e.targetType === 'reply_template') return '/admin?section=messages'
  return null
}
function applyPerson() { filterAdmin.value = adminDraft.value.trim().toLowerCase() }
const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })
const form = reactive({ name: '', url: '', summaryFr: '', summaryEn: '', reportedOn: '' })
const busy = ref(false)
const notice = ref('')
async function addAck() {
  busy.value = true; notice.value = ''
  try {
    await $fetch('/api/admin/security/acknowledgments', { method: 'POST', body: { name: form.name, url: form.url, summary: { fr: form.summaryFr, en: form.summaryEn }, reportedOn: form.reportedOn } })
    Object.assign(form, { name: '', url: '', summaryFr: '', summaryEn: '', reportedOn: '' }); await Promise.all([refreshSec(), refreshLog()]); notice.value = 'Ajouté à la page de divulgation.'
  }
  catch { notice.value = 'Vérifiez le nom, l’adresse et la date, puis réessayez.' }
  finally { busy.value = false }
}
const confirmId = ref<string | null>(null)
const revokeEmail = ref<string | null>(null)
const busyOp = ref(false)
const opNotice = ref('')
async function removeAck(id: string) {
  await $fetch(`/api/admin/security/acknowledgments/${id}`, { method: 'DELETE' }); confirmId.value = null; await Promise.all([refreshSec(), refreshLog()])
}
async function revoke(person: Operator) {
  busyOp.value = true
  opNotice.value = ''
  try {
    const r = await $fetch<{ self: boolean }>('/api/admin/operators/revoke', { method: 'POST', body: { email: person.email } })
    if (r.self) { await navigateTo('/admin', { external: true }); return }
    revokeEmail.value = null
    await Promise.all([refreshPeople(), refreshLog()])
    opNotice.value = 'Session clôturée. La personne devra se reconnecter.'
  }
  catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode
    opNotice.value = code === 401 ? 'Reconnectez-vous.' : 'La session n’a pas pu être clôturée. Réessayez.'
  }
  finally { busyOp.value = false }
}
</script>

<template>
  <section aria-labelledby="as-title">
    <h2 id="as-title" class="text-xl font-semibold tracking-tight">Sécurité</h2>
    <section class="panel mt-6 p-5" aria-labelledby="op-title">
      <h3 id="op-title" class="font-semibold">Personnes</h3>
      <p class="mt-1 max-w-2xl text-sm text-muted">Dernière connexion et second facteur. Clôturer une session oblige à se reconnecter.</p>
      <p v-if="opNotice" role="status" class="mt-3 text-sm">{{ opNotice }}</p>
      <ul class="mt-4 divide-y divide-line">
        <li v-for="p in people?.operators ?? []" :key="p.email" class="flex flex-wrap items-center justify-between gap-3 py-3">
          <div class="min-w-0">
            <p class="truncate font-medium">{{ p.email }}<span v-if="p.self" class="text-muted">, vous</span></p>
            <p class="text-sm text-muted">
              <template v-if="!p.account">Pas de compte sur le site</template>
              <template v-else>{{ p.mfa ? 'Second facteur actif' : 'Pas encore activé' }}</template>,
              {{ p.lastLogin ? `dernière connexion le ${fmt(p.lastLogin)}` : 'jamais connecté' }}
            </p>
          </div>
          <div v-if="revokeEmail === p.email" class="flex flex-wrap items-center gap-2">
            <p class="text-sm text-muted">{{ p.self ? 'Vous devrez vous reconnecter.' : 'Cette personne devra se reconnecter.' }}</p>
            <button type="button" class="btn btn-secondary text-sm" :disabled="busyOp" @click="revokeEmail = null">Garder</button>
            <button type="button" class="btn bg-alert text-sm text-bg hover:opacity-90" :disabled="busyOp" @click="revoke(p)">Clôturer</button>
          </div>
          <button v-else type="button" class="btn btn-secondary text-sm" @click="revokeEmail = p.email">Clôturer la session</button>
        </li>
        <li v-if="!(people?.operators ?? []).length" class="py-3 text-sm text-muted">Aucune personne autorisée.</li>
      </ul>
    </section>
    <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem]">
      <div class="panel p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="font-semibold">Journal d'administration</h3>
          <form class="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center" @submit.prevent="applyPerson">
            <label class="sr-only" for="au-a">Personne</label>
            <input id="au-a" v-model="adminDraft" class="field min-h-11 w-full text-sm sm:w-56" placeholder="Adresse exacte" autocomplete="off" spellcheck="false">
            <button type="submit" class="btn btn-secondary text-sm">Filtrer</button>
            <label class="sr-only" for="au-t">Objet</label>
            <select id="au-t" v-model="filterType" class="field min-h-11 !w-auto text-sm">
              <option value="">Tous les objets</option>
              <option v-for="(label, key) in TARGETS" :key="key" :value="key">{{ label }}</option>
            </select>
          </form>
        </div>
        <div class="mt-4 max-h-[28rem] overflow-auto">
          <table class="w-full min-w-[40rem] text-sm">
            <thead class="sticky top-0 bg-surface text-left text-muted"><tr><th class="py-1.5 font-medium">Quand</th><th class="font-medium">Qui</th><th class="font-medium">Action</th><th class="font-medium">Objet</th></tr></thead>
            <tbody>
              <tr v-for="e in log" :key="e.id" class="border-t border-line align-top">
                <td class="whitespace-nowrap py-1.5 pr-3">{{ fmt(e.at) }}</td>
                <td class="pr-3">{{ e.admin }}</td>
                <td class="pr-3">{{ actionLabel(e.action) }}</td>
                <td class="py-1 pr-3">
                  <NuxtLink v-if="objectHref(e)" :to="objectHref(e)!" class="link inline-flex min-h-11 items-center">{{ objectLabel(e) }}</NuxtLink>
                  <span v-else class="inline-flex min-h-11 items-center">{{ objectLabel(e) }}</span>
                </td>
              </tr>
              <tr v-if="!log?.length"><td colspan="4" class="py-4 text-muted">Aucune action enregistrée.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel space-y-4 p-5">
        <h3 class="font-semibold">Remerciements (divulgation)</h3>
        <ul class="divide-y divide-line text-sm">
          <li v-for="a in sec.acknowledgments" :key="a.id" class="flex items-center justify-between gap-2 py-2">
            <span>{{ a.name }} <span class="text-muted">{{ a.month }}</span></span>
            <span v-if="confirmId === a.id"><button type="button" class="text-alert" @click="removeAck(a.id)">Retirer</button> <button type="button" class="ml-2 text-muted" @click="confirmId = null">Annuler</button></span>
            <button v-else type="button" class="text-muted hover:text-alert" @click="confirmId = a.id">Retirer</button>
          </li>
        </ul>
        <form class="space-y-3" @submit.prevent="addAck">
          <div><label for="ak-n" class="field-label">Nom ou pseudonyme</label><input id="ak-n" v-model="form.name" class="field" maxlength="80" required></div>
          <div><label for="ak-u" class="field-label">Lien (facultatif)</label><input id="ak-u" v-model="form.url" class="field" maxlength="200" inputmode="url"></div>
          <div><label for="ak-sf" class="field-label">Résumé (FR)</label><input id="ak-sf" v-model="form.summaryFr" class="field" maxlength="200" placeholder="Contournement de la limite de débit"></div>
          <div><label for="ak-se" class="field-label">Résumé (EN)</label><input id="ak-se" v-model="form.summaryEn" class="field" maxlength="200"></div>
          <div><label for="ak-d" class="field-label">Date du signalement</label><input id="ak-d" v-model="form.reportedOn" type="date" class="field" required></div>
          <p v-if="notice" role="status" class="text-sm">{{ notice }}</p>
          <button type="submit" class="btn btn-secondary" :disabled="busy">Ajouter</button>
        </form>
      </div>
    </div>
  </section>
</template>

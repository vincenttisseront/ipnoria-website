<script setup lang="ts">
// Sécurité (administration) : journal des actions d'administration, remerciements de la page de divulgation.
type Entry = { id: string, admin: string, action: string, targetType: string, targetId: string | null, details: Record<string, unknown>, at: string }
type Ack = { id: string, name: string, url: string | null, summary: Record<string, string>, month: string }
const filterAdmin = ref('')
const filterType = ref('')
const { data: log, refresh: refreshLog } = await useFetch<Entry[]>('/api/admin/audit', { query: computed(() => ({ admin: filterAdmin.value || undefined, type: filterType.value || undefined })), default: () => [] })
const { data: sec, refresh: refreshSec } = await useFetch<{ acknowledgments: Ack[] }>('/api/security', { default: () => ({ acknowledgments: [] }) })
const ACTIONS: Record<string, string> = {
  login: 'Connexion',
  'mfa.enable': 'Second facteur activé',
  'feature.enable': 'Élément affiché',
  'feature.disable': 'Élément masqué',
  'message.update': 'Message mis à jour',
  'message.delete': 'Message supprimé',
  'message.reply': 'Réponse envoyée',
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
const objectLabel = (e: Entry) => (e.targetType === 'feature' && e.targetId && FEATURES[e.targetId]) || TARGETS[e.targetType] || 'Élément'
const admins = computed(() => [...new Set((log.value ?? []).map(e => e.admin))])
const types = computed(() => [...new Set((log.value ?? []).map(e => e.targetType))])
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
async function removeAck(id: string) {
  await $fetch(`/api/admin/security/acknowledgments/${id}`, { method: 'DELETE' }); confirmId.value = null; await Promise.all([refreshSec(), refreshLog()])
}
</script>

<template>
  <section aria-labelledby="as-title">
    <h2 id="as-title" class="text-xl font-semibold tracking-tight">Sécurité</h2>
    <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem]">
      <div class="panel p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="font-semibold">Journal d'administration</h3>
          <div class="flex gap-2 text-sm">
            <label class="sr-only" for="au-a">Administrateur</label>
            <select id="au-a" v-model="filterAdmin" class="field !w-auto py-1.5 text-sm"><option value="">Tous les administrateurs</option><option v-for="a in admins" :key="a" :value="a">{{ a }}</option></select>
            <label class="sr-only" for="au-t">Objet</label>
            <select id="au-t" v-model="filterType" class="field !w-auto py-1.5 text-sm"><option value="">Tous les objets</option><option v-for="x in types" :key="x" :value="x">{{ TARGETS[x] ?? 'Élément' }}</option></select>
          </div>
        </div>
        <div class="mt-4 max-h-[28rem] overflow-auto">
          <table class="w-full min-w-[40rem] text-sm">
            <thead class="sticky top-0 bg-surface text-left text-muted"><tr><th class="py-1.5 font-medium">Quand</th><th class="font-medium">Qui</th><th class="font-medium">Action</th><th class="font-medium">Objet</th></tr></thead>
            <tbody>
              <tr v-for="e in log" :key="e.id" class="border-t border-line align-top">
                <td class="whitespace-nowrap py-1.5 pr-3">{{ fmt(e.at) }}</td>
                <td class="pr-3">{{ e.admin }}</td>
                <td class="pr-3">{{ actionLabel(e.action) }}</td>
                <td class="pr-3">{{ objectLabel(e) }}</td>
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

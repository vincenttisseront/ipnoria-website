<script setup lang="ts">
import { REFERENCE_SECTORS } from '#shared/account'
import { REPORT_STATUSES } from '#shared/beta'

// Programme bêta (administration, en français) : candidatures et objectifs, versions, campagnes, signalements.
const SECTOR: Record<string, string> = { pme: 'PME', collectivite: 'Collectivité', enseignement: 'Enseignement', sante: 'Santé', industrie: 'Industrie', services: 'Services', association: 'Association', autre: 'Autre' }
const SIZE: Record<string, string> = { lt100: '< 100', lt500: '100–500', lt2000: '500–2 000', gt2000: '> 2 000' }
const APP: Record<string, string> = { pending: 'En attente', accepted: 'Accepté', waitlist: 'Liste d\'attente', declined: 'Refusé', left: 'Parti' }
const REP: Record<string, string> = { new: 'Nouveau', need_info: 'Infos demandées', confirmed: 'Confirmé', in_progress: 'En cours', fixed: 'Corrigé', wontfix: 'Ne sera pas corrigé', duplicate: 'Doublon' }
const SEV: Record<string, string> = { blocker: 'Bloquant', major: 'Majeur', minor: 'Mineur', suggestion: 'Suggestion' }

const tab = ref<'apps' | 'releases' | 'campaigns' | 'reports'>('apps')
const notice = ref<{ ok: boolean, text: string } | null>(null)
const busy = ref('')
const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
async function run(kind: string, fn: () => Promise<unknown>, ok: string | ((r: unknown) => string)) {
  busy.value = kind; notice.value = null
  try { const r = await fn(); notice.value = { ok: true, text: typeof ok === 'string' ? ok : ok(r) } }
  catch (e) { notice.value = { ok: false, text: `Échec : ${(e as { data?: { data?: { code?: string }, statusMessage?: string } }).data?.data?.code ?? (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'erreur serveur'}` } }
  finally { busy.value = '' }
}

// Candidatures
type App = { id: string, status: string, sector: string, orgSize: string, hypervisor: string, currentStack: string[], activeDirectory: boolean, wifi8021x: boolean, services: string[], hours: string, motivation: string, decisionNote: string | null, createdAt: string, name: string, email: string, organization: string | null, referredBy: string | null, referrals: number, reports: number, signed: boolean }
const { data: apps, refresh: refreshApps } = await useFetch<{ applications: App[], quotas: Record<string, number> }>('/api/admin/beta/applications', { default: () => ({ applications: [], quotas: {} }) })
const appFilter = ref('pending')
const shownApps = computed(() => apps.value.applications.filter(a => appFilter.value === 'all' || a.status === appFilter.value))
const segments = computed(() => REFERENCE_SECTORS.map(s => ({
  sector: s,
  accepted: apps.value.applications.filter(a => a.sector === s && a.status === 'accepted').length,
  pending: apps.value.applications.filter(a => a.sector === s && a.status === 'pending').length,
  target: apps.value.quotas[s] ?? 0,
})))
const quotas = reactive<Record<string, number>>({})
watchEffect(() => { for (const s of REFERENCE_SECTORS) quotas[s] = apps.value.quotas[s] ?? 0 })
const selApp = ref<App | null>(null)
const decisionNote = ref('')
const decide = (status: string) => run(`app-${status}`, async () => {
  await $fetch(`/api/admin/beta/applications/${selApp.value!.id}`, { method: 'PATCH', body: { status, note: decisionNote.value } })
  await refreshApps(); selApp.value = apps.value.applications.find(a => a.id === selApp.value!.id) ?? null; decisionNote.value = ''
}, `Décision enregistrée (${APP[status]}), e-mail envoyé.`)
const saveQuotas = () => run('quotas', async () => { await $fetch('/api/admin/beta/quotas', { method: 'PUT', body: { ...quotas } }); await refreshApps() }, 'Objectifs enregistrés.')

// Versions
type Rel = { id: string, version: string, title: Record<string, string>, notes: Record<string, string>, fileName: string, size: number | null, sha256: string | null, published: boolean, downloads: number, testers: number }
const { data: rels, refresh: refreshRels } = await useFetch<{ releases: Rel[], filesDir: boolean }>('/api/admin/beta/releases', { default: () => ({ releases: [], filesDir: false }) })
const relForm = reactive({ version: '', titleFr: '', titleEn: '', notesFr: '', notesEn: '', fileName: '', published: false })
function editRel(r: Rel | null) {
  Object.assign(relForm, r ? { version: r.version, titleFr: r.title.fr ?? '', titleEn: r.title.en ?? '', notesFr: r.notes.fr ?? '', notesEn: r.notes.en ?? '', fileName: r.fileName, published: r.published } : { version: '', titleFr: '', titleEn: '', notesFr: '', notesEn: '', fileName: '', published: false })
}
const saveRel = () => run('rel', async () => {
  const r = await $fetch<{ notified: number, sha256: string }>('/api/admin/beta/releases', { method: 'POST', body: { version: relForm.version, title: { fr: relForm.titleFr, en: relForm.titleEn }, notes: { fr: relForm.notesFr, en: relForm.notesEn }, fileName: relForm.fileName, published: relForm.published } })
  await refreshRels(); return r
}, r => `Version enregistrée (SHA-256 ${(r as { sha256: string }).sha256.slice(0, 12)}…)${(r as { notified: number }).notified ? `, ${(r as { notified: number }).notified} testeur(s) prévenu(s)` : ''}.`)

// Campagnes
type Camp = { id: string, title: Record<string, string>, body: Record<string, string>, steps: Array<Record<string, string>>, version: string | null, startsOn: string | null, endsOn: string | null, published: boolean, participants: number, outcomes: Record<string, number>, stepResults: Array<{ ok: number, ko: number, notes: string[] }>, comments: Array<{ name: string, comment: string }> }
const { data: camps, refresh: refreshCamps } = await useFetch<Camp[]>('/api/admin/beta/campaigns', { default: () => [] })
const campForm = reactive({ id: '', titleFr: '', titleEn: '', bodyFr: '', bodyEn: '', stepsFr: '', stepsEn: '', version: '', startsOn: '', endsOn: '', published: false })
const selCamp = computed(() => camps.value.find(c => c.id === campForm.id) ?? null)
function editCamp(c: Camp | null) {
  Object.assign(campForm, c
    ? { id: c.id, titleFr: c.title.fr ?? '', titleEn: c.title.en ?? '', bodyFr: c.body.fr ?? '', bodyEn: c.body.en ?? '', stepsFr: c.steps.map(s => s.fr ?? '').join('\n'), stepsEn: c.steps.map(s => s.en ?? '').join('\n'), version: c.version ?? '', startsOn: c.startsOn ?? '', endsOn: c.endsOn ?? '', published: c.published }
    : { id: '', titleFr: '', titleEn: '', bodyFr: '', bodyEn: '', stepsFr: '', stepsEn: '', version: '', startsOn: '', endsOn: '', published: false })
}
const saveCamp = () => run('camp', async () => {
  const fr = campForm.stepsFr.split('\n').map(s => s.trim()).filter(Boolean)
  const en = campForm.stepsEn.split('\n').map(s => s.trim())
  const r = await $fetch<{ id: string, notified: number }>('/api/admin/beta/campaigns', {
    method: 'POST',
    body: { id: campForm.id || undefined, title: { fr: campForm.titleFr, en: campForm.titleEn }, body: { fr: campForm.bodyFr, en: campForm.bodyEn }, steps: fr.map((s, i) => ({ fr: s, en: en[i] ?? '' })), version: campForm.version, startsOn: campForm.startsOn, endsOn: campForm.endsOn, published: campForm.published },
  })
  campForm.id = r.id; await refreshCamps(); return r
}, r => `Campagne enregistrée${(r as { notified: number }).notified ? `, ${(r as { notified: number }).notified} testeur(s) prévenu(s)` : ''}.`)

// Signalements
type Rep = { id: string, version: string, module: string, severity: string, title: string, status: string, known: boolean, fixedIn: string | null, updatedAt: string, name: string | null, comments: number }
type RepDetail = Omit<Rep, 'comments'> & { steps: string, expected: string, actual: string, logs: string | null, email: string | null, comments: Array<{ id: string, team: boolean, body: string, createdAt: string }> }
const { data: reps, refresh: refreshReps } = await useFetch<Rep[]>('/api/admin/beta/reports', { default: () => [] })
const rep = ref<RepDetail | null>(null)
const repForm = reactive({ status: 'new', known: false, fixedIn: '' })
const repReply = ref('')
async function openRep(id: string) {
  rep.value = await $fetch<RepDetail>(`/api/admin/beta/reports/${id}`)
  Object.assign(repForm, { status: rep.value.status, known: rep.value.known, fixedIn: rep.value.fixedIn ?? '' })
}
const saveRep = () => run('rep', async () => { await $fetch(`/api/admin/beta/reports/${rep.value!.id}`, { method: 'PATCH', body: repForm }); await refreshReps(); await openRep(rep.value!.id) }, 'Signalement mis à jour.')
const replyRep = () => run('reply', async () => { await $fetch(`/api/admin/beta/reports/${rep.value!.id}/comments`, { method: 'POST', body: { body: repReply.value } }); repReply.value = ''; await openRep(rep.value!.id) }, 'Réponse envoyée au testeur.')
</script>

<template>
  <section aria-labelledby="ab-title">
    <h2 id="ab-title" class="text-xl font-semibold tracking-tight">Programme bêta</h2>
    <div role="tablist" class="mt-4 flex gap-1 border-b border-line">
      <button v-for="[k, l] in ([['apps', 'Candidatures'], ['releases', 'Versions'], ['campaigns', 'Campagnes'], ['reports', 'Signalements']] as const)" :key="k" type="button" role="tab" :aria-selected="tab === k" class="-mb-px border-b-2 px-3 py-2 text-sm" :class="tab === k ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'" @click="tab = k; notice = null">{{ l }}</button>
    </div>
    <p v-if="notice" role="status" class="mt-4 rounded-lg border px-4 py-2.5 text-sm" :class="notice.ok ? 'border-ok/40 bg-ok/10' : 'border-alert/40 bg-alert/10'">{{ notice.text }}</p>

    <!-- Candidatures -->
    <div v-if="tab === 'apps'" class="mt-6 space-y-6">
      <div class="panel overflow-x-auto p-5">
        <table class="w-full min-w-[36rem] text-sm">
          <thead><tr class="text-left text-muted"><th class="py-1.5 font-medium">Secteur</th><th class="font-medium">Acceptés</th><th class="font-medium">En attente</th><th class="font-medium">Objectif</th><th class="font-medium">Avancement</th></tr></thead>
          <tbody>
            <tr v-for="s in segments" :key="s.sector" class="border-t border-line">
              <td class="py-1.5">{{ SECTOR[s.sector] }}</td><td class="font-mono">{{ s.accepted }}</td><td class="font-mono">{{ s.pending }}</td>
              <td><label class="sr-only" :for="`q-${s.sector}`">Objectif {{ SECTOR[s.sector] }}</label><input :id="`q-${s.sector}`" v-model.number="quotas[s.sector]" type="number" min="0" class="field w-20 py-1 text-sm"></td>
              <td class="w-48"><div class="h-1.5 rounded-full bg-raised"><div class="h-1.5 rounded-full" :class="s.accepted >= s.target ? 'bg-ok' : 'bg-accent'" :style="{ width: `${Math.min(100, s.target ? (s.accepted / s.target) * 100 : 0)}%` }" /></div></td>
            </tr>
          </tbody>
        </table>
        <button type="button" class="btn btn-secondary mt-4" :disabled="!!busy" @click="saveQuotas">Enregistrer les objectifs</button>
      </div>
      <div class="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div>
          <label class="flex items-center gap-2 text-sm">Afficher
            <select v-model="appFilter" class="field !w-auto py-1.5 text-sm"><option value="all">Toutes</option><option v-for="(l, k) in APP" :key="k" :value="k">{{ l }}</option></select>
          </label>
          <ul class="panel mt-3 max-h-[36rem] divide-y divide-line overflow-y-auto">
            <li v-for="a in shownApps" :key="a.id">
              <button type="button" class="w-full px-4 py-3 text-left hover:bg-raised" :class="selApp?.id === a.id ? 'bg-raised' : ''" @click="selApp = a; decisionNote = a.decisionNote ?? ''">
                <p class="font-medium">{{ a.name }}<span v-if="a.organization" class="text-muted">, {{ a.organization }}</span></p>
                <p class="text-sm text-muted">{{ SECTOR[a.sector] }}, {{ SIZE[a.orgSize] }}, {{ APP[a.status] }}</p>
              </button>
            </li>
            <li v-if="!shownApps.length" class="px-4 py-6 text-muted">Aucune candidature.</li>
          </ul>
        </div>
        <article v-if="selApp" class="panel p-6">
          <p class="font-semibold">{{ selApp.name }} <span class="font-normal text-muted">({{ selApp.email }})</span></p>
          <dl class="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt class="text-muted">Secteur, taille</dt><dd>{{ SECTOR[selApp.sector] }}, {{ SIZE[selApp.orgSize] }} postes</dd></div>
            <div><dt class="text-muted">Hyperviseur</dt><dd>{{ selApp.hypervisor }}</dd></div>
            <div><dt class="text-muted">Existant</dt><dd>{{ selApp.currentStack.join(', ') || '—' }}</dd></div>
            <div><dt class="text-muted">Services à tester</dt><dd>{{ selApp.services.join(', ') }}</dd></div>
            <div><dt class="text-muted">AD, 802.1X</dt><dd>{{ selApp.activeDirectory ? 'AD' : 'sans AD' }}, {{ selApp.wifi8021x ? '802.1X' : 'sans 802.1X' }}</dd></div>
            <div><dt class="text-muted">Temps disponible</dt><dd>{{ selApp.hours }}</dd></div>
            <div><dt class="text-muted">Parrainage</dt><dd>{{ selApp.referredBy ? `invité par ${selApp.referredBy}` : '—' }}, {{ selApp.referrals }} filleul(s)</dd></div>
            <div><dt class="text-muted">Accord, signalements</dt><dd>{{ selApp.signed ? 'signé' : 'non signé' }}, {{ selApp.reports }}</dd></div>
          </dl>
          <p class="mt-4 whitespace-pre-line text-sm">{{ selApp.motivation }}</p>
          <label for="ab-note" class="field-label mt-5">Mot joint à l'e-mail (facultatif)</label>
          <textarea id="ab-note" v-model="decisionNote" class="field min-h-20" maxlength="2000" />
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" :disabled="!!busy" @click="decide('accepted')">Accepter</button>
            <button type="button" class="btn btn-secondary" :disabled="!!busy" @click="decide('waitlist')">Liste d'attente</button>
            <button type="button" class="btn btn-secondary" :disabled="!!busy" @click="decide('declined')">Refuser</button>
          </div>
        </article>
      </div>
    </div>

    <!-- Versions -->
    <div v-else-if="tab === 'releases'" class="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
      <ul class="panel divide-y divide-line">
        <li><button type="button" class="w-full px-4 py-3 text-left text-accent hover:bg-raised" @click="editRel(null)">Nouvelle version</button></li>
        <li v-for="r in rels.releases" :key="r.id">
          <button type="button" class="w-full px-4 py-3 text-left hover:bg-raised" @click="editRel(r)">
            <p class="font-medium">{{ r.version }} <span class="text-sm" :class="r.published ? 'text-ok' : 'text-muted'">{{ r.published ? 'publiée' : 'brouillon' }}</span></p>
            <p class="text-sm text-muted">{{ r.downloads }} téléchargement(s) par {{ r.testers }} testeur(s)</p>
          </button>
        </li>
      </ul>
      <form class="panel space-y-4 p-6" @submit.prevent="saveRel">
        <p v-if="!rels.filesDir" class="rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-sm">Aucun dossier bêta configuré (NUXT_BETA_FILES_DIR) : les fichiers ne peuvent pas être distribués.</p>
        <div class="grid gap-4 sm:grid-cols-2">
          <div><label for="rv-v" class="field-label">Numéro de version</label><input id="rv-v" v-model="relForm.version" class="field font-mono" required></div>
          <div><label for="rv-f" class="field-label">Fichier (dans le dossier bêta)</label><input id="rv-f" v-model="relForm.fileName" class="field font-mono" required placeholder="ipnoria-0.24.0-beta1.iso"></div>
          <div><label for="rv-tfr" class="field-label">Titre (FR)</label><input id="rv-tfr" v-model="relForm.titleFr" class="field"></div>
          <div><label for="rv-ten" class="field-label">Titre (EN)</label><input id="rv-ten" v-model="relForm.titleEn" class="field"></div>
          <div><label for="rv-nfr" class="field-label">Notes (FR)</label><textarea id="rv-nfr" v-model="relForm.notesFr" class="field min-h-32" /></div>
          <div><label for="rv-nen" class="field-label">Notes (EN)</label><textarea id="rv-nen" v-model="relForm.notesEn" class="field min-h-32" /></div>
        </div>
        <label class="flex items-center gap-2"><input v-model="relForm.published" type="checkbox" class="size-4 accent-[#5b8cff]">Publiée (les testeurs sont prévenus à la première publication)</label>
        <button type="submit" class="btn btn-primary" :disabled="!!busy"><span v-if="busy === 'rel'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />Enregistrer (calcule le SHA-256)</button>
      </form>
    </div>

    <!-- Campagnes -->
    <div v-else-if="tab === 'campaigns'" class="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
      <ul class="panel divide-y divide-line">
        <li><button type="button" class="w-full px-4 py-3 text-left text-accent hover:bg-raised" @click="editCamp(null)">Nouvelle campagne</button></li>
        <li v-for="c in camps" :key="c.id">
          <button type="button" class="w-full px-4 py-3 text-left hover:bg-raised" :class="campForm.id === c.id ? 'bg-raised' : ''" @click="editCamp(c)">
            <p class="font-medium">{{ c.title.fr || c.title.en }}</p>
            <p class="text-sm text-muted">{{ c.published ? 'publiée' : 'brouillon' }}, {{ c.participants }} réponse(s)</p>
          </button>
        </li>
      </ul>
      <div class="space-y-6">
        <form class="panel space-y-4 p-6" @submit.prevent="saveCamp">
          <div class="grid gap-4 sm:grid-cols-2">
            <div><label for="cp-tfr" class="field-label">Titre (FR)</label><input id="cp-tfr" v-model="campForm.titleFr" class="field" required></div>
            <div><label for="cp-ten" class="field-label">Titre (EN)</label><input id="cp-ten" v-model="campForm.titleEn" class="field"></div>
            <div><label for="cp-bfr" class="field-label">Consignes (FR)</label><textarea id="cp-bfr" v-model="campForm.bodyFr" class="field min-h-24" /></div>
            <div><label for="cp-ben" class="field-label">Consignes (EN)</label><textarea id="cp-ben" v-model="campForm.bodyEn" class="field min-h-24" /></div>
            <div><label for="cp-sfr" class="field-label">Étapes (FR, une par ligne)</label><textarea id="cp-sfr" v-model="campForm.stepsFr" class="field min-h-32" required /></div>
            <div><label for="cp-sen" class="field-label">Étapes (EN, même ordre)</label><textarea id="cp-sen" v-model="campForm.stepsEn" class="field min-h-32" /></div>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <div><label for="cp-v" class="field-label">Version</label><input id="cp-v" v-model="campForm.version" class="field font-mono"></div>
            <div><label for="cp-s" class="field-label">Début</label><input id="cp-s" v-model="campForm.startsOn" type="date" class="field"></div>
            <div><label for="cp-e" class="field-label">Fin</label><input id="cp-e" v-model="campForm.endsOn" type="date" class="field"></div>
          </div>
          <label class="flex items-center gap-2"><input v-model="campForm.published" type="checkbox" class="size-4 accent-[#5b8cff]">Publiée (les testeurs sont prévenus à la première publication)</label>
          <button type="submit" class="btn btn-primary" :disabled="!!busy"><span v-if="busy === 'camp'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />Enregistrer</button>
        </form>
        <div v-if="selCamp" class="panel p-6">
          <h3 class="font-semibold">Résultats : {{ selCamp.participants }} réponse(s)</h3>
          <p class="mt-2 text-sm">Réussite {{ selCamp.outcomes.success ?? 0 }}, partielle {{ selCamp.outcomes.partial ?? 0 }}, échec {{ selCamp.outcomes.failure ?? 0 }}</p>
          <ol class="mt-4 space-y-3 text-sm">
            <li v-for="(s, i) in selCamp.steps" :key="i">
              <p>{{ i + 1 }}. {{ s.fr || s.en }} : <span class="text-ok">{{ selCamp.stepResults[i]?.ok }} OK</span>, <span class="text-alert">{{ selCamp.stepResults[i]?.ko }} KO</span></p>
              <ul class="ml-4 text-muted"><li v-for="(n, j) in selCamp.stepResults[i]?.notes" :key="j">{{ n }}</li></ul>
            </li>
          </ol>
          <ul v-if="selCamp.comments.length" class="mt-4 space-y-1 text-sm"><li v-for="(c, i) in selCamp.comments" :key="i"><span class="font-medium">{{ c.name }}</span> : {{ c.comment }}</li></ul>
        </div>
      </div>
    </div>

    <!-- Signalements -->
    <div v-else class="mt-6 grid gap-6 lg:grid-cols-[24rem_1fr]">
      <ul class="panel max-h-[40rem] divide-y divide-line overflow-y-auto">
        <li v-for="r in reps" :key="r.id">
          <button type="button" class="w-full px-4 py-3 text-left hover:bg-raised" :class="rep?.id === r.id ? 'bg-raised' : ''" @click="openRep(r.id)">
            <p class="font-medium">{{ r.title }}</p>
            <p class="text-sm text-muted">{{ SEV[r.severity] }}, {{ r.module }}, {{ r.version }}, {{ REP[r.status] }}<span v-if="r.known">, connu</span></p>
          </button>
        </li>
        <li v-if="!reps.length" class="px-4 py-6 text-muted">Aucun signalement.</li>
      </ul>
      <article v-if="rep" class="panel p-6">
        <p class="text-sm text-muted">N° {{ rep.id }}, {{ rep.name ?? 'compte supprimé' }}<template v-if="rep.email"> ({{ rep.email }})</template>, {{ SEV[rep.severity] }}, {{ rep.module }}, {{ rep.version }}</p>
        <h3 class="mt-2 text-lg font-semibold">{{ rep.title }}</h3>
        <dl class="mt-4 space-y-3 text-sm">
          <div><dt class="font-medium">Étapes</dt><dd class="whitespace-pre-line text-muted">{{ rep.steps }}</dd></div>
          <div><dt class="font-medium">Attendu</dt><dd class="whitespace-pre-line text-muted">{{ rep.expected }}</dd></div>
          <div><dt class="font-medium">Obtenu</dt><dd class="whitespace-pre-line text-muted">{{ rep.actual }}</dd></div>
          <div v-if="rep.logs"><dt class="font-medium">Journaux</dt><dd><pre class="theme-dark mt-1 max-h-64 overflow-auto rounded-lg bg-code p-3 font-mono text-[0.75rem] text-fg">{{ rep.logs }}</pre></dd></div>
        </dl>
        <form class="mt-6 flex flex-wrap items-end gap-3" @submit.prevent="saveRep">
          <div><label for="rp-st" class="field-label">Statut</label><select id="rp-st" v-model="repForm.status" class="field"><option v-for="s in REPORT_STATUSES" :key="s" :value="s">{{ REP[s] }}</option></select></div>
          <div><label for="rp-fx" class="field-label">Corrigé dans</label><input id="rp-fx" v-model="repForm.fixedIn" class="field w-32 font-mono"></div>
          <label class="flex items-center gap-2 pb-3"><input v-model="repForm.known" type="checkbox" class="size-4 accent-[#5b8cff]">Problème connu (visible des testeurs)</label>
          <button type="submit" class="btn btn-primary" :disabled="!!busy">Enregistrer</button>
        </form>
        <ul class="mt-6 space-y-3">
          <li v-for="c in rep.comments" :key="c.id" class="rounded-lg border p-3 text-sm" :class="c.team ? 'border-accent/40' : 'border-line'"><p class="text-muted">{{ c.team ? 'Équipe' : 'Testeur' }}, {{ fmt(c.createdAt) }}</p><p class="mt-1 whitespace-pre-line">{{ c.body }}</p></li>
        </ul>
        <form class="mt-4 space-y-3" @submit.prevent="replyRep">
          <label for="rp-reply" class="field-label">Répondre au testeur</label>
          <textarea id="rp-reply" v-model="repReply" class="field min-h-20" maxlength="4000" required />
          <button type="submit" class="btn btn-secondary" :disabled="!!busy || repReply.trim().length < 2">Envoyer la réponse</button>
        </form>
      </article>
    </div>
  </section>
</template>

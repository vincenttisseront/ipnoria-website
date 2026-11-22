<script setup lang="ts">
import { REFERENCE_SECTORS, REFERENCE_SERVICES, referenceSchema } from '#shared/account'
import type { ReferenceInput } from '#shared/account'

// Références clients (administration, en français) : fiche, logo, autorisation de publication, ordre d'affichage.
type Row = ReferenceInput & { id: string, hasLogo: boolean, v: number }
const SECTOR: Record<string, string> = { pme: 'PME', collectivite: 'Collectivité', enseignement: 'Enseignement', sante: 'Santé', industrie: 'Industrie', services: 'Services', association: 'Association', autre: 'Autre' }
const SERVICE: Record<string, string> = { ipam: 'IPAM', dns: 'DNS', dhcp: 'DHCP', radius: 'RADIUS / 802.1X', pki: 'PKI', cluster: 'Cluster', dnsfilter: 'Filtrage DNS', ad: 'Active Directory' }
const { data: rows, refresh } = await useFetch<Row[]>('/api/admin/references', { default: () => [] })
const empty = (): ReferenceInput => ({
  slug: '', name: '', sector: 'pme', size: { fr: '', en: '' }, location: '', website: '', services: [], quote: { fr: '', en: '' }, quoteAuthor: '',
  quoteRole: { fr: '', en: '' }, story: { fr: '', en: '' }, logoDarkBg: false, authorizedBy: '', authorizedAt: '', published: false, position: 100,
})
const editing = ref<string | 'new' | null>(null)
const form = reactive<ReferenceInput>(empty())
const current = computed(() => rows.value?.find(r => r.id === editing.value) ?? null)
const busy = ref('')
const notice = ref<{ ok: boolean, text: string } | null>(null)
const confirmDelete = ref(false)
const slugTouched = ref(false)

function edit(r: Row | null) {
  notice.value = null; confirmDelete.value = false
  editing.value = r ? r.id : 'new'
  const base = empty()
  Object.assign(form, base, r ? JSON.parse(JSON.stringify({ ...r, location: r.location ?? '', website: r.website ?? '', quoteAuthor: r.quoteAuthor ?? '', authorizedBy: r.authorizedBy ?? '', authorizedAt: r.authorizedAt ?? '' })) : {})
  for (const k of ['size', 'quote', 'quoteRole', 'story'] as const) form[k] = { fr: form[k]?.fr ?? '', en: form[k]?.en ?? '' }
  slugTouched.value = Boolean(r)
}
watch(() => form.name, (n) => {
  if (slugTouched.value) return
  form.slug = n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
})
const canPublish = computed(() => Boolean(form.authorizedBy.trim() && form.authorizedAt))
watch(canPublish, (ok) => { if (!ok) form.published = false })

async function save() {
  notice.value = null
  const p = referenceSchema.safeParse(form)
  if (!p.success) { notice.value = { ok: false, text: `Champs à revoir : ${[...new Set(p.error.issues.map(i => String(i.path[0])))].join(', ')}` }; return }
  busy.value = 'save'
  try {
    if (editing.value === 'new') {
      const r = await $fetch<{ id: string }>('/api/admin/references', { method: 'POST', body: p.data })
      editing.value = r.id
    }
    else await $fetch(`/api/admin/references/${editing.value}`, { method: 'PUT', body: p.data })
    await refresh(); notice.value = { ok: true, text: form.published ? 'Enregistrée et publiée.' : 'Enregistrée (non publiée).' }
  }
  catch (e) { notice.value = { ok: false, text: (e as { data?: { data?: { code?: string } } }).data?.data?.code === 'slug_taken' ? 'Cette adresse (slug) est déjà prise.' : 'Échec de l\'enregistrement.' } }
  finally { busy.value = '' }
}
async function uploadLogo(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !current.value) return
  notice.value = null
  if (file.size > 300 * 1024) { notice.value = { ok: false, text: 'Logo trop lourd : 300 Ko au plus.' }; return }
  busy.value = 'logo'
  try {
    await $fetch(`/api/admin/references/${current.value.id}/logo`, { method: 'PUT', body: await file.arrayBuffer(), headers: { 'content-type': 'application/octet-stream' } })
    await refresh(); notice.value = { ok: true, text: 'Logo enregistré.' }
  }
  catch (err) {
    const code = (err as { data?: { data?: { code?: string } } }).data?.data?.code
    notice.value = { ok: false, text: code === 'logo_type' ? 'Format refusé : PNG, WebP ou JPEG seulement (pas de SVG).' : code === 'logo_too_large' ? 'Logo trop lourd : 300 Ko au plus.' : 'Échec de l\'envoi du logo.' }
  }
  finally { busy.value = ''; (e.target as HTMLInputElement).value = '' }
}
async function removeLogo() {
  busy.value = 'logo'
  try { await $fetch(`/api/admin/references/${current.value!.id}/logo`, { method: 'DELETE' }); await refresh() }
  finally { busy.value = '' }
}
async function remove() {
  busy.value = 'delete'
  try { await $fetch(`/api/admin/references/${current.value!.id}`, { method: 'DELETE' }); editing.value = null; await refresh() }
  catch { notice.value = { ok: false, text: 'Échec de la suppression.' } }
  finally { busy.value = ''; confirmDelete.value = false }
}
</script>

<template>
  <section aria-labelledby="ar-title">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h2 id="ar-title" class="text-xl font-semibold tracking-tight">Références clients</h2>
      <button type="button" class="btn btn-secondary" @click="edit(null)">Nouvelle référence</button>
    </div>
    <div class="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
      <ul class="panel max-h-[44rem] divide-y divide-line overflow-y-auto">
        <li v-for="r in rows" :key="r.id">
          <button type="button" class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-raised" :class="editing === r.id ? 'bg-raised' : ''" @click="edit(r)">
            <span class="size-2 shrink-0 rounded-full" :class="r.published ? 'bg-ok' : 'bg-line-strong'" :title="r.published ? 'Publiée' : 'Brouillon'" />
            <span class="min-w-0 flex-1"><span class="block truncate font-medium">{{ r.name }}</span><span class="text-sm text-muted">{{ SECTOR[r.sector] }}, ordre {{ r.position }}</span></span>
          </button>
        </li>
        <li v-if="!rows?.length" class="px-4 py-6 text-muted">Aucune référence.</li>
      </ul>

      <form v-if="editing" class="panel space-y-5 p-6" @submit.prevent="save">
        <p v-if="notice" role="status" class="rounded-lg border px-4 py-2.5 text-sm" :class="notice.ok ? 'border-ok/40 bg-ok/10' : 'border-alert/40 bg-alert/10'">{{ notice.text }}</p>
        <div class="grid gap-4 sm:grid-cols-2">
          <div><label for="ar-name" class="field-label">Nom du client</label><input id="ar-name" v-model="form.name" class="field" maxlength="80" required></div>
          <div><label for="ar-slug" class="field-label">Adresse de la fiche</label><input id="ar-slug" v-model="form.slug" class="field font-mono" maxlength="60" required @input="slugTouched = true"></div>
          <div><label for="ar-sector" class="field-label">Secteur</label><select id="ar-sector" v-model="form.sector" class="field"><option v-for="s in REFERENCE_SECTORS" :key="s" :value="s">{{ SECTOR[s] }}</option></select></div>
          <div><label for="ar-loc" class="field-label">Lieu</label><input id="ar-loc" v-model="form.location" class="field" maxlength="80" placeholder="Bretagne"></div>
          <div><label for="ar-sfr" class="field-label">Taille (FR)</label><input id="ar-sfr" v-model="form.size.fr" class="field" maxlength="60" placeholder="800 postes, 12 sites"></div>
          <div><label for="ar-sen" class="field-label">Taille (EN)</label><input id="ar-sen" v-model="form.size.en" class="field" maxlength="60" placeholder="800 devices, 12 sites"></div>
          <div class="sm:col-span-2"><label for="ar-web" class="field-label">Site web (https://…)</label><input id="ar-web" v-model="form.website" class="field" maxlength="200" inputmode="url"></div>
        </div>
        <fieldset>
          <legend class="field-label">Services utilisés</legend>
          <div class="flex flex-wrap gap-x-5 gap-y-2">
            <label v-for="s in REFERENCE_SERVICES" :key="s" class="flex items-center gap-2 text-sm"><input v-model="form.services" type="checkbox" :value="s" class="size-4 accent-[#5b8cff]">{{ SERVICE[s] }}</label>
          </div>
        </fieldset>
        <div class="grid gap-4 sm:grid-cols-2">
          <div><label for="ar-qfr" class="field-label">Témoignage (FR)</label><textarea id="ar-qfr" v-model="form.quote.fr" class="field min-h-24" maxlength="600" /></div>
          <div><label for="ar-qen" class="field-label">Témoignage (EN)</label><textarea id="ar-qen" v-model="form.quote.en" class="field min-h-24" maxlength="600" /></div>
          <div><label for="ar-qa" class="field-label">Auteur du témoignage</label><input id="ar-qa" v-model="form.quoteAuthor" class="field" maxlength="80"></div>
          <div class="grid grid-cols-2 gap-2">
            <div><label for="ar-rfr" class="field-label">Fonction (FR)</label><input id="ar-rfr" v-model="form.quoteRole.fr" class="field" maxlength="80"></div>
            <div><label for="ar-ren" class="field-label">Fonction (EN)</label><input id="ar-ren" v-model="form.quoteRole.en" class="field" maxlength="80"></div>
          </div>
          <div><label for="ar-tfr" class="field-label">Étude de cas (FR, paragraphes séparés par une ligne vide)</label><textarea id="ar-tfr" v-model="form.story.fr" class="field min-h-40" maxlength="6000" /></div>
          <div><label for="ar-ten" class="field-label">Étude de cas (EN)</label><textarea id="ar-ten" v-model="form.story.en" class="field min-h-40" maxlength="6000" /></div>
        </div>

        <fieldset class="rounded-xl border border-line p-4">
          <legend class="px-1 text-sm font-medium">Logo</legend>
          <div v-if="current" class="flex flex-wrap items-center gap-4">
            <ReferenceLogo :reference="{ ...current, logoDarkBg: form.logoDarkBg, hasLogo: current.hasLogo }" preview />
            <label class="btn btn-secondary cursor-pointer">
              <span v-if="busy === 'logo'" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />{{ current.hasLogo ? 'Remplacer le logo' : 'Envoyer un logo' }}
              <input type="file" accept="image/png,image/webp,image/jpeg" class="sr-only" @change="uploadLogo">
            </label>
            <button v-if="current.hasLogo" type="button" class="text-sm text-muted hover:text-alert" @click="removeLogo">Retirer</button>
          </div>
          <p v-else class="text-sm text-muted">Enregistrez la fiche, puis ajoutez le logo.</p>
          <p class="mt-2 text-sm text-muted">PNG, WebP ou JPEG, 300 Ko au plus. Le logo n'est visible qu'une fois la référence publiée.</p>
          <label class="mt-3 flex items-center gap-2 text-sm"><input v-model="form.logoDarkBg" type="checkbox" class="size-4 accent-[#5b8cff]">Logo clair : l'afficher sur fond sombre</label>
        </fieldset>

        <fieldset class="rounded-xl border border-warn/40 bg-warn/5 p-4">
          <legend class="px-1 text-sm font-medium">Autorisation de publication</legend>
          <p class="text-sm text-muted">Nom, logo et témoignage engagent l'image du client : publiez seulement avec son accord écrit.</p>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <div><label for="ar-aby" class="field-label">Accordée par (nom, fonction)</label><input id="ar-aby" v-model="form.authorizedBy" class="field" maxlength="120"></div>
            <div><label for="ar-aat" class="field-label">Date de l'accord</label><input id="ar-aat" v-model="form.authorizedAt" type="date" class="field"></div>
          </div>
          <label class="mt-4 flex items-center gap-2" :class="canPublish ? '' : 'text-muted'">
            <input v-model="form.published" type="checkbox" class="size-5 accent-[#5b8cff]" :disabled="!canPublish" aria-describedby="ar-pub-hint">Publier sur le site
          </label>
          <p v-if="!canPublish" id="ar-pub-hint" class="mt-1 text-sm text-muted">Renseignez l'accord pour pouvoir publier.</p>
        </fieldset>
        <div class="w-40"><label for="ar-pos" class="field-label">Ordre d'affichage</label><input id="ar-pos" v-model.number="form.position" type="number" min="0" max="10000" class="field"></div>

        <div class="flex flex-wrap items-center gap-2 border-t border-line pt-5">
          <button type="submit" class="btn btn-primary" :disabled="!!busy"><span v-if="busy === 'save'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />Enregistrer</button>
          <template v-if="current">
            <button v-if="!confirmDelete" type="button" class="btn btn-secondary" @click="confirmDelete = true">Supprimer</button>
            <template v-else>
              <span class="text-sm">Supprimer définitivement {{ current.name }} ?</span>
              <button type="button" class="btn bg-alert text-bg hover:opacity-90" :disabled="!!busy" @click="remove"><span v-if="busy === 'delete'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />Oui, supprimer</button>
              <button type="button" class="btn btn-secondary" @click="confirmDelete = false">Annuler</button>
            </template>
          </template>
        </div>
      </form>
      <p v-else class="panel p-6 text-muted">Choisissez une référence, ou créez-en une.</p>
    </div>
  </section>
</template>

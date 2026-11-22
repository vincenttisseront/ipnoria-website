<script setup lang="ts">
import { IDEA_STATUSES } from '#shared/account'
import type { IdeaStatus } from '#shared/account'

// Modération des idées (administration, en français) : statut avec note aux votants, doublon, masquage,
// titre et texte dans chaque langue, réponse de l'équipe, masquage de commentaires.
type Row = { id: string, title: Record<string, string>, status: IdeaStatus, votes: number, comments: number, hidden: boolean, authorName: string | null, authorEmail: string | null, authorKind: string, createdAt: string, hiddenComments: number }
type Detail = Omit<Row, 'comments'> & { body: Record<string, string>, comments: Array<{ id: string, body: string, team: boolean, hidden: boolean, createdAt: string, authorName: string | null, authorEmail: string | null }>, history: Array<{ status: IdeaStatus, note: string | null, at: string }> }
const { data: rows, refresh } = await useFetch<Row[]>('/api/admin/ideas', { default: () => [] })
const statusFilter = ref<'todo' | 'all' | IdeaStatus>('todo')
const shown = computed(() => (rows.value ?? []).filter(r => statusFilter.value === 'all' ? true : statusFilter.value === 'todo' ? r.status === 'proposed' : r.status === statusFilter.value))
const selectedId = ref<string | null>(null)
const detail = ref<Detail | null>(null)
const form = reactive({ status: 'proposed' as IdeaStatus, note: '', duplicateOf: '', titleFr: '', titleEn: '', bodyFr: '', bodyEn: '' })
const reply = ref('')
const busy = ref('')
const notice = ref<{ ok: boolean, text: string } | null>(null)
const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
const LABEL: Record<IdeaStatus, string> = { proposed: 'Proposée', review: 'À l\'étude', planned: 'Prévue', progress: 'En cours', shipped: 'Livrée', declined: 'Non retenue', duplicate: 'Doublon' }

async function open(id: string, keepNotice = false) {
  selectedId.value = id
  if (!keepNotice) notice.value = null
  detail.value = await $fetch<Detail>(`/api/admin/ideas/${id}`)
  Object.assign(form, { status: detail.value.status, note: '', duplicateOf: '', titleFr: detail.value.title.fr ?? '', titleEn: detail.value.title.en ?? '', bodyFr: detail.value.body.fr ?? '', bodyEn: detail.value.body.en ?? '' })
}
async function run(kind: string, fn: () => Promise<unknown>, ok: string) {
  busy.value = kind; notice.value = null
  try {
    const before = notice.value
    await fn()
    if (notice.value === before) notice.value = { ok: true, text: ok }
    await refresh(); if (selectedId.value) await open(selectedId.value, true)
  }
  catch (e) { notice.value = { ok: false, text: `Échec : ${(e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'erreur serveur'}` } }
  finally { busy.value = '' }
}
const save = () => run('save', async () => {
  const r = await $fetch<{ notified: number }>(`/api/admin/ideas/${selectedId.value}`, {
    method: 'PATCH',
    body: {
      status: form.status, note: form.note,
      duplicateOf: form.duplicateOf ? Number(form.duplicateOf) : undefined,
      title: { fr: form.titleFr, en: form.titleEn }, body: { fr: form.bodyFr, en: form.bodyEn },
    },
  })
  notice.value = { ok: true, text: r.notified ? `${r.notified} personne(s) prévenue(s).` : 'Enregistré.' }
}, 'Enregistré.')
const toggleHidden = () => run('hide', () => $fetch(`/api/admin/ideas/${selectedId.value}`, { method: 'PATCH', body: { hidden: !detail.value!.hidden } }), detail.value?.hidden ? 'Idée de nouveau visible.' : 'Idée masquée.')
const sendReply = () => run('reply', async () => { await $fetch(`/api/admin/ideas/${selectedId.value}/comments`, { method: 'POST', body: { body: reply.value } }); reply.value = '' }, 'Réponse publiée.')
const toggleComment = (c: Detail['comments'][number]) => run(`c-${c.id}`, () => $fetch(`/api/admin/comments/${c.id}`, { method: 'PATCH', body: { hidden: !c.hidden } }), c.hidden ? 'Commentaire visible.' : 'Commentaire masqué.')
</script>

<template>
  <section aria-labelledby="ai-title">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h2 id="ai-title" class="text-xl font-semibold tracking-tight">Idées</h2>
      <label class="flex items-center gap-2 text-sm">Afficher
        <select v-model="statusFilter" class="field !w-auto py-1.5 text-sm">
          <option value="todo">À trier (proposées)</option>
          <option value="all">Toutes</option>
          <option v-for="s in IDEA_STATUSES" :key="s" :value="s">{{ LABEL[s] }}</option>
        </select>
      </label>
    </div>
    <div class="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
      <ul class="panel max-h-[40rem] divide-y divide-line overflow-y-auto">
        <li v-for="r in shown" :key="r.id">
          <button type="button" class="w-full px-4 py-3 text-left hover:bg-raised" :class="selectedId === r.id ? 'bg-raised' : ''" @click="open(r.id)">
            <p class="font-medium" :class="r.hidden ? 'text-muted line-through' : ''">{{ r.title.fr || r.title.en }}</p>
            <p class="mt-1 flex items-center gap-2 text-sm text-muted"><IdeaStatus :status="r.status" />{{ r.votes }} voix, {{ r.comments }} comm.<span v-if="r.hiddenComments">, {{ r.hiddenComments }} masqué(s)</span></p>
          </button>
        </li>
        <li v-if="!shown.length" class="px-4 py-6 text-muted">Rien à trier.</li>
      </ul>

      <article v-if="detail" class="panel p-6">
        <p class="text-sm text-muted">N° {{ detail.id }}, {{ detail.authorKind === 'team' ? 'équipe' : detail.authorName ? `${detail.authorName} (${detail.authorEmail})` : 'compte supprimé' }}, {{ fmt(detail.createdAt) }}</p>
        <p v-if="notice" role="status" class="mt-4 rounded-lg border px-4 py-2.5 text-sm" :class="notice.ok ? 'border-ok/40 bg-ok/10' : 'border-alert/40 bg-alert/10'">{{ notice.text }}</p>
        <form class="mt-5 space-y-4" @submit.prevent="save">
          <div class="grid gap-4 sm:grid-cols-2">
            <div><label for="ai-tfr" class="field-label">Titre (FR)</label><input id="ai-tfr" v-model="form.titleFr" class="field" maxlength="120"></div>
            <div><label for="ai-ten" class="field-label">Titre (EN)</label><input id="ai-ten" v-model="form.titleEn" class="field" maxlength="120"></div>
            <div><label for="ai-bfr" class="field-label">Texte (FR)</label><textarea id="ai-bfr" v-model="form.bodyFr" class="field min-h-32" maxlength="4000" /></div>
            <div><label for="ai-ben" class="field-label">Texte (EN)</label><textarea id="ai-ben" v-model="form.bodyEn" class="field min-h-32" maxlength="4000" /></div>
          </div>
          <div class="grid gap-4 sm:grid-cols-[12rem_10rem_1fr]">
            <div><label for="ai-st" class="field-label">Statut</label><select id="ai-st" v-model="form.status" class="field"><option v-for="s in IDEA_STATUSES" :key="s" :value="s">{{ LABEL[s] }}</option></select></div>
            <div><label for="ai-dup" class="field-label">Doublon de n°</label><input id="ai-dup" v-model="form.duplicateOf" class="field font-mono" inputmode="numeric" pattern="\d*"></div>
            <div><label for="ai-note" class="field-label">Note aux votants (si le statut change)</label><textarea id="ai-note" v-model="form.note" class="field min-h-11" maxlength="2000" /></div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="submit" class="btn btn-primary" :disabled="!!busy"><span v-if="busy === 'save'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />Enregistrer</button>
            <button type="button" class="btn btn-secondary" :disabled="!!busy" @click="toggleHidden">{{ detail.hidden ? 'Rendre visible' : 'Masquer l\'idée' }}</button>
          </div>
        </form>

        <h3 class="mt-10 font-semibold">Historique</h3>
        <ul class="mt-2 space-y-1 text-sm"><li v-for="(h, i) in detail.history" :key="i"><IdeaStatus :status="h.status" /> <span class="text-muted">{{ fmt(h.at) }}</span><span v-if="h.note" class="text-muted">, {{ h.note }}</span></li></ul>

        <h3 class="mt-10 font-semibold">Commentaires</h3>
        <ul class="mt-3 space-y-3">
          <li v-for="c in detail.comments" :key="c.id" class="rounded-lg border p-3" :class="[c.team ? 'border-accent/40' : 'border-line', c.hidden ? 'opacity-50' : '']">
            <p class="text-sm text-muted">{{ c.team ? 'Équipe' : `${c.authorName ?? 'compte supprimé'}${c.authorEmail ? ` (${c.authorEmail})` : ''}` }}, {{ fmt(c.createdAt) }}</p>
            <p class="mt-1 whitespace-pre-line text-sm">{{ c.body }}</p>
            <button type="button" class="mt-2 text-sm text-muted hover:text-fg" :disabled="!!busy" @click="toggleComment(c)">{{ c.hidden ? 'Rendre visible' : 'Masquer' }}</button>
          </li>
        </ul>
        <form class="mt-5 space-y-3" @submit.prevent="sendReply">
          <label for="ai-reply" class="field-label">Réponse de l'équipe</label>
          <textarea id="ai-reply" v-model="reply" class="field min-h-24" maxlength="3000" required />
          <button type="submit" class="btn btn-secondary" :disabled="!!busy || reply.trim().length < 2"><span v-if="busy === 'reply'" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />Publier la réponse</button>
        </form>
      </article>
      <p v-else class="panel p-6 text-muted">Choisissez une idée.</p>
    </div>
  </section>
</template>

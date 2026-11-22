<script setup lang="ts">
import type { IdeaStatus } from '#shared/account'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { user, ensure } = useAccount()
const errorText = useAccountError()
await ensure()

type Comment = { id: string, body: string, team: boolean, beta?: boolean, createdAt: string, editedAt: string | null, authorName: string | null, mine: boolean }
type Idea = {
  id: string, title: Record<string, string>, body: Record<string, string>, status: IdeaStatus, votes: number, voted: boolean, mine: boolean,
  authorKind: string, authorName: string | null, authorBeta: boolean, createdAt: string, comments: Comment[], history: Array<{ status: IdeaStatus, note: string | null, at: string }>,
  duplicate: { id: string, title: Record<string, string> } | null
}
const id = computed(() => String(route.params.id))
const { data: idea, error: loadError, refresh } = await useFetch<Idea>(() => `/api/ideas/${id.value}`, { deep: true })
if (loadError.value || !idea.value) throw createError({ statusCode: 404, fatal: true })
const pick = (o: Record<string, string>) => o?.[locale.value] || o?.[locale.value === 'fr' ? 'en' : 'fr'] || ''
useSeoMeta({ title: () => pick(idea.value!.title), description: () => pick(idea.value!.body).slice(0, 160) })
const otherLang = computed(() => !idea.value!.title[locale.value])
const fmt = (d: string) => new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(new Date(d))
const closed = computed(() => ['shipped', 'declined', 'duplicate'].includes(idea.value!.status))
const notice = ref('')

const body = ref('')
const sending = ref(false)
const commentError = ref('')
async function send() {
  sending.value = true; commentError.value = ''
  try {
    const r = await $fetch<{ comment: Comment }>(`/api/ideas/${id.value}/comments`, { method: 'POST', body: { body: body.value } })
    idea.value!.comments.push(r.comment); body.value = ''
  }
  catch (err) { commentError.value = errorText(err) }
  finally { sending.value = false }
}
const editing = ref<string | null>(null)
const editBody = ref('')
const busy = ref('')
const confirmDelete = ref<string | null>(null)
async function saveEdit(c: Comment) {
  busy.value = c.id
  try { const r = await $fetch<{ editedAt: string }>(`/api/ideas/comments/${c.id}`, { method: 'PATCH', body: { body: editBody.value } }); c.body = editBody.value; c.editedAt = r.editedAt; editing.value = null }
  catch (err) { commentError.value = errorText(err) }
  finally { busy.value = '' }
}
async function remove(c: Comment) {
  busy.value = c.id
  try { await $fetch(`/api/ideas/comments/${c.id}`, { method: 'DELETE' }); confirmDelete.value = null; await refresh() }
  catch (err) { commentError.value = errorText(err) }
  finally { busy.value = '' }
}
const signInTo = computed(() => ({ path: localePath('compte-connexion'), query: { next: route.fullPath } }))
</script>

<template>
  <div v-if="idea" class="wrap py-14 md:py-20">
    <NuxtLink :to="localePath('feuille-de-route')" class="text-sm text-muted no-underline hover:text-fg">{{ t('ideas.back') }}</NuxtLink>
    <div class="mt-6 flex gap-5">
      <IdeaVote :id="idea.id" :votes="idea.votes" :voted="idea.voted" :closed="closed" large @change="(v, x) => { idea!.votes = v; idea!.voted = x }" @blocked="(m) => (notice = m)" />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-3"><IdeaStatus :status="idea.status" /></div>
        <h1 class="mt-3 text-h2">{{ pick(idea.title) }}</h1>
        <p class="mt-3 text-sm text-muted">
          {{ idea.authorKind === 'team' ? t('ideas.byTeam') : idea.authorKind === 'deleted' ? t('ideas.byDeleted') : t('ideas.by', { name: idea.authorName }) }}<BetaBadge v-if="idea.authorBeta" />,
          {{ fmt(idea.createdAt) }}<template v-if="otherLang">. {{ t('ideas.otherLanguage') }}</template>
        </p>
      </div>
    </div>
    <p v-if="notice" role="alert" class="mt-6 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm">{{ notice }}</p>
    <p v-if="idea.duplicate" class="mt-6 rounded-lg border border-line-strong px-4 py-3 text-sm">
      {{ t('ideas.duplicateOf') }}
      <NuxtLink :to="localePath({ name: 'feuille-de-route-id', params: { id: idea.duplicate.id } })" class="link">{{ pick(idea.duplicate.title) }}</NuxtLink>
    </p>

    <div class="mt-10 grid gap-12 lg:grid-cols-[1fr_18rem]">
      <div class="min-w-0">
        <p class="measure whitespace-pre-line text-[1.05rem] leading-relaxed">{{ pick(idea.body) }}</p>

        <section class="mt-14" aria-labelledby="comments-title">
          <h2 id="comments-title" class="text-lg font-semibold tracking-tight">{{ t('ideas.discussion', { n: idea.comments.length }) }}</h2>
          <ul class="mt-6 space-y-6">
            <li v-for="c in idea.comments" :key="c.id" class="rounded-xl border p-4" :class="c.team ? 'border-accent/40 bg-accent-soft' : 'border-line'">
              <p class="text-sm"><span class="font-medium">{{ c.team ? t('ideas.team') : c.authorName ?? t('ideas.deletedAccount') }}</span><BetaBadge v-if="c.beta" />
                <span class="text-muted">, {{ fmt(c.createdAt) }}<template v-if="c.editedAt"> ({{ t('ideas.edited') }})</template></span></p>
              <form v-if="editing === c.id" class="mt-3 space-y-3" @submit.prevent="saveEdit(c)">
                <label :for="`ce-${c.id}`" class="sr-only">{{ t('ideas.comment') }}</label>
                <textarea :id="`ce-${c.id}`" v-model="editBody" class="field min-h-24" maxlength="3000" required />
                <div class="flex gap-2">
                  <button type="submit" class="btn btn-secondary" :disabled="busy === c.id">{{ t('account.save') }}</button>
                  <button type="button" class="btn btn-secondary" @click="editing = null">{{ t('account.cancel') }}</button>
                </div>
              </form>
              <p v-else class="mt-2 whitespace-pre-line">{{ c.body }}</p>
              <div v-if="c.mine && editing !== c.id" class="mt-3 flex gap-4 text-sm">
                <template v-if="confirmDelete === c.id">
                  <button type="button" class="text-alert" :disabled="busy === c.id" @click="remove(c)">{{ t('ideas.deleteYes') }}</button>
                  <button type="button" class="text-muted hover:text-fg" @click="confirmDelete = null">{{ t('account.cancel') }}</button>
                </template>
                <template v-else>
                  <button type="button" class="text-muted hover:text-fg" @click="editing = c.id; editBody = c.body">{{ t('ideas.edit') }}</button>
                  <button type="button" class="text-muted hover:text-alert" @click="confirmDelete = c.id">{{ t('ideas.delete') }}</button>
                </template>
              </div>
            </li>
          </ul>
          <form v-if="user?.emailVerified" class="mt-8 space-y-3" @submit.prevent="send">
            <label for="new-comment" class="field-label">{{ t('ideas.comment') }}</label>
            <textarea id="new-comment" v-model="body" class="field min-h-28" maxlength="3000" required />
            <p v-if="commentError" role="alert" class="field-error">{{ commentError }}</p>
            <button type="submit" class="btn btn-primary" :disabled="sending || body.trim().length < 2">
              <span v-if="sending" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('ideas.send') }}
            </button>
          </form>
          <p v-else-if="user" class="mt-8 text-sm text-muted">{{ t('account.err.unverified') }} <NuxtLink :to="localePath('compte')" class="link">{{ t('account.verify.go') }}</NuxtLink></p>
          <p v-else class="mt-8 text-sm text-muted"><NuxtLink :to="signInTo" class="link">{{ t('ideas.signInToComment') }}</NuxtLink></p>
        </section>
      </div>

      <aside aria-labelledby="history-title">
        <h2 id="history-title" class="text-sm font-semibold">{{ t('ideas.history') }}</h2>
        <ol class="mt-4 space-y-4 border-l border-line pl-4">
          <li v-for="(h, i) in idea.history" :key="i" class="relative">
            <span class="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-line-strong" aria-hidden="true" />
            <p class="text-sm"><IdeaStatus :status="h.status" /> <span class="ml-1 text-muted">{{ fmt(h.at) }}</span></p>
            <p v-if="h.note" class="mt-1.5 whitespace-pre-line text-sm text-muted">{{ h.note }}</p>
          </li>
        </ol>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IdeaStatus } from '#shared/account'

// Feuille de route : les idées de la communauté et de l'équipe, à voter, filtrer et proposer.
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const { user, state, ensure } = useAccount()
await ensure()
useSeoMeta({ title: () => t('ideas.title'), description: () => t('ideas.lead') })
useOgImage('page', () => 'roadmap')

type Item = { id: string, title: Record<string, string>, excerpt: Record<string, string>, status: IdeaStatus, votes: number, comments: number, voted: boolean, authorKind: string, authorName: string | null, authorBeta: boolean, createdAt: string }
const FILTERS = ['open', 'planned', 'progress', 'shipped', 'all'] as const
const filter = ref<string>(typeof route.query.statut === 'string' && (FILTERS as readonly string[]).includes(route.query.statut) ? route.query.statut : 'open')
const sort = ref<'top' | 'new'>(route.query.tri === 'new' ? 'new' : 'top')
const mine = ref(route.query.mes === '1')
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const debounced = ref(q.value)
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, (v) => { clearTimeout(timer); timer = setTimeout(() => (debounced.value = v), 250) })
const query = computed(() => ({ status: filter.value, sort: sort.value, q: debounced.value || undefined, mine: mine.value ? '1' : undefined }))
const { data, status: loadStatus, refresh } = await useFetch<{ items: Item[], enabled: boolean }>('/api/ideas', { query, deep: true, default: () => ({ items: [], enabled: false }) })
watch(query, (v) => { router.replace({ query: { statut: v.status !== 'open' ? v.status : undefined, tri: v.sort !== 'top' ? v.sort : undefined, q: v.q, mes: v.mine } }) })
watch(() => user.value?.id, () => refresh())

const pick = (o: Record<string, string>) => o?.[locale.value] || o?.[locale.value === 'fr' ? 'en' : 'fr'] || ''
const excerpt = (o: Record<string, string>) => { const s = pick(o); return s.length > 180 ? `${s.slice(0, 180).trimEnd()}…` : s }
const notice = ref('')
function onVote(item: Item, votes: number, voted: boolean) { item.votes = votes; item.voted = voted }
const proposeTo = computed(() => user.value ? localePath('feuille-de-route-proposer') : { path: localePath('compte-connexion'), query: { next: localePath('feuille-de-route-proposer') } })
const banner = computed(() => route.query.propose === 'ok' ? t('ideas.proposed') : '')
</script>

<template>
  <div class="wrap py-14 md:py-20">
    <div class="flex flex-wrap items-end justify-between gap-6">
      <div class="max-w-2xl">
        <h1 class="text-h2">{{ t('ideas.title') }}</h1>
        <p class="mt-4 text-lg text-muted">{{ t('ideas.lead') }}</p>
      </div>
      <NuxtLink v-if="state?.enabled" :to="proposeTo" class="btn btn-primary">{{ t('ideas.propose') }}</NuxtLink>
    </div>

    <p v-if="banner" role="status" class="mt-8 rounded-lg border border-ok/40 bg-ok/10 px-4 py-3 text-sm">{{ banner }}</p>
    <p v-if="notice" role="alert" class="mt-8 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
      {{ notice }}
      <NuxtLink v-if="user && !user.emailVerified" :to="localePath('compte')" class="link ml-1">{{ t('account.verify.go') }}</NuxtLink>
    </p>
    <p v-if="!state?.enabled" class="mt-8 text-sm text-muted">{{ t('ideas.closed') }}</p>

    <div class="mt-10 flex flex-wrap items-center gap-3">
      <div role="radiogroup" :aria-label="t('ideas.filter')" class="flex flex-wrap gap-1 rounded-lg border border-line p-1">
        <button
          v-for="f in FILTERS" :key="f" type="button" role="radio" :aria-checked="filter === f"
          class="rounded-md px-3 py-1.5 text-sm transition-colors" :class="filter === f ? 'bg-raised text-fg' : 'text-muted hover:text-fg'"
          @click="filter = f"
        >{{ t(`ideas.filters.${f}`) }}</button>
      </div>
      <label class="sr-only" for="ideas-sort">{{ t('ideas.sort') }}</label>
      <select id="ideas-sort" v-model="sort" class="field !w-auto py-2 text-sm">
        <option value="top">{{ t('ideas.sorts.top') }}</option>
        <option value="new">{{ t('ideas.sorts.new') }}</option>
      </select>
      <label v-if="user" class="flex items-center gap-2 text-sm"><input v-model="mine" type="checkbox" class="size-4 accent-[#5b8cff]">{{ t('ideas.mine') }}</label>
      <div class="relative ml-auto w-full sm:w-72">
        <label for="ideas-q" class="sr-only">{{ t('ideas.search') }}</label>
        <input id="ideas-q" v-model="q" type="search" class="field py-2 pl-9 text-sm" :placeholder="t('ideas.search')" maxlength="80">
        <AppIcon name="search" :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      </div>
    </div>

    <ul class="mt-6 divide-y divide-line border-y border-line" :aria-busy="loadStatus === 'pending'">
      <li v-for="i in data?.items" :key="i.id" class="flex gap-4 py-5">
        <IdeaVote :id="i.id" :votes="i.votes" :voted="i.voted" :closed="['shipped', 'declined', 'duplicate'].includes(i.status)" @change="(v, x) => onVote(i, v, x)" @blocked="(m) => (notice = m)" />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <NuxtLink :to="localePath({ name: 'feuille-de-route-id', params: { id: i.id } })" class="font-semibold text-fg no-underline hover:text-accent">{{ pick(i.title) }}</NuxtLink>
            <IdeaStatus :status="i.status" />
          </div>
          <p class="mt-1 text-[0.95rem] text-muted">{{ excerpt(i.excerpt) }}</p>
          <p class="mt-2 text-sm text-muted">
            {{ i.authorKind === 'team' ? t('ideas.byTeam') : i.authorKind === 'deleted' ? t('ideas.byDeleted') : t('ideas.by', { name: i.authorName }) }}<BetaBadge v-if="i.authorBeta" />
            <span aria-hidden="true">&ensp;</span>{{ t('ideas.comments', { n: i.comments }) }}
          </p>
        </div>
      </li>
      <li v-if="!data?.items.length && loadStatus !== 'pending'" class="py-10 text-center text-muted">{{ t('ideas.empty') }}</li>
    </ul>
  </div>
</template>

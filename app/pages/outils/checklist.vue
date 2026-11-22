<script setup lang="ts">
import { CHECKLIST } from '#shared/checklist'

const { t, locale } = useI18n()
const localePath = useLocalePath()
useSeoMeta({ title: () => t('tools.checklist.title'), description: () => t('tools.checklist.lead') })

const { state, available, clear } = useLocalState<{ done: string[], cluster: boolean, notes: Record<string, string> }>(
  'ipnoria-checklist', () => ({ done: [], cluster: false, notes: {} }),
)
const groups = computed(() => CHECKLIST[locale.value === 'en' ? 'en' : 'fr']
  .map(g => ({ ...g, items: g.items.filter(i => state.value.cluster || !i.cluster) }))
  .filter(g => g.items.length))
const all = computed(() => groups.value.flatMap(g => g.items.map(i => i.id)))
const doneCount = computed(() => all.value.filter(id => state.value.done.includes(id)).length)
const pct = computed(() => (all.value.length ? Math.round((doneCount.value / all.value.length) * 100) : 0))

function toggle(id: string) {
  const set = new Set(state.value.done)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  state.value.done = [...set]
}
const confirmReset = ref(false)
</script>

<template>
  <div class="wrap max-w-4xl pt-14">
    <NuxtLink :to="localePath('outils')" class="no-print text-sm text-muted no-underline hover:text-fg">{{ t('tools.back') }}</NuxtLink>
    <h1 class="mt-6 text-h2">{{ t('tools.checklist.title') }}</h1>
    <p class="mt-4 text-lg text-muted">{{ t('tools.checklist.lead') }}</p>

    <div class="no-print mt-8 flex flex-wrap items-center gap-4">
      <label class="flex items-center gap-2.5">
        <input v-model="state.cluster" type="checkbox" class="size-4 accent-[var(--t-accent)]">
        {{ t('tools.checklist.cluster') }}
      </label>
      <span class="flex-1" />
      <PrintButton />
      <button v-if="!confirmReset" type="button" class="btn btn-secondary" @click="confirmReset = true">{{ t('tools.checklist.reset') }}</button>
      <span v-else class="flex items-center gap-2 text-sm">
        {{ t('tools.checklist.resetConfirm') }}
        <button type="button" class="btn btn-secondary !min-h-9 !py-1" @click="clear(); confirmReset = false">{{ t('tools.checklist.resetYes') }}</button>
        <button type="button" class="btn btn-secondary !min-h-9 !py-1" @click="confirmReset = false">{{ t('tools.checklist.resetNo') }}</button>
      </span>
    </div>

    <div class="mt-6">
      <div class="flex items-baseline justify-between text-sm">
        <span>{{ t('tools.checklist.progress', { done: doneCount, total: all.length }) }}</span>
        <span class="font-mono text-muted">{{ pct }} %</span>
      </div>
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100" :aria-label="t('tools.checklist.progressLabel')">
        <div class="h-full rounded-full bg-ok transition-[width] duration-300" :style="{ width: `${pct}%` }" />
      </div>
      <p v-if="!available" class="mt-3 text-sm text-warn">{{ t('tools.checklist.noStorage') }}</p>
    </div>

    <section v-for="g in groups" :key="g.id" class="mt-10 break-inside-avoid">
      <h2 class="text-lg font-semibold tracking-tight">{{ g.title }}</h2>
      <ul class="panel mt-3 divide-y divide-line">
        <li v-for="item in g.items" :key="item.id" class="flex gap-4 p-4">
          <input
            :id="`ck-${item.id}`" type="checkbox" class="mt-1 size-5 shrink-0 accent-[var(--t-accent)]"
            :checked="state.done.includes(item.id)" @change="toggle(item.id)"
          >
          <div class="min-w-0 flex-1">
            <label :for="`ck-${item.id}`" class="font-medium" :class="state.done.includes(item.id) ? 'text-muted line-through decoration-line-strong' : ''">{{ item.title }}</label>
            <p class="mt-1 text-[0.95rem] text-muted">{{ item.text }}</p>
            <label :for="`note-${item.id}`" class="sr-only">{{ t('tools.checklist.note') }}</label>
            <input
              :id="`note-${item.id}`" v-model="state.notes[item.id]" type="text" maxlength="200"
              class="mt-2 w-full border-0 border-b border-dashed border-line bg-transparent px-0 py-1 text-sm text-fg outline-none placeholder:text-muted/70 focus:border-accent"
              :placeholder="t('tools.checklist.notePlaceholder')"
            >
          </div>
        </li>
      </ul>
    </section>
    <p class="mt-8 text-sm text-muted">{{ t('tools.checklist.storage') }}</p>
  </div>
</template>

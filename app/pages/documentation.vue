<script setup lang="ts">
import { docLinks, githubLinks } from '#shared/links'

const { t, tm, rt } = useI18n()
const localePath = useLocalePath()
useSeoMeta({ title: () => t('docs.title'), description: () => t('docs.lead') })

type Msg = Parameters<typeof rt>[0]
interface RawGroup { title: Msg, items: Array<{ key: Msg, title: Msg, text: Msg }> }
const groups = computed(() => (tm('docs.groups') as RawGroup[]).map(g => ({
  title: rt(g.title),
  items: g.items.map(i => ({ key: rt(i.key), title: rt(i.title), text: rt(i.text) })),
})))
</script>

<template>
  <div class="wrap pt-14">
    <h1 class="text-display">{{ t('docs.title') }}</h1>
    <p class="measure mt-5 text-lg text-muted">{{ t('docs.lead') }}</p>
    <p v-if="t('docs.langNote')" class="measure mt-3 text-muted">{{ t('docs.langNote') }}</p>

    <div class="mt-14 space-y-14">
      <section v-for="g in groups" :key="g.title" class="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <h2 class="text-h2">{{ g.title }}</h2>
        <ul class="divide-y divide-line border-y border-line">
          <li v-for="item in g.items" :key="item.key">
            <a
              :href="docLinks[item.key]"
              rel="noopener"
              class="group grid gap-1 py-4 text-fg no-underline sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6"
            >
              <span>
                <span class="block text-h3 font-semibold group-hover:underline">{{ item.title }}</span>
                <span class="mt-1 block text-muted">{{ item.text }}</span>
              </span>
              <span class="text-sm text-muted group-hover:text-fg">{{ t('docs.open') }}</span>
            </a>
          </li>
        </ul>
      </section>
    </div>

    <div class="mt-16 panel p-7">
      <p class="text-h3 font-semibold">{{ t('docs.help') }}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <a :href="githubLinks.newIssue" class="btn btn-secondary" rel="noopener">{{ t('docs.helpIssue') }}</a>
        <NuxtLink :to="localePath('contact')" class="btn btn-primary">{{ t('docs.helpContact') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TOUR } from '#shared/tour'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { on } = useSiteFeatures()
useSeoMeta({ title: () => t('tour.title'), description: () => t('tour.lead') })

const scenarios = computed(() => TOUR[locale.value === 'en' ? 'en' : 'fr'])
const scenarioId = computed(() => (scenarios.value.some(s => s.id === route.query.parcours) ? String(route.query.parcours) : scenarios.value[0]!.id))
const scenario = computed(() => scenarios.value.find(s => s.id === scenarioId.value)!)
const step = ref(0)
watch(scenarioId, () => { step.value = 0 })
const current = computed(() => scenario.value.steps[step.value]!)

function pick(id: string) { router.replace({ query: { ...route.query, parcours: id } }) }
function next() { if (step.value < scenario.value.steps.length - 1) step.value++ }
function prev() { if (step.value > 0) step.value-- }
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') { e.preventDefault(); next() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
}
</script>

<template>
  <div class="wrap pt-14">
    <h1 class="text-display">{{ t('tour.title') }}</h1>
    <p class="measure mt-5 text-lg text-muted">{{ t('tour.lead') }}</p>

    <div role="tablist" :aria-label="t('tour.scenarios')" class="mt-10 flex flex-wrap gap-2">
      <button
        v-for="s in scenarios" :key="s.id" type="button" role="tab" :aria-selected="s.id === scenarioId"
        class="rounded-lg border px-3.5 py-2 text-left transition-colors"
        :class="s.id === scenarioId ? 'border-accent/60 bg-accent-soft' : 'border-line hover:border-line-strong'"
        @click="pick(s.id)"
      >
        <span class="block font-medium">{{ s.title }}</span>
        <span class="block text-[0.8rem] text-muted">{{ s.summary }}</span>
      </button>
    </div>

    <section class="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]" tabindex="0" :aria-label="scenario.title" @keydown="onKey">
      <div class="relative overflow-hidden rounded-2xl border border-line-strong bg-[#f6f7f9]">
        <picture>
          <source :srcset="`/img/${scenario.image.file}.webp`" type="image/webp">
          <img :src="`/img/${scenario.image.file}.png`" :width="scenario.image.w" :height="scenario.image.h" :alt="scenario.title" class="block h-auto w-full">
        </picture>
        <!-- Points annotés : un clic choisit l'étape -->
        <button
          v-for="(s, i) in scenario.steps" :key="i" type="button"
          class="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[0.75rem] font-semibold transition-transform"
          :class="i === step ? 'z-10 scale-110 bg-accent text-white ring-4 ring-accent/30' : 'bg-[#0d1321]/80 text-white hover:scale-110'"
          :style="{ left: `${s.x}%`, top: `${s.y}%` }"
          :aria-label="t('tour.goto', { n: i + 1, title: s.title })" :aria-current="i === step"
          @click="step = i"
        >{{ i + 1 }}</button>
      </div>

      <div class="panel flex flex-col p-6" aria-live="polite">
        <p class="text-sm text-muted">{{ t('tour.stepOf', { n: step + 1, total: scenario.steps.length }) }}</p>
        <h2 class="mt-2 text-xl font-semibold tracking-tight">{{ current.title }}</h2>
        <p class="mt-3 text-muted">{{ current.text }}</p>
        <div class="mt-auto flex gap-2 pt-6">
          <button type="button" class="btn btn-secondary flex-1" :disabled="step === 0" @click="prev">{{ t('tour.prev') }}</button>
          <button v-if="step < scenario.steps.length - 1" type="button" class="btn btn-primary flex-1" @click="next">{{ t('tour.next') }}</button>
          <NuxtLink v-else-if="on('booking')" :to="localePath('rendez-vous')" class="btn btn-primary flex-1">{{ t('tour.book') }}</NuxtLink>
          <NuxtLink v-else-if="on('contact')" :to="localePath('contact')" class="btn btn-primary flex-1">{{ t('cta.button') }}</NuxtLink>
          <NuxtLink v-else :to="localePath('documentation')" class="btn btn-primary flex-1">{{ t('cta.docs') }}</NuxtLink>
        </div>
        <p class="mt-4 text-[0.8rem] text-muted">{{ t('tour.keys') }}</p>
      </div>
    </section>
    <p class="mt-6 text-sm text-muted">{{ t('tour.note') }}</p>
  </div>
</template>

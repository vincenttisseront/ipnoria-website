<script setup lang="ts">
import { size, type SizingInput } from '#shared/sizing'

const { t } = useI18n()
const localePath = useLocalePath()
useSeoMeta({ title: () => t('tools.sizing.title'), description: () => t('tools.sizing.lead') })

const input = reactive<SizingInput>({ devices: 800, sites: 1, wifi8021x: true, pki: true, dnsFiltering: true, highAvailability: false })
const result = computed(() => size({ ...input, devices: Number(input.devices) || 0, sites: Number(input.sites) || 1 }))

const copied = ref(false)
const summary = computed(() => [
  `${t('tools.sizing.title')} (Ipnoria)`,
  `${t('tools.sizing.devices')} : ${input.devices}, ${t('tools.sizing.sites')} : ${input.sites}`,
  ...result.value.nodes.map(n => `${n.count} × ${t(`tools.sizing.role.${n.role}`)} : ${n.vcpu} vCPU, ${n.ramGb} ${t('tools.sizing.gb')}, ${n.diskGb} ${t('tools.sizing.gb')}`),
  ...result.value.notes.map(n => `- ${t(`tools.sizing.note.${n}`)}`),
].join('\n'))
async function copy() {
  try { await navigator.clipboard.writeText(summary.value); copied.value = true; setTimeout(() => (copied.value = false), 1800) }
  catch { /* copie refusée : le résumé reste imprimable */ }
}
</script>

<template>
  <div class="wrap max-w-5xl pt-14">
    <NuxtLink :to="localePath('outils')" class="no-print text-sm text-muted no-underline hover:text-fg">{{ t('tools.back') }}</NuxtLink>
    <h1 class="mt-6 text-h2">{{ t('tools.sizing.title') }}</h1>
    <p class="measure mt-4 text-lg text-muted">{{ t('tools.sizing.lead') }}</p>

    <div class="mt-10 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
      <form class="panel space-y-5 p-6" @submit.prevent>
        <div>
          <label for="sz-devices" class="field-label">{{ t('tools.sizing.devices') }}</label>
          <input id="sz-devices" v-model.number="input.devices" type="number" min="1" max="200000" step="50" class="field" inputmode="numeric" aria-describedby="sz-devices-hint">
          <p id="sz-devices-hint" class="mt-1.5 text-sm text-muted">{{ t('tools.sizing.devicesHint') }}</p>
        </div>
        <div>
          <label for="sz-sites" class="field-label">{{ t('tools.sizing.sites') }}</label>
          <input id="sz-sites" v-model.number="input.sites" type="number" min="1" max="500" class="field" inputmode="numeric">
        </div>
        <fieldset class="space-y-3">
          <legend class="field-label">{{ t('tools.sizing.services') }}</legend>
          <label v-for="k in (['wifi8021x', 'pki', 'dnsFiltering', 'highAvailability'] as const)" :key="k" class="flex items-start gap-3">
            <input v-model="input[k]" type="checkbox" class="mt-1 size-4 shrink-0 accent-[var(--t-accent)]">
            <span>{{ t(`tools.sizing.opt.${k}`) }}</span>
          </label>
        </fieldset>
      </form>

      <section aria-live="polite" :aria-label="t('tools.sizing.result')">
        <h2 class="text-lg font-semibold tracking-tight">
          {{ result.topology === 'cluster' ? t('tools.sizing.topoCluster') : t('tools.sizing.topoSingle') }}
        </h2>
        <div class="panel mt-4 overflow-x-auto">
          <table class="w-full text-left text-[0.95rem]">
            <thead>
              <tr class="border-b border-line text-sm text-muted">
                <th scope="col" class="px-4 py-3 font-medium">{{ t('tools.sizing.machine') }}</th>
                <th scope="col" class="px-4 py-3 font-medium">vCPU</th>
                <th scope="col" class="px-4 py-3 font-medium">{{ t('tools.sizing.ram') }}</th>
                <th scope="col" class="px-4 py-3 font-medium">{{ t('tools.sizing.disk') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="n in result.nodes" :key="n.role" class="border-b border-line last:border-0">
                <th scope="row" class="px-4 py-3 font-medium">{{ n.count }} × {{ t(`tools.sizing.role.${n.role}`) }}</th>
                <td class="px-4 py-3 font-mono">{{ n.vcpu }}</td>
                <td class="px-4 py-3 font-mono">{{ n.ramGb }} {{ t('tools.sizing.gb') }}</td>
                <td class="px-4 py-3 font-mono">{{ n.diskGb }} {{ t('tools.sizing.gb') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul v-if="result.notes.length" class="mt-5 space-y-2.5">
          <li v-for="n in result.notes" :key="n" class="flex gap-2.5 text-[0.95rem]">
            <span class="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span>{{ t(`tools.sizing.note.${n}`) }}</span>
          </li>
        </ul>
        <p class="mt-5 rounded-lg border border-line bg-raised/50 px-4 py-3 text-sm text-muted">{{ t('tools.sizing.disclaimer') }}</p>
        <div class="no-print mt-5 flex flex-wrap gap-3">
          <button type="button" class="btn btn-secondary" @click="copy"><AppIcon :name="copied ? 'check' : 'copy'" :size="16" />{{ copied ? t('quickstart.copied') : t('tools.sizing.copy') }}</button>
          <PrintButton />
          <NuxtLink :to="localePath('outils-checklist')" class="btn btn-secondary">{{ t('tools.checklist.title') }}</NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
// Le fichier est lu et analysé dans le navigateur : il n'est jamais envoyé au serveur (et la CSP l'interdirait vers un tiers).
import { previewDhcpExport, type Preview } from '#shared/dhcp-preview'

const { t } = useI18n()
const localePath = useLocalePath()
useSeoMeta({ title: () => t('tools.dhcp.title'), description: () => t('tools.dhcp.lead') })

const preview = ref<Preview | null>(null)
const fileName = ref('')
const error = ref('')
const dragging = ref(false)
const reading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const MAX = 20 * 1024 * 1024

async function load(file: File | undefined | null) {
  error.value = ''
  if (!file) return
  if (file.size > MAX) { error.value = t('tools.dhcp.tooLarge'); return }
  reading.value = true
  try {
    const xml = await file.text()
    fileName.value = file.name
    preview.value = previewDhcpExport(new DOMParser().parseFromString(xml, 'application/xml'))
  }
  catch { error.value = t('tools.dhcp.readError') }
  finally { reading.value = false }
}
function onDrop(e: DragEvent) { dragging.value = false; load(e.dataTransfer?.files?.[0]) }

const totals = computed(() => {
  const p = preview.value
  if (!p) return null
  return {
    scopes: p.scopes.length,
    pools: p.scopes.reduce((n, s) => n + s.pools.length, 0),
    reservations: p.scopes.reduce((n, s) => n + s.reservations.length, 0),
    inactive: p.scopes.filter(s => !s.enabled).length,
  }
})
const open = ref<string | null>(null)
const fmtLease = (s: number) => (s % 86400 === 0 ? t('tools.dhcp.days', { n: s / 86400 }) : s % 3600 === 0 ? `${s / 3600} h` : `${Math.round(s / 60)} min`)
const command = 'Export-DhcpServer -ComputerName $env:COMPUTERNAME -File "$env:TEMP\\dhcp-export.xml" -Force'
</script>

<template>
  <div class="wrap max-w-5xl pt-14">
    <NuxtLink :to="localePath('outils')" class="text-sm text-muted no-underline hover:text-fg">{{ t('tools.back') }}</NuxtLink>
    <h1 class="mt-6 text-h2">{{ t('tools.dhcp.title') }}</h1>
    <p class="measure mt-4 text-lg text-muted">{{ t('tools.dhcp.lead') }}</p>

    <TerminalBlock class="mt-8" :lines="[{ comment: t('tools.dhcp.step1'), command }]" />

    <div
      class="mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors"
      :class="dragging ? 'border-accent bg-accent-soft' : 'border-line-strong'"
      @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop"
    >
      <AppIcon name="import" :size="26" class="text-accent" />
      <p class="mt-3 font-medium">{{ t('tools.dhcp.drop') }}</p>
      <p class="mt-1 text-sm text-muted">{{ t('tools.dhcp.local') }}</p>
      <button type="button" class="btn btn-primary mt-5" :disabled="reading" @click="fileInput?.click()">
        <span v-if="reading" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
        {{ t('tools.dhcp.choose') }}
      </button>
      <input ref="fileInput" type="file" accept=".xml,application/xml,text/xml" class="sr-only" :aria-label="t('tools.dhcp.choose')" @change="load(($event.target as HTMLInputElement).files?.[0])">
    </div>
    <p v-if="error" role="alert" class="field-error mt-3">{{ error }}</p>

    <section v-if="preview && totals" class="mt-12" aria-live="polite">
      <h2 class="text-xl font-semibold tracking-tight">{{ t('tools.dhcp.result', { file: fileName }) }}</h2>
      <dl class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="k in (['scopes', 'pools', 'reservations', 'inactive'] as const)" :key="k" class="panel p-4">
          <dt class="text-sm text-muted">{{ t(`tools.dhcp.total.${k}`) }}</dt>
          <dd class="mt-1 font-mono text-2xl">{{ totals[k] }}</dd>
        </div>
      </dl>

      <div v-if="preview.warnings.length || preview.notImported.length" class="mt-6 space-y-3">
        <div v-if="preview.warnings.length" class="rounded-xl border border-warn/40 bg-warn/10 p-4">
          <p class="font-medium">{{ t('tools.dhcp.warnings', { n: preview.warnings.length }) }}</p>
          <ul class="mt-2 space-y-1 text-sm">
            <li v-for="(w, i) in preview.warnings.slice(0, 50)" :key="i">
              <span v-if="w.scope" class="font-mono">{{ w.scope }} </span>{{ t(`tools.dhcp.w.${w.code}`, { detail: w.detail ?? '' }) }}
            </li>
          </ul>
        </div>
        <div v-if="preview.notImported.length" class="rounded-xl border border-line bg-raised/50 p-4">
          <p class="font-medium">{{ t('tools.dhcp.notImported') }}</p>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            <li v-for="n in preview.notImported" :key="n">{{ t(`tools.dhcp.ni.${n}`) }}</li>
          </ul>
        </div>
      </div>

      <div class="panel mt-6 overflow-x-auto">
        <table class="w-full min-w-[44rem] text-left text-[0.92rem]">
          <thead>
            <tr class="border-b border-line text-sm text-muted">
              <th scope="col" class="px-4 py-3 font-medium">{{ t('tools.dhcp.col.network') }}</th>
              <th scope="col" class="px-4 py-3 font-medium">{{ t('tools.dhcp.col.name') }}</th>
              <th scope="col" class="px-4 py-3 font-medium">{{ t('tools.dhcp.col.pools') }}</th>
              <th scope="col" class="px-4 py-3 font-medium">{{ t('tools.dhcp.col.reservations') }}</th>
              <th scope="col" class="px-4 py-3 font-medium">{{ t('tools.dhcp.col.lease') }}</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">{{ t('tools.dhcp.details') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="s in preview.scopes" :key="s.cidr">
              <tr class="border-b border-line">
                <th scope="row" class="px-4 py-3 font-mono font-normal">
                  {{ s.cidr }}
                  <span v-if="!s.enabled" class="ml-2 rounded bg-warn/15 px-1.5 py-0.5 font-sans text-[0.7rem] text-warn">{{ t('tools.dhcp.inactive') }}</span>
                </th>
                <td class="px-4 py-3">{{ s.name }}</td>
                <td class="px-4 py-3 font-mono text-[0.82rem]">
                  <span v-for="p in s.pools" :key="p.start" class="block">{{ p.start }} – {{ p.end }}</span>
                </td>
                <td class="px-4 py-3 font-mono">{{ s.reservations.length }}</td>
                <td class="px-4 py-3 font-mono">{{ fmtLease(s.leaseSeconds) }}</td>
                <td class="px-4 py-3 text-right">
                  <button type="button" class="link text-sm" :aria-expanded="open === s.cidr" @click="open = open === s.cidr ? null : s.cidr">{{ t('tools.dhcp.details') }}</button>
                </td>
              </tr>
              <tr v-if="open === s.cidr" class="border-b border-line bg-raised/40">
                <td colspan="6" class="px-4 py-4">
                  <p class="text-sm font-medium">{{ t('tools.dhcp.options') }}</p>
                  <dl class="mt-1 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-1 font-mono text-[0.82rem]">
                    <template v-for="(v, k) in s.options" :key="k"><dt class="text-muted">{{ k }}</dt><dd>{{ Array.isArray(v) ? v.join(', ') : v }}</dd></template>
                  </dl>
                  <p v-if="s.exclusions.length" class="mt-3 text-sm font-medium">{{ t('tools.dhcp.exclusions') }}</p>
                  <p v-if="s.exclusions.length" class="font-mono text-[0.82rem]">{{ s.exclusions.map(e => `${e.start} – ${e.end}`).join(', ') }}</p>
                  <p v-if="s.reservations.length" class="mt-3 text-sm font-medium">{{ t('tools.dhcp.col.reservations') }}</p>
                  <ul v-if="s.reservations.length" class="font-mono text-[0.82rem]">
                    <li v-for="r in s.reservations.slice(0, 200)" :key="r.mac">{{ r.ip }}  {{ r.mac }}  {{ r.hostname ?? '' }}</li>
                  </ul>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p class="mt-6 text-muted">{{ t('tools.dhcp.next') }} <NuxtLink :to="localePath({ name: 'guides-slug', params: { slug: 'dhcp-windows' } })" class="link">{{ t('guides.title') }}</NuxtLink></p>
    </section>
  </div>
</template>

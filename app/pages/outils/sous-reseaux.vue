<script setup lang="ts">
import { cidrDetails, cidrToString, parseCidr, planVlsm, splitEqual, type PlanRequest } from '#shared/ipv4'

const { t, locale } = useI18n()
const localePath = useLocalePath()
useSeoMeta({ title: () => t('tools.subnets.title'), description: () => t('tools.subnets.lead') })

const { state } = useLocalState('ipnoria-subnets', () => ({
  block: '10.20.0.0/16',
  mode: 'vlsm' as 'vlsm' | 'equal',
  count: 8,
  reqs: [
    { name: t('tools.subnets.sample.desktops'), vlan: '20', hosts: 400 },
    { name: t('tools.subnets.sample.guests'), vlan: '30', hosts: 200 },
    { name: t('tools.subnets.sample.servers'), vlan: '10', hosts: 60 },
    { name: t('tools.subnets.sample.printers'), vlan: '40', hosts: 30 },
    { name: t('tools.subnets.sample.admin'), vlan: '99', hosts: 14 },
  ] as PlanRequest[],
}))

const block = computed(() => parseCidr(state.value.block))
const vlsm = computed(() => (block.value && state.value.mode === 'vlsm' ? planVlsm(block.value, state.value.reqs.map(r => ({ ...r, hosts: Number(r.hosts) || 0 }))) : null))
const equal = computed(() => (block.value && state.value.mode === 'equal' ? splitEqual(block.value, Number(state.value.count) || 1) : []))

const rows = computed(() => {
  if (vlsm.value) return vlsm.value.allocated.map(a => ({ name: a.name, vlan: a.vlan, need: a.hosts, ...cidrDetails(a.cidr) }))
  return equal.value.map((c, i) => ({ name: `${t('tools.subnets.subnet')} ${i + 1}`, vlan: '', need: 0, ...cidrDetails(c) }))
})

function add() { state.value.reqs.push({ name: '', vlan: '', hosts: 50 }) }
function remove(i: number) { state.value.reqs.splice(i, 1) }

function csv() {
  const head = ['name', 'vlan', 'cidr', 'mask', 'network', 'first', 'last', 'broadcast', 'usable_hosts']
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const lines = [head.join(','), ...rows.value.map(r => [r.name, r.vlan, r.cidr, r.mask, r.network, r.first, r.last, r.broadcast, r.hosts].map(q).join(','))]
  const url = URL.createObjectURL(new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `plan-${state.value.block.replace(/[^0-9]+/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="wrap pt-14">
    <NuxtLink :to="localePath('outils')" class="no-print text-sm text-muted no-underline hover:text-fg">{{ t('tools.back') }}</NuxtLink>
    <h1 class="mt-6 text-h2">{{ t('tools.subnets.title') }}</h1>
    <p class="measure mt-4 text-lg text-muted">{{ t('tools.subnets.lead') }}</p>

    <div class="no-print mt-10 grid gap-6 lg:grid-cols-[22rem_1fr]">
      <form class="panel space-y-5 p-6" @submit.prevent>
        <div>
          <label for="sn-block" class="field-label">{{ t('tools.subnets.block') }}</label>
          <input id="sn-block" v-model="state.block" type="text" class="field font-mono" spellcheck="false" :aria-invalid="!block" aria-describedby="sn-block-err">
          <p v-if="!block" id="sn-block-err" class="field-error">{{ t('tools.subnets.blockError') }}</p>
          <p v-else class="mt-1.5 text-sm text-muted">{{ cidrToString(block) }}, {{ cidrDetails(block).hosts.toLocaleString(locale) }} {{ t('tools.subnets.addresses') }}</p>
        </div>
        <fieldset>
          <legend class="field-label">{{ t('tools.subnets.mode') }}</legend>
          <div class="flex rounded-lg border border-line p-0.5 text-sm">
            <button v-for="m in (['vlsm', 'equal'] as const)" :key="m" type="button" class="flex-1 rounded-md px-3 py-1.5" :class="state.mode === m ? 'bg-raised text-fg' : 'text-muted'" :aria-pressed="state.mode === m" @click="state.mode = m">{{ t(`tools.subnets.modes.${m}`) }}</button>
          </div>
        </fieldset>
        <div v-if="state.mode === 'equal'">
          <label for="sn-count" class="field-label">{{ t('tools.subnets.count') }}</label>
          <input id="sn-count" v-model.number="state.count" type="number" min="1" max="1024" class="field">
        </div>
        <div v-else class="space-y-2">
          <p class="field-label">{{ t('tools.subnets.needs') }}</p>
          <div v-for="(r, i) in state.reqs" :key="i" class="grid grid-cols-[1fr_4rem_5rem_auto] gap-2">
            <input v-model="r.name" type="text" class="field !px-2 !py-1.5 text-sm" :aria-label="t('tools.subnets.name')" :placeholder="t('tools.subnets.name')">
            <input v-model="r.vlan" type="text" class="field !px-2 !py-1.5 font-mono text-sm" :aria-label="t('tools.subnets.vlan')" placeholder="VLAN">
            <input v-model.number="r.hosts" type="number" min="1" class="field !px-2 !py-1.5 font-mono text-sm" :aria-label="t('tools.subnets.hosts')">
            <button type="button" class="rounded-md px-2 text-muted hover:text-alert" :aria-label="t('tools.subnets.remove', { name: r.name })" @click="remove(i)">×</button>
          </div>
          <button type="button" class="link text-sm" @click="add">{{ t('tools.subnets.add') }}</button>
        </div>
      </form>

      <section class="min-w-0" aria-live="polite">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold tracking-tight">{{ t('tools.subnets.plan') }}</h2>
          <div class="flex gap-2">
            <button type="button" class="btn btn-secondary" :disabled="!rows.length" @click="csv"><AppIcon name="download" :size="16" />CSV</button>
            <PrintButton />
          </div>
        </div>
        <p v-if="vlsm?.unplaced.length" role="alert" class="mt-4 rounded-lg border border-alert/40 bg-alert/10 px-4 py-3 text-sm">
          {{ t('tools.subnets.unplaced', { names: vlsm.unplaced.map(u => u.name || '?').join(', ') }) }}
        </p>
        <div class="panel mt-4 overflow-x-auto">
          <table class="w-full min-w-[46rem] text-left text-[0.9rem]">
            <thead>
              <tr class="border-b border-line text-sm text-muted">
                <th v-for="h in ['name', 'vlan', 'cidr', 'range', 'broadcast', 'hosts']" :key="h" scope="col" class="px-3 py-2.5 font-medium">{{ t(`tools.subnets.col.${h}`) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.cidr" class="border-b border-line last:border-0">
                <th scope="row" class="px-3 py-2.5 font-medium">{{ r.name }}</th>
                <td class="px-3 py-2.5 font-mono">{{ r.vlan }}</td>
                <td class="px-3 py-2.5 font-mono">{{ r.cidr }}<span class="block text-[0.75rem] text-muted">{{ r.mask }}</span></td>
                <td class="px-3 py-2.5 font-mono text-[0.82rem]">{{ r.first }} – {{ r.last }}</td>
                <td class="px-3 py-2.5 font-mono text-[0.82rem]">{{ r.broadcast }}</td>
                <td class="px-3 py-2.5 font-mono">{{ r.hosts.toLocaleString(locale) }}<span v-if="r.need" class="block text-[0.75rem] text-muted">{{ t('tools.subnets.need', { n: r.need }) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="vlsm?.free.length" class="mt-4 text-sm text-muted">{{ t('tools.subnets.free') }} <span class="font-mono">{{ vlsm.free.slice(0, 6).map(cidrToString).join(', ') }}{{ vlsm.free.length > 6 ? '…' : '' }}</span></p>
      </section>
    </div>
  </div>
</template>

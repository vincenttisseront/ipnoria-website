<script setup lang="ts">
// Schéma du cluster en HTML (et non en image) : lisible au lecteur d'écran, traduit, et qui se réorganise sur mobile.
const { t } = useI18n()

const nodes = computed(() => [
  { name: t('cluster.node1'), role: t('cluster.roleLeader'), services: ['PostgreSQL', 'Kea', 'BIND', 'RADIUS', 'PKI'], leader: true },
  { name: t('cluster.node2'), role: t('cluster.roleReplica'), services: ['PostgreSQL', 'Kea', 'BIND'], leader: false },
  { name: t('cluster.witness'), role: t('cluster.roleWitness'), services: ['etcd'], leader: false },
])
</script>

<template>
  <div>
    <p class="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-[0.8rem] text-fg">
      <span class="relative flex size-2" aria-hidden="true">
        <span class="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
        <span class="relative inline-flex size-2 rounded-full bg-accent" />
      </span>
      {{ t('cluster.vip') }}
      <span class="font-mono text-muted">192.0.2.10</span>
    </p>
    <div class="ml-5 h-5 w-px bg-gradient-to-b from-accent to-accent/20" aria-hidden="true" />

    <ul class="grid gap-2.5 sm:grid-cols-3">
      <li
        v-for="n in nodes"
        :key="n.name"
        class="rounded-xl border p-3.5"
        :class="n.leader ? 'border-accent/50 bg-accent-soft' : 'border-line bg-bg/60'"
      >
        <p class="text-sm font-semibold">{{ n.name }}</p>
        <p class="text-[0.8rem] text-muted">{{ n.role }}</p>
        <p class="mt-2.5 flex flex-wrap gap-1">
          <span
            v-for="s in n.services"
            :key="s"
            class="rounded-md border border-line bg-tint/[0.03] px-1.5 py-0.5 font-mono text-[0.7rem] text-fg/85"
          >{{ s }}</span>
        </p>
      </li>
    </ul>

    <div class="mt-2.5 flex items-center gap-3 text-[0.8rem] text-muted">
      <span class="h-px flex-1 bg-gradient-to-r from-transparent to-ok/60" aria-hidden="true" />
      <span>{{ t('cluster.net') }} <span class="font-mono">10.9.0.0/24</span></span>
      <span class="h-px flex-1 bg-gradient-to-l from-transparent to-ok/60" aria-hidden="true" />
    </div>
  </div>
</template>

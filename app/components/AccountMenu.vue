<script setup lang="ts">
// Menu du compte dans l'en-tête : bouton aux initiales, liens du compte, déconnexion.
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { state, user, ensure, logout } = useAccount()
await ensure()
const open = ref(false)
const root = ref<HTMLElement>()
const button = ref<HTMLButtonElement>()
const busy = ref(false)
const initials = computed(() => (user.value?.displayName ?? '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase())
watch(() => route.fullPath, () => { open.value = false })
function onDoc(e: MouseEvent) { if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false }
function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && open.value) { open.value = false; button.value?.focus() } }
onMounted(() => { document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) })
async function signOut() {
  busy.value = true
  await logout()
  busy.value = false
  open.value = false
  await navigateTo(localePath('/'))
}
</script>

<template>
  <div v-if="state?.enabled" ref="root" class="relative">
    <NuxtLink v-if="!user" :to="{ path: localePath('compte-connexion'), query: route.path.includes('compte') ? {} : { next: route.fullPath } }" class="btn btn-secondary !min-h-9 !px-3 !py-1.5">
      {{ t('account.signIn.short') }}
    </NuxtLink>
    <template v-else>
      <button
        ref="button" type="button" class="flex size-9 items-center justify-center rounded-full border border-line-strong bg-raised text-[0.8rem] font-semibold text-fg hover:border-accent/60"
        :aria-expanded="open" aria-controls="account-menu" :aria-label="t('account.menu', { name: user.displayName })" @click="open = !open"
      >{{ initials }}</button>
      <div v-if="open" id="account-menu" class="panel absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 p-2 shadow-2xl shadow-black/50">
        <p class="truncate px-3 pb-2 pt-1 text-sm"><span class="font-medium">{{ user.displayName }}</span><br><span class="text-muted">{{ user.email }}</span></p>
        <NuxtLink :to="localePath('compte')" class="block rounded-lg px-3 py-2 text-fg no-underline hover:bg-raised">{{ t('account.title') }}</NuxtLink>
        <NuxtLink :to="localePath('compte-securite')" class="block rounded-lg px-3 py-2 text-fg no-underline hover:bg-raised">{{ t('account.nav.security') }}</NuxtLink>
        <NuxtLink :to="{ path: localePath('feuille-de-route'), query: { mes: '1' } }" class="block rounded-lg px-3 py-2 text-fg no-underline hover:bg-raised">{{ t('ideas.mine') }}</NuxtLink>
        <button type="button" class="flex w-full items-center gap-2 rounded-lg border-t border-line px-3 py-2 text-left text-fg hover:bg-raised" :disabled="busy" @click="signOut">
          <span v-if="busy" class="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />{{ t('account.signOut') }}
        </button>
      </div>
    </template>
  </div>
</template>

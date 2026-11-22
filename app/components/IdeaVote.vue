<script setup lang="ts">
// Bouton de vote : compte, état, et redirection vers la connexion si besoin.
const props = defineProps<{ id: string, votes: number, voted: boolean, closed?: boolean, large?: boolean }>()
const emit = defineEmits<{ change: [votes: number, voted: boolean], blocked: [reason: string] }>()
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { user, state } = useAccount()
const errorText = useAccountError()
const busy = ref(false)
async function toggle() {
  if (!user.value) {
    if (state.value?.enabled) await navigateTo({ path: localePath('compte-connexion'), query: { next: route.fullPath } })
    return
  }
  if (!user.value.emailVerified) { emit('blocked', t('account.err.unverified')); return }
  busy.value = true
  try {
    const r = await $fetch<{ votes: number, voted: boolean }>(`/api/ideas/${props.id}/vote`, { method: props.voted ? 'DELETE' : 'POST' })
    emit('change', r.votes, r.voted)
  }
  catch (err) { emit('blocked', errorText(err)) }
  finally { busy.value = false }
}
</script>

<template>
  <button
    type="button"
    class="flex shrink-0 flex-col items-center justify-center rounded-xl border transition-colors disabled:opacity-60"
    :class="[large ? 'h-20 w-20' : 'h-16 w-14', voted ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-fg hover:border-accent/60']"
    :aria-pressed="voted" :disabled="busy || (closed && !voted)"
    :aria-label="voted ? t('ideas.unvote', { n: votes }) : t('ideas.vote', { n: votes })"
    data-umami-event="idea-vote"
    @click="toggle"
  >
    <span v-if="busy" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />
    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
    <span class="font-mono text-[0.95rem] font-semibold" aria-hidden="true">{{ votes }}</span>
  </button>
</template>

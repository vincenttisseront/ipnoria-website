<script setup lang="ts">
import { PROFILES, profileBySlug } from '#shared/profiles'
import { PROFILE_SECTOR } from '#shared/references'

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const lang = computed(() => (locale.value === 'en' ? 'en' : 'fr') as 'fr' | 'en')
const profile = computed(() => profileBySlug(lang.value, String(route.params.profil)))
if (!profile.value) throw createError({ statusCode: 404, fatal: true })

// Le sélecteur de langue doit pointer vers le slug traduit (pme ↔ smb…)
const setI18nParams = useSetI18nParams()
setI18nParams({ fr: { profil: profile.value.slug.fr }, en: { profil: profile.value.slug.en } })
useSeoMeta({ title: () => profile.value?.title ?? '', description: () => profile.value?.lead ?? '' })

const others = computed(() => PROFILES[lang.value].filter(p => p.id !== profile.value?.id))
</script>

<template>
  <div v-if="profile" class="wrap pt-14">
    <h1 class="text-display">{{ profile.title }}</h1>
    <p class="measure mt-5 text-lg text-muted">{{ profile.lead }}</p>

    <div class="mt-14 grid gap-10 lg:grid-cols-2">
      <section>
        <h2 class="text-h3 text-muted">{{ t('profiles.needs') }}</h2>
        <ul class="mt-4 space-y-5">
          <li v-for="n in profile.needs" :key="n.title" class="border-l-2 border-line-strong pl-4">
            <p class="font-semibold">{{ n.title }}</p>
            <p class="mt-1 text-muted">{{ n.text }}</p>
          </li>
        </ul>
      </section>
      <section>
        <h2 class="text-h3 text-muted">{{ t('profiles.answers') }}</h2>
        <ul class="mt-4 space-y-5">
          <li v-for="a in profile.answers" :key="a.title" class="border-l-2 border-accent pl-4">
            <p class="font-semibold">{{ a.title }}</p>
            <p class="mt-1 text-muted">{{ a.text }}</p>
          </li>
        </ul>
      </section>
    </div>

    <ReferenceStrip class="mt-16" :sector="PROFILE_SECTOR[profile.id]" :title="t('refs.stripProfile')" />

    <section class="panel mt-14 p-7">
      <h2 class="text-lg font-semibold">{{ t('profiles.start') }}</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <NuxtLink v-for="s in profile.start" :key="s.label" :to="localePath(s.route)" class="btn btn-secondary">{{ s.label }}</NuxtLink>
        <NuxtLink :to="localePath('rendez-vous')" class="btn btn-primary"><AppIcon name="mail" :size="16" />{{ t('booking.cta') }}</NuxtLink>
      </div>
    </section>

    <p class="mt-10 text-sm text-muted">
      {{ t('profiles.others') }}
      <template v-for="(o, i) in others" :key="o.id">
        <NuxtLink :to="localePath({ name: 'pour-profil', params: { profil: o.slug[lang] } })" class="link">{{ o.title }}</NuxtLink><span v-if="i < others.length - 1">, </span>
      </template>
    </p>
  </div>
</template>

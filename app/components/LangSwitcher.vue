<script setup lang="ts">
const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
</script>

<template>
  <ul :aria-label="t('nav.language')" class="flex items-center rounded-lg border border-line p-0.5 text-[0.8rem] font-medium">
    <li v-for="l in locales" :key="l.code">
      <span
        v-if="l.code === locale"
        class="block rounded-md bg-raised px-2 py-1 uppercase text-fg"
        aria-current="true"
        :title="l.name"
      >{{ l.code }}</span>
      <NuxtLink
        v-else
        :to="switchLocalePath(l.code)"
        :lang="l.language"
        :hreflang="l.language"
        class="block rounded-md px-2 py-1 uppercase text-muted no-underline hover:text-fg"
        :title="l.name"
      >
        <span aria-hidden="true">{{ l.code }}</span>
        <span class="sr-only">{{ l.name }}</span>
      </NuxtLink>
    </li>
  </ul>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <a
      href="#contenu"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
    >{{ t('nav.skip') }}</a>
    <SiteHeader />
    <main id="contenu" class="flex-1 focus:outline-none" tabindex="-1">
      <slot />
    </main>
    <SiteFooter />
    <SearchPalette />
    <ReauthDialog />
  </div>
</template>

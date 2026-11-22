<script setup lang="ts">
import { githubLinks } from '#shared/links'

const { t } = useI18n()
useSeoMeta({ title: () => t('contact.title'), description: () => t('contact.lead') })
</script>

<template>
  <div class="wrap grid gap-12 pt-14 lg:grid-cols-[1fr_1.35fr] lg:gap-20">
    <div>
      <h1 class="text-display">{{ t('contact.title') }}</h1>
      <p class="measure mt-5 text-lg text-muted">{{ t('contact.lead') }}</p>
      <div class="mt-8 border-t border-line pt-4">
        <p class="text-muted">{{ t('contact.bug') }}</p>
        <a :href="githubLinks.newIssue" class="link mt-2 inline-block font-medium" rel="noopener">{{ t('contact.bugLink') }}</a>
      </div>
    </div>
    <ContactForm />
  </div>
</template>

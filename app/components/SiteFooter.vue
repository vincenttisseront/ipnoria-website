<script setup lang="ts">
import { githubLinks, docLinks } from '#shared/links'

const { t } = useI18n()
const localePath = useLocalePath()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="mt-32 border-t border-line">
    <div class="wrap grid gap-10 py-14 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
      <div>
        <p class="flex items-center gap-2.5">
          <BrandMark />
          <span class="font-semibold tracking-tight">Ipnoria</span>
        </p>
        <p class="mt-3 max-w-xs text-sm text-muted">{{ t('footer.tagline') }}</p>
      </div>
      <nav :aria-label="t('footer.project')">
        <h2 class="text-sm font-medium">{{ t('footer.project') }}</h2>
        <ul class="mt-4 space-y-2.5 text-sm text-muted">
          <li><a :href="githubLinks.repo" class="hover:text-fg" rel="noopener">GitHub</a></li>
          <li><a :href="githubLinks.releases" class="hover:text-fg" rel="noopener">{{ t('footer.releases') }}</a></li>
          <li><a :href="githubLinks.issues" class="hover:text-fg" rel="noopener">{{ t('footer.issues') }}</a></li>
          <li><a :href="docLinks.licenseDoc" class="hover:text-fg" rel="noopener">AGPL-3.0</a></li>
        </ul>
      </nav>
      <nav :aria-label="t('footer.resources')">
        <h2 class="text-sm font-medium">{{ t('footer.resources') }}</h2>
        <ul class="mt-4 space-y-2.5 text-sm text-muted">
          <li><NuxtLink :to="localePath('documentation')" class="hover:text-fg">{{ t('nav.docs') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('guides')" class="hover:text-fg">{{ t('nav.guides') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('outils')" class="hover:text-fg">{{ t('nav.tools') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('visite')" class="hover:text-fg">{{ t('tour.title') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('comparatif')" class="hover:text-fg">{{ t('nav.compare') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('feuille-de-route')" class="hover:text-fg">{{ t('nav.roadmap') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('references')" class="hover:text-fg">{{ t('refs.title') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('articles')" class="hover:text-fg">{{ t('articles.title') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('glossaire')" class="hover:text-fg">{{ t('glossary.title') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('beta')" class="hover:text-fg">{{ t('beta.title') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('nouveautes')" class="hover:text-fg">{{ t('nav.releases') }}</NuxtLink></li>
          <li><a href="/rss.xml" class="hover:text-fg">{{ t('footer.rss') }}</a></li>
        </ul>
      </nav>
      <nav :aria-label="t('footer.site')">
        <h2 class="text-sm font-medium">{{ t('footer.site') }}</h2>
        <ul class="mt-4 space-y-2.5 text-sm text-muted">
          <li><NuxtLink :to="localePath('rendez-vous')" class="hover:text-fg">{{ t('booking.title') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('demo')" class="hover:text-fg">{{ t('nav.demo') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('contact')" class="hover:text-fg">{{ t('nav.contact') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('mentions-legales')" class="hover:text-fg">{{ t('footer.legal') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('confidentialite')" class="hover:text-fg">{{ t('footer.privacy') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('securite')" class="hover:text-fg">{{ t('disclosure.title') }}</NuxtLink></li>
        </ul>
      </nav>
    </div>
    <div class="border-t border-line">
      <p class="wrap py-6 text-[0.8rem] text-muted">{{ t('footer.copyright', { year }) }}</p>
    </div>
  </footer>
</template>

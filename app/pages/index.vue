<script setup lang="ts">
import { githubLinks, docLinks } from '#shared/links'
import { PROFILES } from '#shared/profiles'

const { t, tm, rt, locale } = useI18n()
const localePath = useLocalePath()
const { data: release } = await useRelease()

useSeoMeta({ title: '', ogTitle: () => t('meta.title'), ogDescription: () => t('meta.description') })

// Données structurées (schema.org) : le logiciel, sa licence, son dépôt
const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: () => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'Ipnoria',
      'applicationCategory': 'NetworkApplication',
      'operatingSystem': 'Linux',
      'description': t('meta.description'),
      'url': site,
      'downloadUrl': githubLinks.latestRelease,
      'codeRepository': githubLinks.repo,
      'license': 'https://www.gnu.org/licenses/agpl-3.0.html',
      'softwareVersion': release.value?.version ?? undefined,
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR' },
      'author': { '@type': 'Person', 'name': 'Vincent Tisseront' },
    }),
  }],
})

type Msg = Parameters<typeof rt>[0]
type Icon = 'disc' | 'network' | 'undo' | 'wifi' | 'key' | 'server' | 'import' | 'shield' | 'globe' | 'filter' | 'activity'

const why = computed(() => (tm('why.items') as Array<{ title: Msg, text: Msg }>).map(i => ({ title: rt(i.title), text: rt(i.text) })))
const whyIcons: Icon[] = ['disc', 'network', 'undo', 'wifi', 'key', 'server', 'import', 'shield']
// Ordre des tuiles de la grille : [index dans why.items, classes de placement]
const tiles: Array<[number, string]> = [
  [0, ''], [2, ''], [3, ''], [4, ''], [6, ''], [7, ''],
]

const modules = computed(() => (tm('modules.items') as Array<{ name: Msg, text: Msg }>).map(i => ({ name: rt(i.name), text: rt(i.text) })))
const moduleIcons: Icon[] = ['network', 'globe', 'server', 'filter', 'wifi', 'key', 'import', 'activity', 'shield']
const blocks = computed(() => (tm('blocks.items') as Array<{ name: Msg, role: Msg }>).map(i => ({ name: rt(i.name), role: rt(i.role) })))
const lang = computed(() => (locale.value === 'en' ? 'en' : 'fr') as 'fr' | 'en')
const profiles = computed(() => PROFILES[lang.value])
const steps = computed(() => (tm('quickstart.steps') as Msg[]).map(s => rt(s)))
const terminal = computed(() => [
  `git clone ${githubLinks.clone} && cd ipnoria`,
  'tools/build-console.sh',
  './build-ipnoria.sh',
].map((command, i) => ({ command, comment: steps.value[i] ?? '' })))
</script>

<template>
  <div>
    <!-- Ouverture : promesse courte, deux actions, puis le produit lui-même -->
    <section class="relative -mt-16 overflow-x-clip pt-16">
      <div class="glow" aria-hidden="true" />
      <div class="dots absolute inset-0" aria-hidden="true" />
      <div class="wrap relative pb-10 pt-16 text-center md:pt-24">
        <a
          :href="release?.version ? docLinks.changelog : docLinks.licenseDoc"
          rel="noopener"
          class="inline-flex items-center gap-2 rounded-full border border-line-strong bg-tint/[0.03] px-3 py-1 text-[0.8rem] text-muted no-underline transition-colors hover:text-fg"
        >
          <span class="size-1.5 rounded-full bg-ok" aria-hidden="true" />
          {{ release?.version ? t('hero.badge', { version: release.version }) : t('hero.badgeFallback') }}
        </a>
        <h1 class="mx-auto mt-6 max-w-4xl bg-gradient-to-b from-fg to-fg/65 bg-clip-text text-display text-transparent">
          {{ t('hero.title') }}
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-lg text-muted">{{ t('hero.lead') }}</p>
        <div class="mt-9 flex flex-wrap justify-center gap-3">
          <a :href="release?.url || githubLinks.latestRelease" class="btn btn-primary" rel="noopener">
            <AppIcon name="download" :size="16" />{{ t('hero.ctaDownload') }}
          </a>
          <a :href="githubLinks.repo" class="btn btn-secondary" rel="noopener">
            <AppIcon name="github" :size="16" />{{ t('hero.ctaGithub') }}
          </a>
        </div>
      </div>
      <div class="wrap relative pb-6">
        <div class="hero-shot">
          <ConsoleGallery />
        </div>
        <p class="mt-4 text-center text-sm text-muted">
          {{ t('gallery.lead') }}
          <NuxtLink :to="localePath('visite')" class="link ml-1">{{ t('tour.cta') }}</NuxtLink>
        </p>
      </div>
    </section>

    <!-- Composants -->
    <section class="wrap py-16">
      <p class="text-center text-sm text-muted">{{ t('blocks.title') }}</p>
      <ul class="mx-auto mt-6 flex max-w-5xl flex-wrap justify-center gap-x-8 gap-y-3">
        <li v-for="b in blocks" :key="b.name" class="text-center" :title="b.role">
          <span class="text-base font-semibold tracking-tight text-fg/65 md:text-[1.05rem]">{{ b.name }}</span>
          <span class="sr-only"> ({{ b.role }})</span>
        </li>
      </ul>
    </section>

    <!-- Fonctionnalités : deux tuiles vivantes (IPAM, cluster), les autres en texte -->
    <section id="fonctionnalites" class="wrap py-20">
      <div class="max-w-2xl">
        <h2 class="text-h2">{{ t('why.title') }}</h2>
        <p class="mt-4 text-lg text-muted">{{ t('why.lead') }}</p>
      </div>

      <div class="mt-12 grid gap-4 lg:grid-cols-3">
        <article class="panel p-6 lg:col-span-2 lg:row-span-2 sm:p-8">
          <div class="grid gap-8 md:grid-cols-[1fr_1.35fr] md:items-start">
            <div>
              <span class="inline-flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><AppIcon :name="whyIcons[1]!" /></span>
              <h3 class="mt-4 text-xl font-semibold tracking-tight">{{ why[1]?.title }}</h3>
              <p class="mt-2 text-muted">{{ why[1]?.text }}</p>
              <p class="mt-4 text-sm text-muted">{{ t('demo.hint') }}</p>
            </div>
            <IpamDemo />
          </div>
        </article>

        <article v-for="[idx] in tiles.slice(0, 2)" :key="idx" class="panel p-6">
          <span class="inline-flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><AppIcon :name="whyIcons[idx]!" /></span>
          <h3 class="mt-4 text-h3">{{ why[idx]?.title }}</h3>
          <p class="mt-2 text-[0.95rem] text-muted">{{ why[idx]?.text }}</p>
        </article>

        <article v-for="[idx] in tiles.slice(2, 5)" :key="idx" class="panel p-6">
          <span class="inline-flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><AppIcon :name="whyIcons[idx]!" /></span>
          <h3 class="mt-4 text-h3">{{ why[idx]?.title }}</h3>
          <p class="mt-2 text-[0.95rem] text-muted">{{ why[idx]?.text }}</p>
        </article>

        <article class="panel p-6 lg:col-span-2 sm:p-8">
          <div class="grid gap-8 md:grid-cols-[1fr_1.4fr] md:items-center">
            <div>
              <span class="inline-flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><AppIcon :name="whyIcons[5]!" /></span>
              <h3 class="mt-4 text-xl font-semibold tracking-tight">{{ t('cluster.title') }}</h3>
              <p class="mt-2 text-[0.95rem] text-muted">{{ t('cluster.text') }}</p>
              <a :href="docLinks.cluster" class="link mt-4 inline-flex items-center gap-1.5 text-sm" rel="noopener">
                {{ t('cluster.doc') }}<AppIcon name="external" :size="14" />
              </a>
            </div>
            <ClusterDiagram />
          </div>
        </article>

        <article v-for="[idx] in tiles.slice(5)" :key="idx" class="panel p-6">
          <span class="inline-flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><AppIcon :name="whyIcons[idx]!" /></span>
          <h3 class="mt-4 text-h3">{{ why[idx]?.title }}</h3>
          <p class="mt-2 text-[0.95rem] text-muted">{{ why[idx]?.text }}</p>
        </article>
      </div>
    </section>

    <!-- Pour qui -->
    <section class="wrap py-20">
      <div class="max-w-2xl">
        <h2 class="text-h2">{{ t('profiles.title') }}</h2>
        <p class="mt-4 text-lg text-muted">{{ t('profiles.lead') }}</p>
      </div>
      <ul class="mt-12 grid gap-4 md:grid-cols-3">
        <li v-for="p in profiles" :key="p.id">
          <NuxtLink :to="localePath({ name: 'pour-profil', params: { profil: p.slug[lang] } })" class="panel block h-full p-6 no-underline hover:border-line-strong">
            <span class="block text-lg font-semibold tracking-tight text-fg">{{ p.title }}</span>
            <span class="mt-2 block text-[0.95rem] text-muted">{{ p.lead }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- Modules de la console -->
    <section class="wrap py-20">
      <div class="max-w-2xl">
        <h2 class="text-h2">{{ t('modules.title') }}</h2>
        <p class="mt-4 text-lg text-muted">{{ t('modules.lead') }}</p>
      </div>
      <dl class="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="(m, i) in modules" :key="m.name" class="flex gap-4">
          <span class="mt-0.5 shrink-0 text-accent"><AppIcon :name="moduleIcons[i] ?? 'network'" :size="20" /></span>
          <div>
            <dt class="font-semibold tracking-tight">{{ m.name }}</dt>
            <dd class="mt-1.5 text-[0.95rem] text-muted">{{ m.text }}</dd>
          </div>
        </div>
      </dl>
    </section>

    <!-- Construire l'ISO -->
    <section class="wrap py-20">
      <div class="grid items-center gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 class="text-h2">{{ t('quickstart.title') }}</h2>
          <p class="mt-4 text-lg text-muted">{{ t('quickstart.lead') }}</p>
          <p class="mt-4 text-[0.95rem] text-muted">{{ t('quickstart.alt') }}</p>
          <a :href="docLinks.install" class="link mt-5 inline-flex items-center gap-1.5 text-sm" rel="noopener">
            <AppIcon name="book" :size="15" />{{ t('quickstart.doc') }}
          </a>
        </div>
        <TerminalBlock :lines="terminal" />
      </div>
    </section>

    <section class="wrap pb-8">
      <NewsletterSignup />
    </section>

    <!-- Appel final -->
    <section class="wrap pt-12">
      <div class="panel relative overflow-hidden px-6 py-16 text-center sm:px-12">
        <div class="glow" aria-hidden="true" />
        <div class="relative">
          <h2 class="text-h2">{{ t('cta.title') }}</h2>
          <p class="mx-auto mt-4 max-w-xl text-lg text-muted">{{ t('cta.text') }}</p>
          <div class="mt-8 flex flex-wrap justify-center gap-3">
            <NuxtLink :to="localePath('rendez-vous')" class="btn btn-primary"><AppIcon name="mail" :size="16" />{{ t('booking.cta') }}</NuxtLink>
            <NuxtLink :to="localePath('contact')" class="btn btn-secondary">{{ t('cta.button') }}</NuxtLink>
            <NuxtLink :to="localePath('documentation')" class="btn btn-secondary"><AppIcon name="book" :size="16" />{{ t('cta.docs') }}</NuxtLink>
          </div>
          <p class="mx-auto mt-10 max-w-2xl border-t border-line pt-6 text-sm text-muted">
            {{ t('license.text') }}
            <a :href="docLinks.licenseDoc" class="link" rel="noopener">{{ t('license.read') }}</a>
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Seul mouvement non déclenché de la page : la capture se redresse une fois, au chargement */
.hero-shot {
  perspective: 1800px;
}
.hero-shot > :deep(*) {
  animation: tilt-in 1100ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
  transform-origin: 50% 0%;
}
@keyframes tilt-in {
  from { opacity: 0; transform: rotateX(14deg) translateY(24px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
</style>

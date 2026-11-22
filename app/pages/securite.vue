<script setup lang="ts">
// Politique de divulgation des vulnérabilités : comment signaler, périmètre, engagements, cadre de bonne foi, remerciements.
const { t, tm, rt, locale } = useI18n()
useSeoMeta({ title: () => t('disclosure.title'), description: () => t('disclosure.lead') })
useOgImage('page', () => 'security')
const { data } = await useFetch<{ contact: string, encryptionUrl: string, acknowledgments: Array<{ id: string, name: string, url: string | null, summary: Record<string, string>, month: string }> }>('/api/security')
const list = (k: string) => (tm(k) as unknown[]).map(x => rt(x as never))
const pick = (o: Record<string, string>) => o?.[locale.value] || o?.[locale.value === 'fr' ? 'en' : 'fr'] || ''
const month = (m: string) => new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(new Date(`${m}-01T00:00:00Z`))
</script>

<template>
  <div class="wrap py-14 md:py-20">
    <h1 class="text-h2">{{ t('disclosure.title') }}</h1>
    <p class="measure mt-4 text-lg text-muted">{{ t('disclosure.lead') }}</p>

    <div class="mt-12 grid gap-12 lg:grid-cols-[1fr_20rem]">
      <div class="measure space-y-12">
        <section id="signaler" class="scroll-mt-24" aria-labelledby="d-report">
          <h2 id="d-report" class="text-xl font-semibold tracking-tight">{{ t('disclosure.reportTitle') }}</h2>
          <p class="mt-3">{{ t('disclosure.reportText') }}</p>
          <ul class="mt-4 list-disc space-y-1.5 pl-5 text-muted"><li v-for="(x, i) in list('disclosure.reportInclude')" :key="i">{{ x }}</li></ul>
        </section>
        <section aria-labelledby="d-scope">
          <h2 id="d-scope" class="text-xl font-semibold tracking-tight">{{ t('disclosure.scopeTitle') }}</h2>
          <ul class="mt-4 list-disc space-y-1.5 pl-5"><li v-for="(x, i) in list('disclosure.scope')" :key="i">{{ x }}</li></ul>
          <h3 class="mt-6 font-semibold">{{ t('disclosure.outTitle') }}</h3>
          <ul class="mt-3 list-disc space-y-1.5 pl-5 text-muted"><li v-for="(x, i) in list('disclosure.out')" :key="i">{{ x }}</li></ul>
        </section>
        <section aria-labelledby="d-commit">
          <h2 id="d-commit" class="text-xl font-semibold tracking-tight">{{ t('disclosure.commitTitle') }}</h2>
          <ul class="mt-4 list-disc space-y-1.5 pl-5"><li v-for="(x, i) in list('disclosure.commit')" :key="i">{{ x }}</li></ul>
        </section>
        <section aria-labelledby="d-safe">
          <h2 id="d-safe" class="text-xl font-semibold tracking-tight">{{ t('disclosure.safeTitle') }}</h2>
          <p class="mt-3">{{ t('disclosure.safeText') }}</p>
          <ul class="mt-4 list-disc space-y-1.5 pl-5 text-muted"><li v-for="(x, i) in list('disclosure.safe')" :key="i">{{ x }}</li></ul>
        </section>
        <section id="remerciements" class="scroll-mt-24" aria-labelledby="d-thanks">
          <h2 id="d-thanks" class="text-xl font-semibold tracking-tight">{{ t('disclosure.thanksTitle') }}</h2>
          <p v-if="!data?.acknowledgments.length" class="mt-3 text-muted">{{ t('disclosure.thanksEmpty') }}</p>
          <ul v-else class="mt-4 divide-y divide-line border-y border-line">
            <li v-for="a in data.acknowledgments" :key="a.id" class="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
              <span><a v-if="a.url" :href="a.url" class="link font-medium" rel="noopener nofollow" target="_blank">{{ a.name }}</a><span v-else class="font-medium">{{ a.name }}</span><span v-if="pick(a.summary)" class="text-muted">, {{ pick(a.summary) }}</span></span>
              <span class="text-sm text-muted">{{ month(a.month) }}</span>
            </li>
          </ul>
        </section>
      </div>
      <aside class="panel h-fit p-6 lg:sticky lg:top-24">
        <h2 class="font-semibold">{{ t('disclosure.contactTitle') }}</h2>
        <p v-if="data?.contact" class="mt-3"><a :href="`mailto:${data.contact}?subject=${encodeURIComponent(t('disclosure.mailSubject'))}`" class="link break-all font-mono text-sm">{{ data.contact }}</a></p>
        <p v-else class="mt-3 text-sm text-muted">{{ t('disclosure.noContact') }}</p>
        <p v-if="data?.encryptionUrl" class="mt-3 text-sm"><a :href="data.encryptionUrl" class="link" rel="noopener">{{ t('disclosure.pgp') }}</a></p>
        <p class="mt-4 text-sm text-muted">{{ t('disclosure.noBounty') }}</p>
        <p class="mt-4 text-sm"><a href="/.well-known/security.txt" class="link font-mono">security.txt</a></p>
      </aside>
    </div>
  </div>
</template>

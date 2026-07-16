<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({ title: () => t('seo.privacy.title'), description: () => t('seo.privacy.description') })
</script>

<template>
  <div>
    <section class="border-b border-ink bg-sky py-16 sm:py-20">
      <UContainer class="max-w-[80rem]">
        <p class="font-mono text-xs font-bold uppercase">{{ t('privacy.eyebrow') }}</p>
        <h1 class="mt-2 font-display text-[clamp(3.4rem,8vw,6.5rem)] font-extrabold leading-[.9]">{{ t('privacy.title') }}</h1>
        <p class="mt-6 max-w-[65ch] text-lg leading-8">{{ t('privacy.intro') }}</p>
      </UContainer>
    </section>
    <UContainer class="max-w-[860px] py-14 sm:py-20">
      <div class="space-y-10 text-base leading-8">
        <section>
          <h2 class="font-display text-3xl font-extrabold">{{ t('privacy.analyticsTitle') }}</h2>
          <p class="mt-3">{{ t('privacy.analyticsText') }}</p>
        </section>
        <section class="border-t border-ink pt-8">
          <h2 class="font-display text-3xl font-extrabold">{{ t('privacy.requestsTitle') }}</h2>
          <p class="mt-3">{{ t('privacy.requestsText') }}</p>
        </section>
        <section class="border-t border-ink pt-8">
          <h2 class="font-display text-3xl font-extrabold">{{ t('privacy.imagesTitle') }}</h2>
          <p class="mt-3">{{ t('privacy.imagesText') }}</p>
        </section>
        <UAlert :title="t('privacy.controlsTitle')" :description="t('privacy.controlsDescription')" icon="i-lucide-shield-check" color="neutral" variant="subtle" class="rounded-none border-l-4 border-brand-500 bg-lilac" />
      </div>
    </UContainer>
  </div>
</template>

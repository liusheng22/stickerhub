<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({ title: () => t('seo.about.title'), description: () => t('seo.about.description') })
</script>

<template>
  <div>
    <section class="border-b border-ink bg-lilac py-16 sm:py-24">
      <UContainer class="max-w-[80rem]">
        <p class="font-mono text-xs font-bold uppercase">{{ t('about.eyebrow') }}</p>
        <h1 class="mt-2 max-w-[900px] font-display text-[clamp(3.4rem,8vw,7rem)] font-extrabold leading-[.9]">{{ t('about.title') }}</h1>
      </UContainer>
    </section>
    <UContainer class="grid max-w-[80rem] gap-8 py-14 sm:grid-cols-3 sm:py-20">
      <UCard variant="outline" class="border-2 border-ink bg-paper shadow-[5px_5px_0_#171717]" :title="t('about.browseTitle')" :description="t('about.browseDescription')" icon="i-lucide-layout-grid" />
      <UCard variant="outline" class="border-2 border-ink bg-mint shadow-[5px_5px_0_#171717]" :title="t('about.ownershipTitle')" :description="t('about.ownershipDescription')" icon="i-lucide-copyright" />
      <UCard variant="outline" class="border-2 border-ink bg-sky shadow-[5px_5px_0_#171717]" :title="t('about.readonlyTitle')" :description="t('about.readonlyDescription')" icon="i-lucide-eye" />
    </UContainer>
  </div>
</template>

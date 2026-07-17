<script setup lang="ts">
import type { HomePayload } from '#shared/types/stickers'

const { t } = useI18n()
const localePath = useLocalePath()
const { data, error } = await useFetch<HomePayload>('/api/site/home', { key: 'sticker-hub-home' })

if (error.value || !data.value) {
  throw createError({ statusCode: 503, message: t('common.catalogUnavailable') })
}

const home = computed(() => data.value as HomePayload)

useSeoMeta({
  title: () => t('seo.home.title'),
  description: () => t('seo.home.description'),
  ogTitle: () => t('seo.home.title'),
  ogDescription: () => t('seo.home.description'),
  ogImage: () => home.value.albums[0]?.bannerUrl || home.value.albums[0]?.thumbUrl || undefined,
  twitterCard: 'summary_large_image',
})

</script>

<template>
  <div>
    <CollectorHero :albums="home.albums.slice(0, 6)" :album-count="home.albumCount" :sticker-count="home.stickerCount" />
    <div class="h-[18px] border-y border-ink bg-brand-500" aria-hidden="true" />

    <section class="py-[74px] sm:py-[88px]">
      <UContainer class="max-w-[80rem]">
        <div class="mb-7 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p class="mb-2 font-mono text-xs font-bold uppercase">{{ t('home.openShelf') }}</p>
            <h2 class="font-display text-[clamp(2rem,4vw,2.5rem)] font-extrabold leading-[1.05]">{{ t('home.shelfTitle') }}</h2>
            <p class="mt-4 max-w-[46ch] text-sm leading-6 text-ink/60">{{ t('home.shelfDescription') }}</p>
          </div>
          <UButton :label="t('common.browseAll')" color="neutral" variant="outline" :to="localePath({ name: 'albums' })" class="border-ink bg-paper" />
        </div>
        <AlbumGrid :albums="home.albums.slice(2, 6)" square-stage />
      </UContainer>
    </section>
  </div>
</template>

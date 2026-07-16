<script setup lang="ts">
import type { AlbumSummary } from '#shared/types/stickers'

defineProps<{
  albums: AlbumSummary[]
  albumCount: number
  stickerCount: number
}>()

const { locale, t } = useI18n()
</script>

<template>
  <section class="relative min-h-[min(82svh,760px)] overflow-hidden border-b border-ink bg-sky">
    <UContainer class="relative min-h-[680px] max-w-[80rem]">
      <CollectorCard v-if="albums[0]" :album="albums[0]" :position="1" class="absolute left-[2%] top-[8%] z-[4] w-[190px] -rotate-6 max-[760px]:left-[2%] max-[760px]:top-[4%] max-[760px]:w-28 max-[560px]:w-[82px]" />
      <CollectorCard v-if="albums[1]" :album="albums[1]" :position="2" class="absolute bottom-[7%] left-[9%] z-[4] w-[190px] rotate-5 max-[760px]:bottom-[3%] max-[760px]:left-[4%] max-[760px]:w-28 max-[560px]:w-[82px]" />
      <CollectorCard v-if="albums[2]" :album="albums[2]" :position="3" class="absolute left-[21%] top-[3%] z-[4] hidden w-[156px] -rotate-11 min-[1051px]:block" />
      <CollectorCard v-if="albums[3]" :album="albums[3]" :position="4" class="absolute bottom-[2%] right-[21%] z-[4] hidden w-[158px] rotate-11 min-[1051px]:block" />
      <CollectorCard v-if="albums[4]" :album="albums[4]" :position="5" class="absolute right-[8%] top-[7%] z-[4] w-[190px] rotate-6 max-[760px]:right-[2%] max-[760px]:top-[4%] max-[760px]:w-28 max-[560px]:w-[82px]" />
      <CollectorCard v-if="albums[5]" :album="albums[5]" :position="6" class="absolute bottom-[13%] right-[1%] z-[4] w-[190px] -rotate-5 max-[760px]:bottom-[4%] max-[760px]:right-[3%] max-[760px]:w-28 max-[560px]:w-[82px]" />

      <div class="absolute left-1/2 top-1/2 z-10 w-[min(550px,48vw)] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border-2 border-ink bg-paper p-8 shadow-[8px_8px_0_#171717] max-[1050px]:w-[min(560px,58vw)] max-[760px]:top-[48%] max-[760px]:w-[calc(100%_-_40px)] max-[760px]:p-6 max-[560px]:top-1/2 max-[560px]:w-[calc(100%_-_24px)] max-[560px]:px-[18px] max-[560px]:py-[22px]">
        <p class="mb-2 font-mono text-xs font-bold uppercase">{{ t('home.eyebrow') }}</p>
        <h1 class="font-display text-[68px] font-extrabold leading-[.94] max-[760px]:text-[50px] max-[560px]:text-[42px]">{{ t('home.title') }}</h1>
        <p class="mb-6 mt-3 text-xl font-semibold max-[560px]:text-[17px]">{{ t('home.description') }}</p>
        <div class="border-t border-ink pt-[18px]">
          <SearchBar label="" :placeholder="t('home.searchPlaceholder')" :submit-label="t('home.searchSubmit')" />
        </div>
        <p class="mt-5 font-mono text-xs text-ink/65">
          {{ t('common.packs', { count: albumCount.toLocaleString(locale) }) }} · {{ t('common.stickers', { count: stickerCount.toLocaleString(locale) }) }}
        </p>
      </div>
    </UContainer>
  </section>
</template>

<script setup lang="ts">
import type { CreatorSummary } from '#shared/types/stickers'

defineProps<{
  creator: CreatorSummary
  index: number
}>()

const stageColors = ['bg-mint', 'bg-lilac', 'bg-sky', 'bg-brand-100']
const { locale, t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <UCard
    as="article"
    variant="outline"
    class="group h-full overflow-hidden border-2 border-ink bg-paper shadow-[5px_5px_0_#171717] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[7px_7px_0_#171717] focus-within:-translate-y-1 focus-within:shadow-[7px_7px_0_#171717]"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <NuxtLink
      :to="localePath({ name: 'creators-creatorSlug', params: { creatorSlug: creator.slug } })"
      class="block h-full focus-visible:outline-offset-[-4px]"
      :aria-label="t('creators.cardLabel', { name: creator.name })"
    >
      <div class="grid aspect-[1.2/1] place-items-center overflow-hidden border-b-2 border-ink p-5" :class="stageColors[index % stageColors.length]">
        <img
          v-if="creator.coverUrl"
          :src="creator.coverUrl"
          :alt="t('creators.cardAlt', { name: creator.name })"
          width="320"
          height="320"
          class="size-[72%] object-contain drop-shadow-[0_8px_7px_rgba(23,23,23,.18)] transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-1"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
        >
        <UIcon v-else name="i-lucide-shapes" class="size-12 text-ink/50" aria-hidden="true" />
      </div>
      <div class="p-4">
        <p class="font-mono text-[10px] font-bold uppercase text-ink/55">{{ t('creators.creatorFile') }}</p>
        <h2 class="mt-1 truncate text-xl font-extrabold">{{ creator.name }}</h2>
        <p class="mt-3 font-mono text-xs text-ink/65">{{ t('common.packs', { count: creator.albumCount.toLocaleString(locale) }) }} · {{ t('common.stickers', { count: creator.stickerCount.toLocaleString(locale) }) }}</p>
      </div>
    </NuxtLink>
  </UCard>
</template>

<script setup lang="ts">
import type { AlbumSummary } from '#shared/types/stickers'
import { albumCardImage } from '#shared/utils/text'

const props = withDefaults(defineProps<{
  album: AlbumSummary
  index?: number
  hideDescription?: boolean
  squareStage?: boolean
}>(), { index: 0 })

const imageFailed = ref(false)
const { locale, t } = useI18n()
const localePath = useLocalePath()
const imageUrl = computed(() => albumCardImage(props.album))
const description = computed(() => props.album.description?.trim()
  || t('seo.albumDetail.fallbackDescription', { name: props.album.packName, count: props.album.memberCount }))
const stages = ['bg-mint', 'bg-lilac', 'bg-sky', 'bg-brand-100']
const stage = computed(() => stages[props.index % stages.length])
</script>

<template>
  <UCard
    as="article"
    variant="outline"
    class="group h-full overflow-hidden border-ink/15 bg-paper transition-shadow duration-200 hover:shadow-[4px_4px_0_#171717] focus-within:shadow-[4px_4px_0_#171717]"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <NuxtLink class="block h-full focus-visible:outline-offset-[-4px]" :to="localePath({ name: 'albums-productId', params: { productId: album.productId } })" no-prefetch :aria-label="t('cards.browseAlbum', { name: album.packName })">
      <div class="grid place-items-center overflow-hidden border-b border-ink/15" :class="[stage, squareStage ? 'aspect-square' : 'aspect-[1/0.82]']">
        <img
          v-if="imageUrl && !imageFailed"
          :src="imageUrl"
          :alt="t('cards.albumCover', { name: album.packName })"
          width="480"
          height="480"
          class="size-[68%] object-contain drop-shadow-[0_8px_7px_rgba(23,23,23,.18)] transition-transform duration-200 group-hover:scale-[1.04] group-hover:-rotate-1"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="imageFailed = true"
        >
        <UIcon v-else name="i-lucide-image-off" class="size-8 text-ink/50" :aria-label="t('common.imageUnavailable')" />
      </div>
      <div class="flex flex-col gap-3 p-4" :class="hideDescription ? 'min-h-28' : 'min-h-40'">
        <h3 class="line-clamp-2 min-h-11 text-[17px] font-bold leading-[1.35]">{{ album.packName }}</h3>
        <p v-if="!hideDescription" class="line-clamp-2 text-sm text-ink/60">{{ description }}</p>
        <div class="mt-auto flex items-center justify-between gap-3 font-mono text-xs">
          <span>{{ t('common.stickers', { count: album.memberCount.toLocaleString(locale) }) }}</span>
          <UBadge v-if="album.priceText" color="neutral" variant="outline" size="sm" class="border-ink bg-paper">{{ album.priceText }}</UBadge>
        </div>
      </div>
    </NuxtLink>
  </UCard>
</template>

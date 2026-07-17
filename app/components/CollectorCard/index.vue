<script setup lang="ts">
import type { AlbumSummary } from '#shared/types/stickers'
import { albumCardImage } from '#shared/utils/text'

const props = withDefaults(defineProps<{
  album: AlbumSummary
  position?: number
  compact?: boolean
}>(), {
  position: 1,
  compact: false,
})

const imageFailed = ref(false)
const { locale, t } = useI18n()
const localePath = useLocalePath()
const imageUrl = computed(() => albumCardImage(props.album))
const stageColors = ['bg-mint', 'bg-lilac', 'bg-sky', 'bg-brand-100']
const stageColor = computed(() => stageColors[(props.position - 1) % stageColors.length])
</script>

<template>
  <UCard
    as="article"
    variant="outline"
    class="collector-card group overflow-hidden border-2 border-ink bg-paper shadow-[5px_5px_0_#171717] transition-shadow duration-200 hover:z-30 hover:shadow-[7px_7px_0_#171717] focus-within:z-30 focus-within:shadow-[7px_7px_0_#171717]"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <NuxtLink
      class="block p-2.5 focus-visible:outline-offset-[-4px]"
      :to="localePath({ name: 'albums-productId', params: { productId: album.productId } })"
      :aria-label="t('cards.openAlbum', { name: album.packName })"
    >
      <div class="grid aspect-square place-items-center overflow-hidden rounded-[4px] border border-ink" :class="stageColor">
        <img
          v-if="imageUrl && !imageFailed"
          :src="imageUrl"
          :alt="t('cards.albumCover', { name: album.packName })"
          width="240"
          height="240"
          class="size-[76%] object-contain drop-shadow-[0_7px_6px_rgba(23,23,23,.18)]"
          :loading="position <= 4 ? 'eager' : 'lazy'"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="imageFailed = true"
        >
        <UIcon v-else name="i-lucide-image-off" class="size-7 text-ink/55" />
      </div>
      <div v-if="!compact" class="mt-2 grid gap-0.5 max-[760px]:hidden">
        <strong class="truncate text-sm">{{ album.packName }}</strong>
        <span class="font-mono text-[10px] text-ink/60">{{ t('common.stickers', { count: album.memberCount.toLocaleString(locale) }) }}</span>
      </div>
    </NuxtLink>
  </UCard>
</template>

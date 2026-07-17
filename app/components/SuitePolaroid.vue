<script setup lang="ts">
import type { AlbumSummary } from '#shared/types/stickers'
import { albumCardImage } from '#shared/utils/text'

const props = defineProps<{
  album: AlbumSummary
  imageClass?: string
}>()

const imageFailed = ref(false)
const { t } = useI18n()
const localePath = useLocalePath()
const imageUrl = computed(() => albumCardImage(props.album))
</script>

<template>
  <UCard
    as="article"
    variant="outline"
    class="overflow-hidden border-2 border-ink bg-paper shadow-[5px_5px_0_#171717] transition-shadow duration-200 hover:shadow-[7px_7px_0_#171717] focus-within:shadow-[7px_7px_0_#171717]"
    :ui="{ body: 'p-2 sm:p-2' }"
  >
    <NuxtLink
      :to="localePath({ name: 'albums-productId', params: { productId: album.productId } })"
      class="block focus-visible:outline-offset-[-4px]"
      :aria-label="t('cards.openAlbum', { name: album.packName })"
    >
      <div class="grid aspect-square place-items-center overflow-hidden rounded-[4px] border border-ink bg-paper" :class="imageClass">
        <img
          v-if="imageUrl && !imageFailed"
          :src="imageUrl"
          :alt="t('cards.albumCover', { name: album.packName })"
          width="200"
          height="200"
          class="size-[78%] object-contain"
          loading="eager"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="imageFailed = true"
        >
        <UIcon v-else name="i-lucide-image-off" class="size-6 text-ink/45" />
      </div>
      <strong class="mt-2 block truncate text-xs">{{ album.packName }}</strong>
    </NuxtLink>
  </UCard>
</template>

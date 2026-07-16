<script setup lang="ts">
import type { AlbumSummary } from '#shared/types/stickers'

defineProps<{
  albums: AlbumSummary[]
  emptyTitle?: string
  emptyText?: string
  hideDescription?: boolean
  squareStage?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <UPageGrid
    v-if="albums.length"
    class="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  >
    <AlbumCard
      v-for="album in albums"
      :key="album.productId"
      :album="album"
      :index="albums.indexOf(album)"
      :hide-description="hideDescription"
      :square-stage="squareStage"
    />
  </UPageGrid>

  <div
    v-else
    class="py-8"
  >
    <UEmpty
      icon="i-lucide-search-x"
      :title="emptyTitle || t('cards.emptyTitle')"
      :description="emptyText || t('cards.emptyDescription')"
      variant="subtle"
      size="lg"
    />
  </div>
</template>

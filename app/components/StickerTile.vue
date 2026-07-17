<script setup lang="ts">
import type { StickerPreview } from '#shared/types/stickers'
import { stickerDisplayName, stickerImage } from '#shared/utils/text'

const props = defineProps<{
  member: StickerPreview
  index: number
}>()

const emit = defineEmits<{
  open: [index: number]
}>()

const imageFailed = ref(false)
const { t } = useI18n()
const useThumbnailFallback = ref(false)
const imageUrl = computed(() => useThumbnailFallback.value
  ? props.member.thumbUrl
  : stickerImage(props.member))
const label = computed(() => stickerDisplayName(props.member) || t('sticker.preview', { index: props.index + 1 }))

function handleImageError() {
  if (!useThumbnailFallback.value && props.member.thumbUrl && props.member.thumbUrl !== props.member.cdnUrl) {
    useThumbnailFallback.value = true
    return
  }

  imageFailed.value = true
}

function handleOpen(event: MouseEvent) {
  if (event.detail > 0) {
    (event.currentTarget as HTMLButtonElement).blur()
  }

  emit('open', props.index)
}
</script>

<template>
  <figure class="group m-0 min-w-0 border-b border-r border-ink bg-paper">
    <button
      type="button"
      class="block w-full text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ink"
      :aria-label="t('sticker.viewFullSize', { label })"
      @click="handleOpen"
    >
      <span class="grid aspect-square place-items-center overflow-hidden bg-paper p-2 sm:p-[13px]">
        <img
          v-if="imageUrl && !imageFailed"
          :src="imageUrl"
          :alt="label"
          width="240"
          height="240"
          class="size-full object-contain transition-transform duration-200 group-hover:scale-[1.06] group-hover:-rotate-1"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="handleImageError"
        >
        <UIcon v-else name="i-lucide-image-off" class="size-7 text-ink/40" :aria-label="t('sticker.previewUnavailable')" />
      </span>
      <span class="flex min-h-8 items-center justify-between gap-2 border-t border-ink/15 px-2 py-[7px] font-mono text-[10px] text-ink/55">
        <span>#{{ String(member.memberIndex ?? index + 1).padStart(2, '0') }}</span>
        <UIcon name="i-lucide-expand" class="size-3.5 transition-transform group-hover:scale-110" aria-hidden="true" />
      </span>
    </button>
  </figure>
</template>

<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode?: number
  }
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const statusCode = computed(() => props.error.statusCode || 500)
const title = computed(() => (
  statusCode.value === 404
    ? t('error.notFoundTitle')
    : t('error.unavailableTitle')
))
const description = computed(() => (
  statusCode.value === 404
    ? t('error.notFoundDescription')
    : t('error.unavailableDescription')
))
</script>

<template>
  <UContainer class="flex min-h-[60vh] max-w-3xl items-center justify-center py-20">
    <UEmpty
      :title="title"
      :description="description"
      :icon="statusCode === 404 ? 'i-lucide-map-pin-off' : 'i-lucide-server-off'"
      variant="subtle"
      size="lg"
    >
      <template #actions>
        <UButton
          :label="t('error.browse')"
          icon="i-lucide-arrow-left"
          @click="clearError({ redirect: localePath({ name: 'albums' }) })"
        />
      </template>
    </UEmpty>
  </UContainer>
</template>

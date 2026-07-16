<script setup lang="ts">
const props = withDefaults(defineProps<{
  initialValue?: string
  label?: string
  placeholder?: string
  compact?: boolean
  submitLabel?: string
}>(), {
  initialValue: '',
  label: '',
  placeholder: '',
  compact: false,
  submitLabel: '',
})

const query = ref(props.initialValue)
const { t } = useI18n()
const localePath = useLocalePath()
const canSubmit = computed(() => query.value.trim().length > 0)

watch(
  () => props.initialValue,
  (value) => {
    query.value = value
  },
)

async function submit() {
  const q = query.value.trim()

  if (!q) {
    return
  }

  await navigateTo(localePath({ name: 'search', query: { q } }))
}
</script>

<template>
  <UForm
    class="w-full min-w-0"
    :state="{ q: query }"
    role="search"
    @submit="submit"
  >
    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 max-[560px]:grid-cols-1">
      <UFormField
        v-if="label"
        :label="label"
        name="q"
        class="min-w-0 flex-1"
      >
        <UInput
          v-model="query"
          type="search"
          name="q"
          icon="i-lucide-search"
          :placeholder="placeholder || t('search.placeholder')"
          maxlength="80"
          autocomplete="off"
        size="xl"
        class="w-full min-w-0"
        />
      </UFormField>
      <UInput
        v-else
        v-model="query"
        type="search"
        name="q"
        icon="i-lucide-search"
        :placeholder="placeholder || t('search.placeholder')"
        :aria-label="t('navigation.searchPacks')"
        maxlength="80"
        autocomplete="off"
        size="xl"
        class="w-full min-w-0"
        :ui="{ base: 'border border-ink bg-paper' }"
      />
      <UButton
        type="submit"
        :label="submitLabel || t('navigation.searchPacks')"
        icon="i-lucide-search"
        size="xl"
        :disabled="!canSubmit"
        class="offset-action w-full max-[560px]:mt-1 sm:w-auto"
      />
    </div>
  </UForm>
</template>

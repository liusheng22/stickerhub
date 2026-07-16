<script setup lang="ts">
import { en, zh_cn } from '@nuxt/ui/locale'

const { locale, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const uiLocales = [zh_cn, en]
type AppLocale = 'zh-CN' | 'en'

const selectedLocale = computed({
  get: () => locale.value,
  set: async (value: string) => {
    if (value !== 'zh-CN' && value !== 'en') return
    const path = switchLocalePath(value as AppLocale)
    if (path) {
      await navigateTo(path)
    }
  },
})
</script>

<template>
  <ULocaleSelect
    v-model="selectedLocale"
    :locales="uiLocales"
    :aria-label="t('common.language')"
    color="neutral"
    variant="outline"
    class="min-w-32"
    :ui="{ base: 'border-ink/80 bg-paper' }"
  />
</template>

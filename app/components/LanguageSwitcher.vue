<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { locale, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
type AppLocale = 'zh-CN' | 'en'

defineOptions({ inheritAttrs: false })

const currentLabel = computed(() => locale.value === 'zh-CN' ? '中文' : 'EN')
const localeItems = computed<DropdownMenuItem[]>(() => [
  {
    label: '简体中文',
    icon: locale.value === 'zh-CN' ? 'i-lucide-check' : undefined,
    onSelect: () => switchTo('zh-CN'),
  },
  {
    label: 'English',
    icon: locale.value === 'en' ? 'i-lucide-check' : undefined,
    onSelect: () => switchTo('en'),
  },
])

async function switchTo(value: AppLocale) {
  if (value === locale.value) return
  const path = switchLocalePath(value)
  if (path) await navigateTo(path)
}
</script>

<template>
  <div v-bind="$attrs">
    <UDropdownMenu :items="localeItems" :content="{ align: 'end', sideOffset: 8 }">
      <UButton
        :label="currentLabel"
        icon="i-lucide-languages"
        trailing-icon="i-lucide-chevron-down"
        :aria-label="t('common.language')"
        color="neutral"
        variant="ghost"
        size="sm"
        class="min-h-11 w-full justify-between px-2.5 text-sm font-semibold text-ink/65 hover:bg-sky/35 hover:text-ink lg:w-auto"
      />
    </UDropdownMenu>
  </div>
</template>

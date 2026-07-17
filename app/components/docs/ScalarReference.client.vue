<script setup lang="ts">
type ScalarConfiguration = Record<string, unknown>

type ScalarReferenceInstance = {
  destroy: () => void
}

type ScalarReferenceApi = {
  createApiReference: (
    element: Element,
    configuration: ScalarConfiguration,
  ) => ScalarReferenceInstance
}

declare global {
  interface Window {
    Scalar?: ScalarReferenceApi
  }
}

const props = defineProps<{
  configuration: ScalarConfiguration
}>()

const { t } = useI18n()
const host = useTemplateRef<HTMLDivElement>('host')
const hasLoadError = ref(false)
let reference: ScalarReferenceInstance | undefined

function loadStandaloneScript() {
  if (window.Scalar?.createApiReference) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const scriptId = 'scalar-api-reference-standalone'
    const existingScript = document.getElementById(scriptId)

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Scalar failed to load.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = '/_scalar/standalone.js'
    script.async = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Scalar failed to load.')), { once: true })
    document.head.append(script)
  })
}

onMounted(async () => {
  try {
    await loadStandaloneScript()

    if (!host.value || !window.Scalar?.createApiReference) {
      throw new Error('Scalar is unavailable.')
    }

    reference = window.Scalar.createApiReference(host.value, props.configuration)
  } catch {
    hasLoadError.value = true
  }
})

onBeforeUnmount(() => {
  reference?.destroy()
})
</script>

<template>
  <div ref="host" class="min-h-[65vh]">
    <UAlert
      v-if="hasLoadError"
      :title="t('docs.referenceLoadErrorTitle')"
      :description="t('docs.referenceLoadErrorDescription')"
      icon="i-lucide-circle-alert"
      color="error"
      variant="subtle"
      class="m-6"
    />
  </div>
</template>

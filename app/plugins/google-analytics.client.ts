export default defineNuxtPlugin(() => {
  const { proxy } = useScriptGoogleAnalytics()
  let isInitialPage = true

  useScriptEventPage(({ path, title }) => {
    if (isInitialPage) {
      isInitialPage = false
      return
    }

    proxy.gtag('event', 'page_view', {
      page_location: window.location.href,
      page_path: path,
      page_title: title,
    })
  })
})

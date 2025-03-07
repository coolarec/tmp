import { setup } from '@css-render/vue3-ssr'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  if (process.server) {
    const { collect } = setup(nuxtApp.vueApp)
    const originalRenderMeta = nuxtApp.ssrContext?.renderMeta
    nuxtApp.ssrContext!.renderMeta = () => {
      if (!originalRenderMeta) {
        return {
          headTags: collect()
        }
      }
      const originalMeta = typeof originalRenderMeta === 'function' 
        ? originalRenderMeta() 
        : {}
      return {
        ...originalMeta,
        headTags: (originalMeta.headTags || '') + collect()
      }
    }
  }
}) 
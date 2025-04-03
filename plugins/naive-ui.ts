import { setup } from '@css-render/vue3-ssr'
import { defineNuxtPlugin } from '#app'
import { 
  create,
  // 仅导入必要组件
  NCard, 
  NSpace, 
  NIcon,
  NDivider,
  NText,
  NButton,
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NLayoutHeader,
  NMenu,
  NMessageProvider,
  NNotificationProvider,
  NDialogProvider,
  NConfigProvider
} from 'naive-ui'

/**
 * Naive UI SSR plugin
 * Handles server-side rendering setup for Naive UI
 * Component registration is handled in components.ts
 */
export default defineNuxtPlugin((nuxtApp) => {
  // 创建Naive UI实例，只包含基本组件
  const naive = create({
    components: [
      NCard, 
      NSpace, 
      NIcon,
      NDivider,
      NText,
      NButton,
      NLayout,
      NLayoutSider,
      NLayoutContent,
      NLayoutHeader,
      NMenu,
      NMessageProvider,
      NNotificationProvider,
      NDialogProvider,
      NConfigProvider
    ]
  })
  
  // 注册Naive UI
  nuxtApp.vueApp.use(naive)
  
  // SSR设置
  if (process.server) {
    const { collect } = setup(nuxtApp.vueApp)
    const renderMeta = nuxtApp.ssrContext?.renderMeta
    nuxtApp.ssrContext!.renderMeta = () => {
      if (!renderMeta) {
        return {
          headTags: collect()
        }
      }
      
      if (typeof renderMeta === 'function') {
        const originalMeta = renderMeta()
        return {
          ...originalMeta,
          headTags: (originalMeta.headTags || '') + collect()
        }
      }
      
      return {
        ...renderMeta,
        headTags: ((renderMeta as any).headTags || '') + collect()
      }
    }
  }
}) 
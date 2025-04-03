// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  build: {
    transpile: [
      'naive-ui',
      'vueuc',
      '@css-render/vue3-ssr',
      '@juggle/resize-observer',
      'echarts'
    ]
  },
  modules: [
    'unplugin-vue-components/nuxt'
  ],
  components: true,
  plugins: [
    '~/plugins/naive-ui.ts'
  ],
  runtimeConfig: {
    public: {
      apiRefreshInterval: 5000
    }
  },
  vite: {
    optimizeDeps: {
      include: ['naive-ui', 'echarts', '@vicons/ionicons5']
    },
    server: {
      hmr: {
        overlay: false
      }
    }
  },
  nitro: {
    prerender: {
      crawlLinks: false
    }
  }
})

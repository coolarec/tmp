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
  nitro: {
    prerender: {
      crawlLinks: false
    }
  },
  vite: {
    optimizeDeps: {
      include: ['naive-ui', 'echarts']
    },
    build: {
      minify: 'terser',
      cssMinify: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            echarts: ['echarts'],
          }
        }
      }
    }
  }
})

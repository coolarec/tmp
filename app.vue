<template>
  <n-config-provider>
    <n-layout has-sider>
      <n-layout-sider
        bordered
        collapse-mode="width"
        :collapsed-width="64"
        :width="240"
        :native-scrollbar="false"
      >
        <n-menu
          :collapsed-width="64"
          :collapsed-icon-size="22"
          :options="menuOptions"
          :value="activeKey"
          @update:value="handleMenuUpdate"
        />
      </n-layout-sider>
      <n-layout>
        <!-- <n-layout-header bordered>
          <div class="header-content">
            <h2>我的应用</h2>
          </div>
        </n-layout-header> -->
        <n-layout-content content-style="padding: 24px;">
          <NuxtPage />
        </n-layout-content>
      </n-layout>
    </n-layout>
    <canvas id="fireworks" style="position: fixed; top: 0; left: 0; pointer-events: none; z-index: 9999;"></canvas>
  </n-config-provider>
</template>

<script setup lang="ts">
import { h, ref } from 'vue'
import { useRouter } from 'vue-router'
// 使用动态导入来避免 SSR 问题
const { HomeOutline: HomeIcon, DocumentTextOutline: Page1Icon, DocumentsOutline: Page2Icon } = await import('@vicons/ionicons5')
const { 
  NIcon,
  NConfigProvider,
  NLayout,
  NLayoutSider,
  NLayoutHeader,
  NLayoutContent,
  NMenu
} = await import('naive-ui')

const router = useRouter()
const activeKey = ref('home')

function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = [
  {
    label: '首页',
    key: 'home',
    icon: renderIcon(HomeIcon)
  },
  {
    label: '摄像头检测',
    key: 'page1',
    icon: renderIcon(Page1Icon)
  },
  {
    label: '脑电波分析',
    key: 'page2',
    icon: renderIcon(Page2Icon)
  }
]

const routeMap: Record<string, string> = {
  'home': '/',
  'page1': '/page1',
  'page2': '/page2'
}

const handleMenuUpdate = (key: string) => {
  activeKey.value = key
  router.push(routeMap[key])
}
</script>

<style>
/* 重置默认样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
}

.header-content {
  padding: 16px 24px;
  display: flex;
  align-items: center;
}

.n-layout-header {
  height: 64px;
}

.n-layout {
  height: 100vh;
}
</style>

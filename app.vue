<template>
  <n-config-provider>
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
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
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { h, ref } from 'vue'
import { useRouter } from 'vue-router'
// 静态导入需要的图标，避免动态导入可能引起的SSR问题
import { HomeOutline, DocumentTextOutline, DocumentsOutline } from '@vicons/ionicons5'
// 直接导入必需的组件
import {
  NIcon,
  NConfigProvider,
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NMenu,
  NMessageProvider,
  NNotificationProvider,
  NDialogProvider
} from 'naive-ui'

const router = useRouter()
const activeKey = ref('home')

// 不要在响应式数据中存储函数，而是在需要时生成
function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

// 创建菜单选项的方式修改为不直接存储函数
const menuOptions = [
  {
    label: '首页',
    key: 'home',
    icon: renderIcon(HomeOutline)
  },
  {
    label: '摄像头检测',
    key: 'page1',
    icon: renderIcon(DocumentTextOutline)
  },
  {
    label: '脑电波分析',
    key: 'page2',
    icon: renderIcon(DocumentsOutline)
  }
]

const routeMap: Record<string, string> = {
  'home': '/',
  'page1': '/page1',
  'page2': '/page2'
}

// 避免在handleMenuUpdate中捕获外部函数
const handleMenuUpdate = (key: string) => {
  activeKey.value = key
  const path = routeMap[key] || '/'
  router.push(path)
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

/* Improved transitions */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>

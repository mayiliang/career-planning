/**
 * Vue 应用入口文件
 * 
 * Phase 0 实现：
 * - 初始化 Vue 应用
 * - 配置 Vue Router
 * - 配置 Pinia 状态管理
 * - 配置 Vue Query 服务端状态管理
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';

import App from './app/App.vue';
import router from './router';

// 创建 Vue 应用实例
const app = createApp(App);

// 注册 Pinia（本地 UI 状态和用户偏好）
const pinia = createPinia();
app.use(pinia);

// 注册 Vue Router
app.use(router);

// 注册 Vue Query（服务端数据缓存）
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        // 本地服务响应快，使用较短的超时
        staleTime: 1000 * 60 * 5, // 5 分钟
        gcTime: 1000 * 60 * 30, // 30 分钟
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  },
});

// 挂载应用
app.mount('#app');

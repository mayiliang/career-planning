<script setup lang="ts">
/**
 * 应用根组件
 * 
 * Phase 0 实现：
 * - 显示服务健康状态
 * - 左侧导航布局基础结构
 */
import { useQuery } from '@tanstack/vue-query';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { apiClient } from '@/api/client';
import CommandPalette from './CommandPalette.vue';
import AiAssistant from '@/components/AiAssistant.vue';

const commandPaletteOpen = ref(false);

// 查询服务健康状态
const { data: healthStatus, isFetching, error } = useQuery({
  queryKey: ['system', 'health'],
  queryFn: () => apiClient.getHealth(),
  refetchInterval: 1000 * 30, // 每 30 秒刷新一次
});

// 计算服务状态文案
const statusText = computed(() => {
  if (isFetching.value) return '检查中...';
  if (error.value) return '服务离线';
  if (healthStatus.value?.ok) return '服务正常';
  return '状态未知';
});

// 计算状态颜色
const statusColor = computed(() => {
  if (isFetching.value) return 'var(--color-amber-review)';
  if (error.value) return 'var(--color-redline)';
  if (healthStatus.value?.ok) return 'var(--color-moss-proof)';
  return 'var(--color-amber-review)';
});

// 导航菜单项
const navItems = [
  { path: '/', label: '学习台', hint: 'LEARN', glyph: '学' },
  { path: '/knowledge/map', label: '知识体系', hint: 'ATLAS', glyph: '知' },
  { path: '/notes', label: '笔记中心', hint: 'NOTES', glyph: '记' },
  { path: '/plan', label: '核心路线', hint: '35 BATCHES', glyph: '路' },
  { path: '/jobs', label: '求职支线', hint: 'JOBS', glyph: '职' },
];

const route = useRoute();
const routeAnnouncement = computed(() => `${String(route.meta.title ?? 'Career Atlas')}页面已打开`);
const isActive = (path: string) => {
  if (path === '/') return route.path === '/';
  if (path === '/knowledge/map') return route.path.startsWith('/knowledge');
  return route.path === path || route.path.startsWith(`${path}/`);
};
</script>

<template>
  <div class="app-root">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <!-- 左侧导航 -->
    <nav class="side-nav" aria-label="主导航">
      <div class="nav-header">
        <img class="brand-mark" src="/career-atlas-icon-192.png" alt="" width="38" height="38" aria-hidden="true" />
        <div class="brand-copy"><div class="app-title">Career Atlas</div><p>AI 时代前端能力地图</p></div>
      </div>
      
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.path">
          <RouterLink 
            :to="item.path" 
            class="nav-link"
            :class="{ active: isActive(item.path) }"
            :aria-current="isActive(item.path) ? 'page' : undefined"
            :title="item.label"
          >
            <span class="nav-glyph">{{ item.glyph }}</span>
            <span class="nav-copy"><strong>{{ item.label }}</strong><small>{{ item.hint }}</small></span>
          </RouterLink>
        </li>
      </ul>

      <button class="command-trigger" aria-label="快速查找，快捷键 Command 或 Control 加 K" @click="commandPaletteOpen = true">
        <span>⌕</span><span class="command-copy"><strong>快速查找</strong><small>知识点与页面</small></span><kbd>⌘ K</kbd>
      </button>
      
      <div class="nav-footer">
        <div class="service-state" :title="statusText"><span :style="{ backgroundColor: statusColor }"></span><div><strong>{{ statusText }}</strong><small>本地数据服务</small></div></div>
        <RouterLink to="/settings" class="nav-link settings-link" :class="{ active: isActive('/settings') }" :aria-current="isActive('/settings') ? 'page' : undefined" title="设置与数据">
          <span class="nav-glyph">设</span><span class="nav-copy"><strong>设置与数据</strong><small>LOCAL</small></span>
        </RouterLink>
      </div>
    </nav>

    <!-- 主内容区 -->
    <main id="main-content" class="main-content" tabindex="-1">
      <p class="sr-only" aria-live="polite">{{ routeAnnouncement }}</p>
      <div class="content-frame">
        <RouterView v-slot="{ Component }">
          <Transition name="route" mode="out-in">
            <div :key="route.path" class="route-shell"><component :is="Component" /></div>
          </Transition>
        </RouterView>
      </div>
    </main>
    <CommandPalette v-model="commandPaletteOpen" />
    <AiAssistant />
  </div>
</template>

<style src="./App.styles.css"></style>

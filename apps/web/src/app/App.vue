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
  { path: '/', label: '今日', hint: 'TODAY', glyph: '今' },
  { path: '/knowledge/map', label: '知识体系', hint: 'ATLAS', glyph: '知' },
  { path: '/plan', label: '学习计划', hint: 'PLAN', glyph: '程' },
  { path: '/jobs', label: '求职支线', hint: 'JOBS', glyph: '职' },
];

const route = useRoute();
const isActive = (path: string) => {
  if (path === '/') return route.path === '/';
  if (path === '/knowledge/map') return route.path.startsWith('/knowledge');
  return route.path === path || route.path.startsWith(`${path}/`);
};
</script>

<template>
  <div class="app-root">
    <!-- 左侧导航 -->
    <nav class="side-nav">
      <div class="nav-header">
        <div class="brand-mark">CA</div>
        <div class="brand-copy"><h1 class="app-title">Career Atlas</h1><p>AI 时代前端能力地图</p></div>
      </div>
      
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.path">
          <RouterLink 
            :to="item.path" 
            class="nav-link"
            :class="{ active: isActive(item.path) }"
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
        <RouterLink to="/settings" class="nav-link settings-link" :class="{ active: isActive('/settings') }">
          <span class="nav-glyph">设</span><span class="nav-copy"><strong>设置与数据</strong><small>LOCAL</small></span>
        </RouterLink>
      </div>
    </nav>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-frame"><RouterView /></div>
    </main>
    <CommandPalette v-model="commandPaletteOpen" />
  </div>
</template>

<style src="./App.styles.css"></style>

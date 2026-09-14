<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { apiClient } from '@/api/client';
import CommandPalette from './CommandPalette.vue';
import AiAssistant from '@/components/AiAssistant.vue';
import AppIcon from '@/components/AppIcon.vue';

const commandPaletteOpen = ref(false);
const sidebarCollapsed = ref(false);
const shortcutLabel = ref('Ctrl K');

onMounted(() => {
  shortcutLabel.value = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
  try { sidebarCollapsed.value = localStorage.getItem('career-atlas:sidebar-collapsed') === 'true'; } catch { /* 隐私模式仍可切换导航。 */ }
});

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  try { localStorage.setItem('career-atlas:sidebar-collapsed', String(sidebarCollapsed.value)); } catch { /* 存储不可用时保留本次会话设置。 */ }
}

// 查询服务健康状态
const { data: healthStatus, isFetching, error } = useQuery({
  queryKey: ['system', 'health'],
  queryFn: () => apiClient.getHealth(),
  refetchInterval: 1000 * 30, // 每 30 秒刷新一次
});

// 计算服务状态文案
const statusText = computed(() => {
  if (isFetching.value && !healthStatus.value) return '连接中…';
  if (error.value) return '服务离线';
  if (healthStatus.value?.ok) return '服务正常';
  return '状态未知';
});

// 计算状态颜色
const statusColor = computed(() => {
  if (isFetching.value && !healthStatus.value) return 'var(--color-amber-review)';
  if (error.value) return 'var(--color-redline)';
  if (healthStatus.value?.ok) return 'var(--color-moss-proof)';
  return 'var(--color-amber-review)';
});

// 导航菜单项
const navItems = [
  { path: '/', label: '学习台', icon: 'home' },
  { path: '/knowledge/map', label: '知识体系', icon: 'map' },
  { path: '/notes', label: '笔记中心', icon: 'book' },
  { path: '/plan', label: '核心路线', icon: 'route' },
  { path: '/jobs', label: '求职支线', icon: 'briefcase' },
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
  <div class="app-root" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <!-- 左侧导航 -->
    <nav id="primary-navigation" class="side-nav" aria-label="主导航">
      <div class="nav-header">
        <img class="brand-mark" src="/career-atlas-icon-192.png" alt="" width="38" height="38" aria-hidden="true" />
        <div class="brand-copy"><div class="app-title">Career Atlas</div><p>AI 时代前端能力地图</p></div>
      </div>
      
      <p class="nav-caption">我的工作空间</p>
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.path">
          <RouterLink 
            :to="item.path" 
            class="nav-link"
            :class="{ active: isActive(item.path) }"
            :aria-current="isActive(item.path) ? 'page' : undefined"
            :title="item.label"
          >
            <span class="nav-glyph"><AppIcon :name="item.icon" /></span>
            <span class="nav-copy"><strong>{{ item.label }}</strong></span>
          </RouterLink>
        </li>
      </ul>

      <div class="nav-footer">
        <RouterLink to="/settings" class="nav-link settings-link" :class="{ active: isActive('/settings') }" :aria-current="isActive('/settings') ? 'page' : undefined" title="设置与数据">
          <span class="nav-glyph"><AppIcon name="settings" /></span><span class="nav-copy"><strong>设置与数据</strong></span>
        </RouterLink>
        <div class="service-state" :title="statusText"><span :style="{ backgroundColor: statusColor }"></span><div><strong>{{ statusText }}</strong><small>本地优先 · 自主学习</small></div></div>
      </div>
    </nav>

    <!-- 主内容区 -->
    <div class="main-area">
      <header class="workspace-bar">
        <div class="workspace-location">
          <button class="sidebar-toggle icon-button" :aria-label="sidebarCollapsed ? '展开侧栏' : '收起侧栏'" :aria-expanded="!sidebarCollapsed" aria-controls="primary-navigation" :title="sidebarCollapsed ? '展开侧栏' : '收起侧栏'" @click="toggleSidebar"><AppIcon name="panel" /></button>
          <span class="workspace-label">工作空间</span><span class="breadcrumb-divider" aria-hidden="true">/</span><span class="current-location">{{ route.meta.title }}</span>
        </div>
        <div class="workspace-tools">
          <button class="command-trigger" aria-label="快速查找，快捷键 Command 或 Control 加 K" aria-haspopup="dialog" :aria-expanded="commandPaletteOpen" @click="commandPaletteOpen = true"><AppIcon name="search" /><span>搜索知识点、页面…</span><kbd>{{ shortcutLabel }}</kbd></button>
          <RouterLink class="mobile-settings icon-button" to="/settings" aria-label="设置与数据" :aria-current="isActive('/settings') ? 'page' : undefined"><AppIcon name="settings" /></RouterLink>
        </div>
      </header>
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
    </div>
    <CommandPalette v-model="commandPaletteOpen" />
    <AiAssistant />
  </div>
</template>

<style src="./App.styles.css"></style>

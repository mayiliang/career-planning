<script setup lang="ts">
/**
 * 应用根组件
 * 
 * Phase 0 实现：
 * - 显示服务健康状态
 * - 左侧导航布局基础结构
 */
import { useQuery } from '@tanstack/vue-query';
import { ref, computed } from 'vue';
import { apiClient } from '@/api/client';

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
  { path: '/', label: '今日', icon: 'Calendar' },
  { path: '/knowledge', label: '知识', icon: 'Collection' },
  { path: '/plan', label: '计划', icon: 'Schedule' },
  { path: '/jobs', label: '求职', icon: 'Briefcase' },
];

// 当前路径
const currentPath = ref('/');
</script>

<template>
  <div class="app-root">
    <!-- 左侧导航 -->
    <nav class="side-nav">
      <div class="nav-header">
        <h1 class="app-title">Career Atlas</h1>
        <div 
          class="status-badge" 
          :style="{ backgroundColor: statusColor }"
          :title="statusText"
        >
          {{ statusText }}
        </div>
      </div>
      
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.path">
          <RouterLink 
            :to="item.path" 
            class="nav-link"
            :class="{ active: currentPath === item.path }"
            @click="currentPath = item.path"
          >
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
      
      <div class="nav-footer">
        <RouterLink to="/settings" class="nav-link">
          设置
        </RouterLink>
      </div>
    </nav>

    <!-- 主内容区 -->
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style src="./App.styles.css"></style>
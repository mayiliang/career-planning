/**
 * Vue Router 配置
 * 
 * Phase 0 实现：
 * - 基础路由表
 * - 懒加载页面组件
 */
import { createRouter, createWebHistory } from 'vue-router';

// 路由表定义
const routes = [
  {
    path: '/',
    name: 'Today',
    component: () => import('@/features/today/TodayPage.vue'),
    meta: { title: '今日' },
  },
  {
    path: '/knowledge',
    name: 'Knowledge',
    component: () => import('@/features/knowledge/KnowledgePage.vue'),
    meta: { title: '知识' },
  },
  {
    path: '/knowledge/:code',
    name: 'KnowledgeDetail',
    component: () => import('@/features/knowledge/KnowledgeDetailPage.vue'),
    meta: { title: '知识点详情' },
  },
  {
    path: '/plan',
    name: 'Plan',
    component: () => import('@/features/calendar/CalendarPage.vue'),
    meta: { title: '计划' },
  },
  {
    path: '/jobs',
    name: 'Jobs',
    component: () => import('@/features/jobs/JobsPage.vue'),
    meta: { title: '求职' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/features/settings/SettingsPage.vue'),
    meta: { title: '设置' },
  },
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫：更新页面标题
router.beforeEach((to) => {
  const title = to.meta.title as string | undefined;
  if (title) {
    document.title = `${title} - Career Atlas`;
  }
});

export default router;
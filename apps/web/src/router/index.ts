/**
 * Vue Router 配置
 *
 * Phase 0 实现：
 * - 基础路由表
 * - 懒加载页面组件
 *
 * Phase 4 新增：
 * - 知识图谱路由
 *
 * Phase 6 新增：
 * - 岗位详情路由
 */
import { createRouter, createWebHistory } from 'vue-router';

// 路由表定义
const routes = [
  {
    path: '/',
    name: 'Today',
    component: () => import('@/features/today/TodayPage.vue'),
    meta: { title: '学习台' },
  },
  {
    path: '/knowledge',
    name: 'Knowledge',
    component: () => import('@/features/knowledge/KnowledgePage.vue'),
    meta: { title: '知识' },
  },
  {
    path: '/knowledge/map',
    name: 'KnowledgeMindMap',
    component: () => import('@/features/knowledge/KnowledgeMindMapPage.vue'),
    meta: { title: '知识脑图' },
  },
  {
    path: '/knowledge/graph',
    name: 'KnowledgeGraph',
    component: () => import('@/features/knowledge/KnowledgeGraphPage.vue'),
    meta: { title: '知识图谱' },
  },
  {
    path: '/knowledge/materials/:guide/:anchor',
    name: 'KnowledgeMaterial',
    component: () => import('@/features/knowledge/KnowledgeMaterialPage.vue'),
    meta: { title: '中文学习资料' },
  },
  {
    path: '/knowledge/:code',
    name: 'KnowledgeDetail',
    component: () => import('@/features/knowledge/KnowledgeDetailPage.vue'),
    meta: { title: '知识点详情' },
  },
  {
    path: '/assessment/:id',
    name: 'Assessment',
    component: () => import('@/features/assessment/AssessmentPage.vue'),
    meta: { title: '掌握挑战' },
  },
  {
    path: '/plan',
    name: 'Plan',
    component: () => import('@/features/calendar/CalendarPage.vue'),
    meta: { title: '路线参考' },
  },
  {
    path: '/notes',
    name: 'Notes',
    component: () => import('@/features/notes/NotesPage.vue'),
    meta: { title: '笔记中心' },
  },
  {
    path: '/jobs',
    name: 'Jobs',
    component: () => import('@/features/jobs/JobsPage.vue'),
    meta: { title: '求职' },
  },
  {
    path: '/jobs/:id',
    name: 'JobDetail',
    component: () => import('@/features/jobs/JobDetailPage.vue'),
    meta: { title: '岗位详情' },
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

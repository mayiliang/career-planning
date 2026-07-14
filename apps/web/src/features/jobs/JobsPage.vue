<script setup lang="ts">
/**
 * 求职看板页面
 *
 * Phase 6 实现：岗位看板、漏斗统计、快捷操作
 */
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { apiClient, type JobKanbanColumn, type JobFunnelStats, type Job } from '../../api/client';

const router = useRouter();

// 看板数据
const kanbanColumns = ref<JobKanbanColumn[]>([]);
const funnelStats = ref<JobFunnelStats | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// 加载数据
async function loadData() {
  loading.value = true;
  error.value = null;

  try {
    const [kanban, funnel] = await Promise.all([
      apiClient.getJobKanban(),
      apiClient.getJobFunnelStats(),
    ]);

    kanbanColumns.value = kanban;
    funnelStats.value = funnel;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

// 计算非空列
const nonEmptyColumns = computed(() => {
  return kanbanColumns.value.filter(col => col.jobs.length > 0);
});

// 查看岗位详情
function viewJobDetail(job: Job) {
  router.push(`/jobs/${job.id}`);
}

// 转换率计算
const conversionRate = computed(() => {
  if (!funnelStats.value) return 0;
  const { saved, applied, interviewing, offer } = funnelStats.value;
  const total = saved + applied + interviewing + offer;
  if (total === 0) return 0;
  return Math.round((offer / total) * 100);
});

onMounted(loadData);
</script>

<template>
  <div class="jobs-page">
    <!-- 页面头部：漏斗统计 -->
    <header class="page-header">
      <h2>求职管理</h2>
      <div v-if="funnelStats" class="funnel-stats">
        <div class="stat-item">
          <span class="stat-value">{{ funnelStats.saved }}</span>
          <span class="stat-label">已保存</span>
        </div>
        <div class="stat-arrow">→</div>
        <div class="stat-item">
          <span class="stat-value">{{ funnelStats.applied }}</span>
          <span class="stat-label">已投递</span>
        </div>
        <div class="stat-arrow">→</div>
        <div class="stat-item">
          <span class="stat-value">{{ funnelStats.interviewing }}</span>
          <span class="stat-label">面试中</span>
        </div>
        <div class="stat-arrow">→</div>
        <div class="stat-item highlight">
          <span class="stat-value">{{ funnelStats.offer }}</span>
          <span class="stat-label">Offer</span>
        </div>
        <div class="conversion-rate">
          转化率: {{ conversionRate }}%
        </div>
      </div>
    </header>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      加载中...
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      {{ error }}
      <button @click="loadData">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="nonEmptyColumns.length === 0" class="empty-state">
      <p>暂无岗位记录</p>
      <p class="hint">从招聘平台复制岗位信息，或导入 CSV 文件</p>
    </div>

    <!-- 看板视图 -->
    <div v-else class="kanban-board">
      <div
        v-for="column in nonEmptyColumns"
        :key="column.status"
        class="kanban-column"
      >
        <div class="column-header">
          <span class="column-title">{{ column.title }}</span>
          <span class="column-count">{{ column.jobs.length }}</span>
        </div>

        <div class="column-content">
          <div
            v-for="job in column.jobs"
            :key="job.id"
            class="job-card"
            @click="viewJobDetail(job)"
          >
            <div class="job-company">{{ job.company }}</div>
            <div class="job-title">{{ job.jobTitle }}</div>
            <div class="job-meta">
              <span v-if="job.salary" class="salary">{{ job.salary }}</span>
              <span v-if="job.location" class="location">{{ job.location }}</span>
            </div>
            <div v-if="job.nextAction" class="next-action">
              下一步: {{ job.nextAction }}
            </div>
            <!-- 匹配度指示 -->
            <div v-if="job.matchLevel" class="match-indicator">
              <span
                :class="['match-level', job.matchLevel.toLowerCase()]"
              >
                {{ job.matchLevel === 'HIGH' ? '高匹配' : job.matchLevel === 'MEDIUM' ? '中匹配' : '低匹配' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="./JobsPage.styles.css" scoped></style>
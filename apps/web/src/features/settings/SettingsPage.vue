<script setup lang="ts">
/**
 * 设置页面
 * 
 * Phase 0 实现：显示系统状态和配置信息
 */
import { useQuery } from '@tanstack/vue-query';
import { apiClient } from '@/api/client';
import { computed } from 'vue';

// 查询系统健康状态
const { data: health, isFetching, error } = useQuery({
  queryKey: ['system', 'health'],
  queryFn: () => apiClient.getHealth(),
});

// 查询 AI 状态
const { data: aiStatus } = useQuery({
  queryKey: ['system', 'ai'],
  queryFn: async () => {
    // Phase 0 暂不实现完整 AI API
    return { configured: false, provider: 'deepseek', model: '未配置' };
  },
});

// 状态文案
const dbStatusText = computed(() => {
  if (!health.value) return '未检测';
  return health.value.db ? '正常' : '异常';
});

const dataDirStatusText = computed(() => {
  if (!health.value) return '未检测';
  return health.value.dataDir ? '可写' : '不可写';
});
</script>

<template>
  <div class="settings-page">
    <h2>系统设置</h2>
    
    <section class="status-section">
      <h3>服务状态</h3>
      <div v-if="isFetching" class="loading">检查中...</div>
      <div v-else-if="error" class="error">{{ error.message }}</div>
      <div v-else-if="health" class="status-grid">
        <div class="status-item">
          <span class="label">数据库</span>
          <span :class="['value', health.db ? 'ok' : 'error']">
            {{ dbStatusText }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">数据目录</span>
          <span :class="['value', health.dataDir ? 'ok' : 'error']">
            {{ dataDirStatusText }}
          </span>
        </div>
      </div>
    </section>
    
    <section class="ai-section">
      <h3>AI 配置</h3>
      <div class="ai-config">
        <div class="config-item">
          <span class="label">Provider</span>
          <span class="value">{{ aiStatus?.provider || 'deepseek' }}</span>
        </div>
        <div class="config-item">
          <span class="label">模型</span>
          <span :class="['value', aiStatus?.configured ? '' : 'warning']">
            {{ aiStatus?.model || '未配置' }}
          </span>
        </div>
        <p class="ai-hint">
          API Key 从服务端环境变量读取，页面不显示密钥内容。
        </p>
      </div>
    </section>
    
    <section class="backup-section">
      <h3>备份与恢复</h3>
      <p class="hint">Phase 8 将实现完整备份功能。</p>
    </section>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 800px;
}

h2, h3 {
  font-family: var(--font-display);
}

h2 {
  font-size: 1.5rem;
  margin-bottom: calc(var(--space-base) * 2);
}

h3 {
  font-size: 1.125rem;
  margin-bottom: var(--space-base);
}

section {
  margin-bottom: calc(var(--space-base) * 3);
}

.status-grid,
.ai-config {
  display: grid;
  gap: var(--space-base);
}

.status-item,
.config-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-base);
  background-color: #fff;
  border-radius: var(--radius-base);
}

.label {
  color: var(--color-draft-ink);
}

.value {
  font-family: var(--font-mono);
}

.value.ok {
  color: var(--color-moss-proof);
}

.value.error {
  color: var(--color-redline);
}

.value.warning {
  color: var(--color-amber-review);
}

.loading {
  color: var(--color-amber-review);
}

.error {
  color: var(--color-redline);
}

.hint,
.ai-hint {
  font-size: 0.875rem;
  color: #666;
}
</style>
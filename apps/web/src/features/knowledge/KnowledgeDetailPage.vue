<script setup lang="ts">
/**
 * 知识点详情页面
 * 
 * Phase 0 实现：基础壳
 */
import { useRoute } from 'vue-router';

const route = useRoute();
const knowledgeCode = route.params.code as string;
</script>

<template>
  <div class="knowledge-detail-page">
    <h2>知识点详情</h2>
    <p class="code-display">{{ knowledgeCode }}</p>
    <p class="placeholder-text">
      内容导入完成后，这里将显示学习资料、笔记和考核入口。
    </p>
  </div>
</template>

<style scoped>
.knowledge-detail-page {
  max-width: 800px;
}

h2 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  margin-bottom: var(--space-base);
}

.code-display {
  font-family: var(--font-mono);
  color: var(--color-blueprint);
  font-size: 1rem;
}
</style>
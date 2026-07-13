<script setup lang="ts">
/**
 * 今日页面
 * 
 * Phase 0 实现：基础壳
 */
</script>

<template>
  <div class="today-page">
    <h2>今日</h2>
    <p class="placeholder-text">
      内容导入完成后，这里将显示今天的计划任务。
    </p>
    <p class="hint-text">
      请先完成 Phase 1 的内容导入，生成学习计划。
    </p>
  </div>
</template>

<style scoped>
.today-page {
  max-width: 800px;
}

h2 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  margin-bottom: var(--space-base);
}

.placeholder-text {
  color: var(--color-draft-ink);
}

.hint-text {
  color: var(--color-amber-review);
  font-size: 0.875rem;
  margin-top: var(--space-base);
}
</style>
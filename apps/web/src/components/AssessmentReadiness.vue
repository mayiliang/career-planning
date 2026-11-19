<script setup lang="ts">
import { ASSESSMENT_PENDING, AUDITED_PREREQUISITES } from '@career-atlas/shared';
defineProps<{ code: string }>();
</script>
<template>
  <aside v-if="ASSESSMENT_PENDING[code]" class="assessment-readiness" aria-label="练习合同状态">
    <strong>练习合同待修订</strong><p>{{ ASSESSMENT_PENDING[code] }}</p>
    <p>本篇可正常阅读、自主标记学完和查看历史记录。新练习仅作结构检查并保存草稿，暂不创建新的语义挑战。</p>
    <p>本篇学习基础：<RouterLink v-for="dependency in AUDITED_PREREQUISITES[code]" :key="dependency" :to="{ path: `/knowledge/${dependency}`, query: { entryReturn: code } }">{{ dependency }} </RouterLink>。这与“我的下一步”分别说明本篇基础和个人推荐。</p>
  </aside>
</template>
<style scoped>
.assessment-readiness{padding:18px;border:1px solid #dfcca5;border-radius:12px;background:#fff9ed;color:#634d28;line-height:1.7}.assessment-readiness p{margin:7px 0}.assessment-readiness a{margin-right:8px;text-decoration:underline;color:inherit}
</style>

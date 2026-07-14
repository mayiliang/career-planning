<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import type { GraphNode } from '@/api/client';

const props = defineProps<{ data: GraphNode['data']; selected?: boolean }>();

const statusMeta = computed(() => ({
  MASTERED: { label: '已掌握', color: '#2f8a6a' },
  FIRST_PASS_PENDING_RETEST: { label: '待复测', color: '#c68a2d' },
  LEARNING: { label: '学习中', color: '#3268c7' },
  SELF_MASTERED: { label: '自评掌握', color: '#3268c7' },
  NEEDS_RELEARNING: { label: '需重学', color: '#c45052' },
  NOT_STARTED: { label: '未开始', color: '#8995a4' },
}[props.data.status ?? 'NOT_STARTED'] ?? { label: '未开始', color: '#8995a4' }));

const difficulty = computed(() => ({ intermediate: '中级', senior: '高级', advanced: '进阶' }[props.data.difficulty ?? ''] ?? '中级'));
</script>

<template>
  <article class="knowledge-node" :class="{ selected }" :style="{ '--node-accent': statusMeta.color }">
    <Handle type="target" :position="Position.Left" />
    <div class="mastery-orbit" :data-status="data.status"><i></i></div>
    <div class="node-copy">
      <div class="node-kicker"><code>{{ data.code }}</code><small>{{ difficulty }}</small></div>
      <strong>{{ data.title }}</strong>
      <span>{{ data.domainCode }} · {{ data.domainTitle }}</span>
    </div>
    <footer><span class="state-dot"></span>{{ statusMeta.label }}<i></i><small>双击打开</small></footer>
    <Handle type="source" :position="Position.Right" />
  </article>
</template>

<style scoped>
.knowledge-node { position: relative; display: grid; grid-template-columns: 48px 1fr; gap: .7rem; width: 220px; min-height: 112px; padding: .82rem .85rem .65rem; color: var(--color-text); background: rgba(255,255,255,.97); border: 1px solid var(--color-border); border-radius: 14px; box-shadow: 0 5px 20px rgba(28,46,74,.08); cursor: pointer; transition: transform .18s ease,border-color .18s ease,box-shadow .18s ease; }
.knowledge-node:hover { transform: translateY(-2px); border-color: var(--color-primary-border); box-shadow: 0 10px 28px rgba(28,46,74,.13); }.knowledge-node.selected { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-focus),0 10px 28px rgba(28,46,74,.13); }
.mastery-orbit { position: relative; display: grid; place-items: center; width: 43px; height: 43px; margin-top: .1rem; border: 2px solid #c9d2de; border-radius: 50%; }.mastery-orbit::after { position: absolute; inset: 5px; content: ''; border: 2px solid #dce3ec; border-radius: 50%; }.mastery-orbit i { width: 7px; height: 7px; background: #aeb8c5; border-radius: 50%; }.mastery-orbit[data-status='LEARNING']::after,.mastery-orbit[data-status='SELF_MASTERED']::after{border-color:var(--color-primary)}.mastery-orbit[data-status='FIRST_PASS_PENDING_RETEST']{border-color:var(--color-warning);border-style:dashed}.mastery-orbit[data-status='MASTERED'],.mastery-orbit[data-status='MASTERED']::after{border-color:var(--color-success)}.mastery-orbit[data-status='MASTERED'] i{background:var(--color-success)}.mastery-orbit[data-status='NEEDS_RELEARNING']{border-color:var(--color-danger)}
.node-copy { display: flex; min-width: 0; flex-direction: column; gap: .16rem; }.node-kicker { display: flex; gap: .4rem; align-items: center; }.node-kicker code { color: var(--color-primary); font: 750 .59rem var(--font-mono); }.node-kicker small { padding: .08rem .3rem; color: var(--color-text-tertiary); font-size: .52rem; background: var(--color-surface-raised); border-radius: 4px; }.node-copy>strong { display: -webkit-box; overflow: hidden; font-size: .77rem; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }.node-copy>span { overflow: hidden; color: var(--color-text-tertiary); font-size: .55rem; text-overflow: ellipsis; white-space: nowrap; }
footer { grid-column: 1/-1; display: flex; align-items: center; gap: .32rem; padding-top: .48rem; color: var(--node-accent); font-size: .57rem; font-weight: 680; border-top: 1px solid var(--color-border-subtle); }.state-dot { width: 6px; height: 6px; background: var(--node-accent); border-radius: 50%; }footer>i { flex: 1; border-top: 1px dashed var(--color-border); }footer small { color: var(--color-text-tertiary); font-size: .5rem; font-weight: 500; }
:deep(.vue-flow__handle) { width: 7px; height: 7px; background: var(--color-primary); border: 2px solid #fff; }
</style>

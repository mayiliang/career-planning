<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import type { GraphNode } from '@/api/client';

const props = defineProps<{ data: GraphNode['data']; selected?: boolean; expanded?: boolean }>();
const progress = computed(() => props.data.pointCount ? Math.round((props.data.masteredCount ?? 0) / props.data.pointCount * 100) : 0);
</script>

<template>
  <article class="domain-node" :class="{ selected, expanded }">
    <Handle type="target" :position="Position.Left" />
    <header><code>{{ data.code }}</code><span>{{ expanded ? 'LOCAL ROUTE' : 'DOMAIN' }}</span></header>
    <h2>{{ data.title }}</h2>
    <div class="progress-line"><i :style="{ width: `${progress}%` }"></i></div>
    <footer><span><strong>{{ data.masteredCount ?? 0 }}</strong>/{{ data.pointCount ?? 0 }} 掌握</span><b>{{ expanded ? '当前领域' : '点击下钻 →' }}</b></footer>
    <Handle type="source" :position="Position.Right" />
  </article>
</template>

<style scoped>
.domain-node { position: relative; width: 236px; min-height: 116px; padding: .85rem 1rem .75rem; color: var(--color-text); background: linear-gradient(145deg,#fff 0%,#f6f9fd 100%); border: 1px solid var(--color-border-strong); border-left: 4px solid var(--color-primary); border-radius: 5px 15px 15px 5px; box-shadow: 0 7px 24px rgba(26,42,67,.09); cursor: pointer; transition: transform .18s ease,border-color .18s ease,box-shadow .18s ease; }
.domain-node::after { position: absolute; top: 10px; right: 10px; width: 16px; height: 16px; content: ''; border-top: 1px solid var(--color-primary-border); border-right: 1px solid var(--color-primary-border); }.domain-node:hover { transform: translateY(-2px); border-color: var(--color-primary); box-shadow: 0 12px 30px rgba(26,42,67,.14); }.domain-node.selected,.domain-node.expanded { box-shadow: 0 0 0 3px var(--color-focus),0 12px 30px rgba(26,42,67,.14); }
header { display: flex; justify-content: space-between; align-items: center; }header code { color: var(--color-primary); font: 760 .68rem var(--font-mono); }header span { color: var(--color-text-tertiary); font: .49rem var(--font-mono); letter-spacing: .1em; }
h2 { overflow: hidden; margin: .35rem 0 .65rem; font-size: .93rem; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }.progress-line { height: 3px; overflow: hidden; background: var(--color-border); border-radius: 3px; }.progress-line i { display: block; height: 100%; background: linear-gradient(90deg,var(--color-primary),var(--color-success)); }
footer { display: flex; justify-content: space-between; margin-top: .5rem; color: var(--color-text-tertiary); font-size: .54rem; }footer strong { color: var(--color-success); font: 740 .65rem var(--font-mono); }footer b { color: var(--color-primary); font-weight: 650; }
:deep(.vue-flow__handle) { width: 8px; height: 8px; background: var(--color-primary); border: 2px solid #fff; }
</style>

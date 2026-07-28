<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MarkerType, VueFlow, useVueFlow, type Edge, type Node } from '@vue-flow/core';
import { apiClient, type GraphNode, type KnowledgePointListItem } from '@/api/client';
import DomainNode from './DomainNode.vue';
import KnowledgeGraphNode from './KnowledgeGraphNode.vue';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';

type StatusFilter = 'ALL' | 'ACTIVE' | 'MASTERED' | 'NOT_STARTED';

const router = useRouter();
const expandedDomain = ref<string | null>(null);
const searchKeyword = ref('');
const statusFilter = ref<StatusFilter>('ALL');
const selectedNode = ref<Node | null>(null);
const pendingFocusCode = ref<string | null>(null);

const { fitView, setCenter, onNodeClick, onNodeDoubleClick } = useVueFlow();

const { data: domainStats, isLoading: domainsLoading } = useQuery({
  queryKey: ['domain-stats'],
  queryFn: () => apiClient.getDomainStats(),
});

const { data: pointList } = useQuery({
  queryKey: ['knowledge-points', 'graph-search'],
  queryFn: () => apiClient.getKnowledgePoints(),
});

const { data: graphData, isLoading: graphLoading, isError: graphError } = useQuery({
  queryKey: ['graph-data', expandedDomain],
  queryFn: () => apiClient.getGraphData({ domainCode: expandedDomain.value || undefined }),
});

const activeDomain = computed(() => domainStats.value?.find((item) => item.code === expandedDomain.value));
const totalPoints = computed(() => domainStats.value?.reduce((sum, item) => sum + item.pointCount, 0) ?? 0);
const masteredPoints = computed(() => domainStats.value?.reduce((sum, item) => sum + item.masteredCount, 0) ?? 0);

const searchResults = computed<KnowledgePointListItem[]>(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) return [];
  return (pointList.value?.items ?? [])
    .filter((point) => `${point.code} ${point.title} ${point.domainTitle}`.toLowerCase().includes(keyword))
    .slice(0, 8);
});

function matchesStatus(node: GraphNode) {
  if (node.type === 'domain' || statusFilter.value === 'ALL') return true;
  const status = node.data.status;
  if (statusFilter.value === 'MASTERED') return status === 'MASTERED';
  if (statusFilter.value === 'NOT_STARTED') return status === 'NOT_STARTED';
  return ['LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'NEEDS_RELEARNING'].includes(status ?? '');
}

const nodes = computed<Node[]>(() => {
  return (graphData.value?.nodes ?? [])
    .filter(matchesStatus)
    .map((node) => ({
      id: node.id,
      type: node.type === 'domain' ? 'domainNode' : 'knowledgeNode',
      position: node.position,
      data: node.data,
    }));
});

function edgeAppearance(edgeType: string) {
  if (edgeType === 'CONTAINS') {
    return { stroke: '#aab7c7', strokeWidth: 1, strokeDasharray: '4 6' };
  }
  if (edgeType === 'PREREQUISITE') {
    return { stroke: '#c68a2d', strokeWidth: 2.2 };
  }
  if (edgeType === 'RELATED' || edgeType === 'APPLIED_WITH') {
    return { stroke: '#2f8a6a', strokeWidth: 1.8 };
  }
  return { stroke: '#4777c9', strokeWidth: 2 };
}

const edges = computed<Edge[]>(() => {
  const visibleNodeIds = new Set(nodes.value.map((node) => node.id));
  return (graphData.value?.edges ?? [])
    .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      animated: edge.data.edgeType === 'PREREQUISITE',
      style: edgeAppearance(edge.data.edgeType),
      markerEnd: edge.data.edgeType === 'CONTAINS' ? undefined : {
        type: MarkerType.ArrowClosed,
        color: edgeAppearance(edge.data.edgeType).stroke,
        width: 15,
        height: 15,
      },
      data: edge.data,
    }));
});

const selectedData = computed(() => selectedNode.value?.data as GraphNode['data'] | undefined);
const selectedRelations = computed(() => {
  if (!selectedNode.value) return { incoming: 0, outgoing: 0 };
  return {
    incoming: edges.value.filter((edge) => edge.target === selectedNode.value?.id).length,
    outgoing: edges.value.filter((edge) => edge.source === selectedNode.value?.id).length,
  };
});

function selectDomain(code: string | null) {
  expandedDomain.value = code;
  selectedNode.value = null;
  statusFilter.value = 'ALL';
}

function focusSearchResult(point: KnowledgePointListItem) {
  searchKeyword.value = '';
  pendingFocusCode.value = point.code;
  expandedDomain.value = point.domainCode;
}

function openSelectedPoint() {
  if (selectedData.value?.code && selectedNode.value?.type === 'knowledgeNode') {
    router.push(`/knowledge/${selectedData.value.code}`);
  }
}

onNodeClick(({ node }) => {
  selectedNode.value = node;
  if (node.type === 'domainNode') selectDomain(String(node.data.code));
});

onNodeDoubleClick(({ node }) => {
  if (node.type === 'knowledgeNode') router.push(`/knowledge/${String(node.data.code)}`);
});

watch([nodes, statusFilter], async () => {
  await nextTick();
  window.setTimeout(async () => {
    const focusCode = pendingFocusCode.value;
    if (focusCode) {
      const target = nodes.value.find((node) => node.data.code === focusCode);
      if (target) {
        selectedNode.value = target;
        await setCenter(target.position.x + 105, target.position.y + 55, { zoom: 1.15, duration: 500 });
        pendingFocusCode.value = null;
        return;
      }
    }
    await fitView({ padding: 0.16, duration: 420 });
  }, 80);
}, { immediate: true });

function statusLabel(status?: string) {
  return ({
    NOT_STARTED: '未开始', LEARNING: '学习中', SELF_MASTERED: '自评掌握',
    FIRST_PASS_PENDING_RETEST: '待复测', MASTERED: '已掌握', NEEDS_RELEARNING: '需重学',
  } as Record<string, string>)[status ?? ''] ?? '未开始';
}

function difficultyLabel(difficulty?: string) {
  return ({ intermediate: '中级', senior: '高级', advanced: '进阶' } as Record<string, string>)[difficulty ?? ''] ?? '中级';
}
</script>

<template>
  <div class="knowledge-graph-page">
    <header class="graph-header">
      <div>
        <p class="eyebrow">RELATION LENS · 关系透镜</p>
        <h1>沿着关系理解知识</h1>
        <p>脑图负责看全貌，关系图谱负责回答“先学什么、接着学什么，以及它属于哪条能力路径”。</p>
      </div>
      <nav class="header-actions" aria-label="知识体系视图切换">
        <button class="secondary-action" @click="router.push('/knowledge/map')">返回脑图</button>
        <button class="primary-action" @click="router.push('/knowledge')">查看知识清单</button>
      </nav>
    </header>

    <section class="graph-summary" aria-label="图谱概览">
      <div><strong>{{ domainStats?.length ?? '—' }}</strong><span>能力领域</span></div>
      <div><strong>{{ totalPoints || '—' }}</strong><span>知识节点</span></div>
      <div><strong>{{ masteredPoints }}</strong><span>严格掌握</span></div>
      <div class="summary-route">
        <span class="route-line"></span>
        <p><strong>{{ activeDomain ? `${activeDomain.code} · ${activeDomain.title}` : '全局建议路径' }}</strong><small>{{ activeDomain ? `${activeDomain.pointCount} 个节点，按学习顺序展开` : '点击领域进入局部关系，减少视觉噪音' }}</small></p>
      </div>
    </section>

    <div class="graph-workbench">
      <aside class="graph-navigator">
        <div class="panel-heading">
          <span>01</span>
          <div><strong>路径导航</strong><small>选择一个领域下钻</small></div>
        </div>

        <div class="graph-search">
          <label for="graph-search">定位知识点</label>
          <div class="search-shell"><span>⌕</span><input id="graph-search" v-model="searchKeyword" placeholder="输入编号或名称" autocomplete="off" /></div>
          <div v-if="searchKeyword" class="search-results">
            <button v-for="point in searchResults" :key="point.id" @click="focusSearchResult(point)">
              <code>{{ point.code }}</code><span>{{ point.title }}</span><small>{{ point.domainCode }}</small>
            </button>
            <p v-if="searchResults.length === 0">没有匹配的知识点</p>
          </div>
        </div>

        <button class="overview-button" :class="{ active: !expandedDomain }" @click="selectDomain(null)">
          <span class="overview-mark">◎</span><span><strong>全局路径</strong><small>{{ domainStats?.length ?? 20 }} 个领域的能力流向</small></span>
        </button>

        <div class="domain-list" :aria-busy="domainsLoading">
          <button v-for="domain in domainStats" :key="domain.id" :class="{ active: expandedDomain === domain.code }" @click="selectDomain(domain.code)">
            <code>{{ domain.code }}</code>
            <span><strong>{{ domain.title }}</strong><i><b :style="{ width: `${domain.pointCount ? domain.masteredCount / domain.pointCount * 100 : 0}%` }"></b></i></span>
            <small>{{ domain.masteredCount }}/{{ domain.pointCount }}</small>
          </button>
        </div>
      </aside>

      <main class="graph-stage-card">
        <header class="stage-toolbar">
          <div class="stage-breadcrumb">
            <button v-if="expandedDomain" @click="selectDomain(null)">全局</button><span v-if="expandedDomain">/</span>
            <strong>{{ activeDomain?.title ?? 'AI 时代前端能力路径' }}</strong>
          </div>
          <div class="stage-actions">
            <select v-model="statusFilter" aria-label="筛选知识状态" :disabled="!expandedDomain">
              <option value="ALL">全部状态</option><option value="ACTIVE">正在推进</option><option value="MASTERED">已经掌握</option><option value="NOT_STARTED">尚未开始</option>
            </select>
            <button title="适应画布" aria-label="适应画布" @click="fitView({ padding: 0.16, duration: 420 })">适应画布</button>
          </div>
        </header>

        <div class="graph-canvas" :class="{ loading: graphLoading }">
          <VueFlow v-if="nodes.length" :nodes="nodes" :edges="edges" :min-zoom="0.25" :max-zoom="1.8" fit-view-on-init :nodes-draggable="false" :select-nodes-on-drag="false">
            <Background pattern-color="#d6e0ed" :gap="24" :size="1" />
            <Controls position="bottom-right" />
            <template #node-domainNode="nodeProps"><DomainNode :data="nodeProps.data" :selected="nodeProps.selected" :expanded="expandedDomain === nodeProps.data.code" /></template>
            <template #node-knowledgeNode="nodeProps"><KnowledgeGraphNode :data="nodeProps.data" :selected="nodeProps.selected" /></template>
          </VueFlow>
          <div v-else-if="graphLoading" class="canvas-state"><span class="loader-orbit"></span><strong>正在装配关系路径</strong></div>
          <div v-else class="canvas-state"><strong>{{ graphError ? '图谱加载失败' : '当前筛选下没有节点' }}</strong><button v-if="statusFilter !== 'ALL'" @click="statusFilter = 'ALL'">显示全部状态</button></div>

          <div v-if="nodes.length" class="canvas-guide">
            <span>{{ expandedDomain ? '单击选择 · 双击打开知识点' : '单击领域 · 进入局部路径' }}</span>
          </div>
          <div class="edge-legend">
            <span><i class="path"></i>建议路径</span><span v-if="expandedDomain"><i class="contains"></i>领域包含</span><span><i class="relation"></i>真实关联</span>
          </div>
        </div>
      </main>

      <aside class="graph-inspector">
        <div class="panel-heading"><span>02</span><div><strong>节点检查器</strong><small>理解当前位置和下一步</small></div></div>

        <template v-if="selectedData && selectedNode?.type === 'knowledgeNode'">
          <div class="inspector-orbit" :data-status="selectedData.status"><i></i><code>{{ selectedData.code }}</code></div>
          <p class="inspector-kicker">{{ selectedData.domainCode }} · {{ selectedData.domainTitle }}</p>
          <h2>{{ selectedData.title }}</h2>
          <div class="node-facts">
            <div><span>学习状态</span><strong>{{ statusLabel(selectedData.status) }}</strong></div>
            <div><span>能力难度</span><strong>{{ difficultyLabel(selectedData.difficulty) }}</strong></div>
            <div><span>输入关系</span><strong>{{ selectedRelations.incoming }}</strong></div>
            <div><span>输出关系</span><strong>{{ selectedRelations.outgoing }}</strong></div>
          </div>
          <button class="open-point-button" @click="openSelectedPoint">打开学习与考核 →</button>
          <p class="inspector-note">双击画布中的知识节点，也可以直接进入该知识点。</p>
        </template>

        <template v-else-if="activeDomain">
          <div class="domain-inspection-code">{{ activeDomain.code }}</div>
          <p class="inspector-kicker">DOMAIN ROUTE</p><h2>{{ activeDomain.title }}</h2>
          <div class="domain-progress-copy"><strong>{{ activeDomain.masteredCount }}/{{ activeDomain.pointCount }}</strong><span>节点已严格掌握</span></div>
          <div class="inspection-progress"><i :style="{ width: `${activeDomain.pointCount ? activeDomain.masteredCount / activeDomain.pointCount * 100 : 0}%` }"></i></div>
          <p class="inspector-note">蓝色实线是建议学习顺序，灰色虚线表示节点属于当前领域。状态筛选只影响知识节点。</p>
        </template>

        <template v-else>
          <div class="inspector-compass"><span>01</span><span>→</span><span>15</span></div>
          <p class="inspector-kicker">START HERE</p><h2>从全局路径开始</h2>
          <ol class="usage-steps"><li><span>1</span>观察领域之间的建议流向</li><li><span>2</span>单击任一领域进入局部路径</li><li><span>3</span>搜索并聚焦具体知识点</li></ol>
          <p class="inspector-note">这不是“知识点堆叠图”，而是一张可下钻的学习路线图。</p>
        </template>
      </aside>
    </div>
  </div>
</template>

<style scoped src="./KnowledgeGraphPage.styles.css"></style>

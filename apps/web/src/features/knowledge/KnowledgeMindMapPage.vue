<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { useRouter } from 'vue-router';
import { apiClient } from '@/api/client';

const router = useRouter();
const search = ref('');
const expandedDomains = ref(new Set<string>());
const { data: tree, isLoading, error } = useQuery({
  queryKey: ['knowledge', 'tree'],
  queryFn: apiClient.getKnowledgeTree,
});

const normalizedSearch = computed(() => search.value.trim().toLowerCase());
const groups = computed(() => (tree.value?.groups ?? []).map((group) => ({
  ...group,
  domains: group.domains.map((domain) => ({
    ...domain,
    visiblePoints: normalizedSearch.value
      ? domain.points.filter((point) => `${point.code} ${point.title}`.toLowerCase().includes(normalizedSearch.value))
      : domain.points,
  })).filter((domain) => !normalizedSearch.value
    || `${domain.code} ${domain.title}`.toLowerCase().includes(normalizedSearch.value)
    || domain.visiblePoints.length > 0),
})).filter((group) => !normalizedSearch.value
  || `${group.title} ${group.description}`.toLowerCase().includes(normalizedSearch.value)
  || group.domains.length > 0));

const masteredCount = computed(() => tree.value?.groups.reduce((sum, group) => sum + group.domains.reduce(
  (domainSum, domain) => domainSum + domain.points.filter((point) => point.status === 'MASTERED').length,
  0
), 0) ?? 0);

function isExpanded(domainId: string) {
  return normalizedSearch.value.length > 0 || expandedDomains.value.has(domainId);
}

function toggleDomain(domainId: string) {
  const next = new Set(expandedDomains.value);
  next.has(domainId) ? next.delete(domainId) : next.add(domainId);
  expandedDomains.value = next;
}

function statusLabel(status: string) {
  return ({ NOT_STARTED: '未开始', LEARNING: '学习中', SELF_MASTERED: '待首考', FIRST_PASS_PENDING_RETEST: '待复测', MASTERED: '已掌握', NEEDS_RELEARNING: '需重学' } as Record<string, string>)[status] ?? status;
}
</script>

<template>
  <main class="mindmap-page">
    <header class="map-hero">
      <div>
        <p class="eyebrow">KNOWLEDGE CARTOGRAPHY</p>
        <h1>把知识连成一张图</h1>
        <p>从 Web 内核到 AI Agent，每个知识点都挂在明确的能力主干上。先看全局，再进入一条分支深挖。</p>
      </div>
      <div class="map-actions">
        <button class="secondary" @click="router.push('/knowledge')">切换到清单</button>
        <button @click="router.push('/knowledge/graph')">查看关系图谱</button>
      </div>
    </header>

    <section class="map-toolbar" aria-label="脑图工具栏">
      <label><span>搜索整张知识图</span><input v-model="search" type="search" placeholder="例如：流式响应、Vue、WebGPU、MCP" /></label>
      <div class="map-stats"><strong>{{ tree?.totalPoints ?? '—' }}</strong><span>知识点</span><strong>{{ tree?.groups.length ?? '—' }}</strong><span>能力主干</span><strong>{{ masteredCount }}</strong><span>已掌握</span></div>
    </section>

    <div v-if="isLoading" class="state-panel">正在绘制知识体系...</div>
    <div v-else-if="error" class="state-panel error">{{ (error as Error).message }}</div>
    <div v-else-if="tree" class="mindmap-canvas">
      <aside class="root-node">
        <span>CAREER ATLAS</span>
        <strong>{{ tree.title }}</strong>
        <small>持续学习 · 严格考核 · 项目验证</small>
      </aside>

      <div class="group-branches">
        <section v-for="group in groups" :key="group.id" class="group-branch">
          <div class="group-node">
            <span>{{ String(tree.groups.findIndex((item) => item.id === group.id) + 1).padStart(2, '0') }}</span>
            <div><h2>{{ group.title }}</h2><p>{{ group.description }}</p></div>
          </div>

          <div class="domain-branches">
            <article v-for="domain in group.domains" :key="domain.id" class="domain-branch">
              <button class="domain-node" :aria-expanded="isExpanded(domain.id)" @click="toggleDomain(domain.id)">
                <span class="domain-code">{{ domain.code }}</span>
                <span class="domain-copy"><strong>{{ domain.title }}</strong><small>{{ domain.points.length }} 个知识点</small></span>
                <span class="expand-mark">{{ isExpanded(domain.id) ? '−' : '+' }}</span>
              </button>

              <div v-if="isExpanded(domain.id)" class="point-branches">
                <button v-for="point in domain.visiblePoints" :key="point.id" class="point-node" @click="router.push(`/knowledge/${point.code}`)">
                  <span class="state-dot" :data-status="point.status"></span>
                  <span><code>{{ point.code }}</code>{{ point.title }}</span>
                  <small>{{ statusLabel(point.status) }}</small>
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped src="./KnowledgeMindMapPage.styles.css"></style>

<script setup lang="ts">
/**
 * 知识点详情页面
 *
 * Phase 2 实现：
 * - 显示知识点详情
 * - 学习资料 Markdown 渲染
 * - 笔记编辑（摘要）
 * - 自评掌握功能
 */
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { ApiError, apiClient } from '@/api/client';
import { renderMarkdown } from '@/utils/markdown';

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();

// 知识点编号
const knowledgeCode = computed(() => route.params.code as string);

// 当前标签页
const activeTab = ref<'study' | 'assessment' | 'criteria'>('study');

// 编辑状态
const isEditing = ref(false);
const editedSummary = ref('');

// 自评掌握对话框
const showSelfMasterDialog = ref(false);
const selfMasterSummary = ref('');

// 查询知识点详情
const { data: point, isLoading, error } = useQuery({
  queryKey: ['knowledge', 'point', knowledgeCode],
  queryFn: () => apiClient.getKnowledgePoint(knowledgeCode.value),
  enabled: () => !!knowledgeCode.value,
});

const relationPointId = computed(() => point.value?.id ?? '');
const { data: relations } = useQuery({
  queryKey: ['knowledge', 'relations', relationPointId],
  queryFn: () => apiClient.getKnowledgeRelations(relationPointId.value),
  enabled: () => Boolean(relationPointId.value),
});

// 更新摘要 mutation
const updateSummaryMutation = useMutation({
  mutationFn: (summary: string) =>
    apiClient.updateKnowledgePointSummary(knowledgeCode.value, summary),
  onSuccess: () => {
    // 刷新知识点详情
    queryClient.invalidateQueries({ queryKey: ['knowledge', 'point', knowledgeCode] });
    isEditing.value = false;
  },
});

// 自评掌握 mutation
const selfMasterMutation = useMutation({
  mutationFn: (summary: string) =>
    apiClient.selfMasterKnowledgePoint(knowledgeCode.value, summary),
  onSuccess: () => {
    // 刷新知识点详情
    queryClient.invalidateQueries({ queryKey: ['knowledge', 'point', knowledgeCode] });
    queryClient.invalidateQueries({ queryKey: ['knowledge', 'points'] });
    showSelfMasterDialog.value = false;
    selfMasterSummary.value = '';
  },
});

const assessmentType = computed(() => {
  if (point.value?.status === 'SELF_MASTERED') return 'FIRST' as const;
  if (point.value?.status === 'FIRST_PASS_PENDING_RETEST') return 'RETEST' as const;
  if (point.value?.status === 'MASTERED') return 'MONTHLY_REVIEW' as const;
  return null;
});

const createAssessmentMutation = useMutation({
  mutationFn: () => apiClient.createAssessment({
    knowledgePointCode: knowledgeCode.value,
    type: assessmentType.value!,
    durationMinutes: 60,
  }),
  onSuccess: (session) => router.push(`/assessment/${session.id}`),
  onError: (reason) => {
    if (reason instanceof ApiError) {
      const existingSession = reason.message.match(/Existing session in progress: ([0-9a-f-]+)/i)?.[1];
      if (existingSession) router.push(`/assessment/${existingSession}`);
    }
  },
});

// 开始编辑摘要
const startEditing = () => {
  editedSummary.value = point.value?.summary || '';
  isEditing.value = true;
};

// 保存摘要
const saveSummary = () => {
  if (editedSummary.value.trim()) {
    updateSummaryMutation.mutate(editedSummary.value.trim());
  }
};

// 取消编辑
const cancelEditing = () => {
  isEditing.value = false;
  editedSummary.value = '';
};

// 开始自评掌握
const startSelfMaster = () => {
  selfMasterSummary.value = point.value?.summary || '';
  showSelfMasterDialog.value = true;
};

// 提交自评掌握
const submitSelfMaster = () => {
  if (selfMasterSummary.value.trim()) {
    selfMasterMutation.mutate(selfMasterSummary.value.trim());
  }
};

// 返回列表
const goBack = () => {
  router.push('/knowledge');
};

// 状态颜色映射
const statusColorMap: Record<string, string> = {
  NOT_STARTED: 'var(--color-draft-ink)',
  LEARNING: 'var(--color-blueprint)',
  SELF_MASTERED: 'var(--color-moss-proof)',
  FIRST_PASS_PENDING_RETEST: 'var(--color-amber-review)',
  MASTERED: 'var(--color-moss-proof)',
  NEEDS_RELEARNING: 'var(--color-redline)',
};

// 状态显示文本
const statusLabelMap: Record<string, string> = {
  NOT_STARTED: '未开始',
  LEARNING: '学习中',
  SELF_MASTERED: '自评已掌握',
  FIRST_PASS_PENDING_RETEST: '待复测',
  MASTERED: '已掌握',
  NEEDS_RELEARNING: '需要重学',
};

// 格式化状态
const formatStatus = (status: string) => {
  return statusLabelMap[status] || status;
};

// 是否可以自评掌握
const canSelfMaster = computed(() => {
  return point.value && ['NOT_STARTED', 'LEARNING'].includes(point.value.status);
});

const studyHtml = computed(() => renderMarkdown(point.value?.studyMaterialMd ?? ''));
const assessmentHtml = computed(() => renderMarkdown(point.value?.assessmentSpecMd ?? ''));
const criteriaHtml = computed(() => renderMarkdown(point.value?.passCriteriaMd ?? ''));
const pendingPrerequisites = computed(() => relations.value?.prerequisites.filter((item) => item.status !== 'MASTERED').length ?? 0);
const prerequisiteTotal = computed(() => relations.value?.prerequisites.length ?? 0);
const dependentTotal = computed(() => relations.value?.dependents.length ?? 0);
const relatedTotal = computed(() => relations.value?.related.length ?? 0);
const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} 小时${rest ? ` ${rest} 分` : ''}` : `${rest} 分钟`;
};
const effortStages = computed(() => point.value ? [
  { key: 'study', label: '资料精读', minutes: point.value.studyMinutes },
  { key: 'practice', label: '机制练习', minutes: point.value.practiceMinutes },
  { key: 'project', label: '项目产出', minutes: point.value.projectMinutes },
  { key: 'assessment', label: '严格首考', minutes: point.value.assessmentMinutes },
  { key: 'retest', label: '7 天复测', minutes: point.value.retestMinutes },
] : []);
const primaryActionLabel = computed(() => {
  if (assessmentType.value === 'RETEST') return '开始复测';
  if (assessmentType.value === 'MONTHLY_REVIEW') return '开始月度抽测';
  if (assessmentType.value === 'FIRST') return '开始首次严格考核';
  if (canSelfMaster.value) return '自评已掌握';
  return '查看关系图谱';
});
const triggerPrimaryAction = () => {
  if (assessmentType.value) createAssessmentMutation.mutate();
  else if (canSelfMaster.value) startSelfMaster();
  else router.push('/knowledge/graph');
};
</script>

<template>
  <div class="knowledge-detail-page">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      加载中...
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      加载失败：{{ (error as Error).message }}
      <button @click="goBack" class="btn btn-secondary">返回列表</button>
    </div>

    <!-- 详情内容 -->
    <div v-else-if="point" class="detail-content">
      <!-- 头部信息 -->
      <header class="detail-header">
        <div class="header-top">
          <button @click="goBack" class="back-btn" aria-label="返回">
            ← 返回
          </button>
          <button class="graph-shortcut" @click="router.push('/knowledge/graph')">关系图谱</button>
        </div>

        <div class="header-main">
          <div class="title-cluster">
            <div class="title-row">
              <span class="point-code">{{ point.code }}</span>
              <h1 class="point-title">{{ point.title }}</h1>
            </div>

            <div class="meta-row">
              <span class="domain-tag">{{ point.domainCode }} - {{ point.domainTitle }}</span>
              <span class="difficulty-tag">{{ point.difficulty }}</span>
              <span v-if="point.planWeek" class="week-tag">第{{ point.planWeek }}周</span>
            </div>
          </div>

          <div class="hero-actions">
            <span class="status-badge" :style="{ backgroundColor: statusColorMap[point.status] }">{{ formatStatus(point.status) }}</span>
            <button class="btn btn-primary" :disabled="createAssessmentMutation.isPending.value" @click="triggerPrimaryAction">
              {{ createAssessmentMutation.isPending.value ? '正在创建...' : primaryActionLabel }}
            </button>
          </div>
        </div>
      </header>

      <section class="effort-panel" aria-labelledby="effort-title">
        <div class="effort-summary">
          <p>TIME BUDGET</p>
          <h2 id="effort-title">预计 {{ formatMinutes(point.estimatedTotalMinutes) }} 完成首次掌握</h2>
          <span>按资料、练习、项目、考核推进；另预留 {{ formatMinutes(point.retestMinutes) }} 完成 7 天后严格复测。</span>
        </div>
        <div class="effort-stages">
          <div v-for="stage in effortStages" :key="stage.key" :data-stage="stage.key">
            <i></i><span>{{ stage.label }}</span><strong>{{ stage.minutes }}m</strong>
          </div>
        </div>
      </section>

      <div class="detail-workbench">
        <main class="detail-main">
          <div class="tabs" role="tablist" aria-label="知识详情内容">
            <button
              v-for="tab in ['study', 'assessment', 'criteria']"
              :key="tab"
              @click="activeTab = tab as any"
              class="tab-btn"
              :class="{ active: activeTab === tab }"
            >
              {{ tab === 'study' ? '学习资料' : tab === 'assessment' ? '严格考核' : '通过标准' }}
            </button>
          </div>

          <div class="content-area">
            <div v-if="activeTab === 'study'" class="tab-content">
              <div class="content-heading"><span>01</span><div><h2>学习资料</h2><p>资料可以是文档、视频、实验、项目或规范，但必须覆盖当前知识点。</p></div></div>
              <div class="markdown-content" v-html="studyHtml"></div>
            </div>

            <div v-else-if="activeTab === 'assessment'" class="tab-content">
              <div class="content-heading"><span>02</span><div><h2>严格考核</h2><p>用原理、实践、排障和表达验证掌握程度。</p></div></div>
              <div class="markdown-content" v-html="assessmentHtml"></div>
              <div class="assessment-launch">
                <template v-if="assessmentType">
                  <p>系统将生成一套 100 分严格考核，覆盖原理、实践、排障和项目表达。提交后由 DeepSeek 评分。</p>
                  <button class="btn btn-primary" :disabled="createAssessmentMutation.isPending.value" @click="createAssessmentMutation.mutate()">
                    {{ createAssessmentMutation.isPending.value ? '正在创建...' : assessmentType === 'RETEST' ? '开始复测' : assessmentType === 'MONTHLY_REVIEW' ? '开始月度抽测' : '开始首次严格考核' }}
                  </button>
                  <p v-if="createAssessmentMutation.error.value" class="launch-error">{{ createAssessmentMutation.error.value.message }}</p>
                </template>
                <p v-else>先完成学习并提交自评摘要，才能进入严格考核。</p>
              </div>
            </div>

            <div v-else-if="activeTab === 'criteria'" class="tab-content">
              <div class="content-heading"><span>03</span><div><h2>通过标准</h2><p>对照标准判断是否可以进入考核。</p></div></div>
              <div class="markdown-content" v-html="criteriaHtml"></div>
            </div>
          </div>

          <section class="notes-section">
            <div class="notes-heading"><div><p>LOCAL NOTE</p><h2 class="section-title">我的笔记</h2></div><button v-if="!isEditing" @click="startEditing" class="btn btn-secondary btn-sm">编辑笔记</button></div>

            <div v-if="isEditing" class="note-editor">
              <textarea v-model="editedSummary" placeholder="记录一个能在项目中复用的结论..." rows="5" class="note-textarea"></textarea>

              <div class="editor-actions">
                <button @click="saveSummary" class="btn btn-primary" :disabled="!editedSummary.trim() || updateSummaryMutation.isPending.value">
                  {{ updateSummaryMutation.isPending.value ? '保存中...' : '保存' }}
                </button>
                <button @click="cancelEditing" class="btn btn-secondary" :disabled="updateSummaryMutation.isPending.value">
                  取消
                </button>
              </div>
            </div>

            <div v-else class="note-display">
              <div v-if="point.summary" class="note-content">{{ point.summary }}</div>
              <div v-else class="note-empty">记录一个能在项目中复用的结论</div>
            </div>
          </section>
        </main>

        <aside class="detail-rail">
          <section class="quick-card">
            <p>START</p>
            <h2>从资料精读开始</h2>
            <span>先读资料并写出关键机制，再完成练习和项目证据。不要先点“自评已掌握”。</span>
            <div><button @click="activeTab = 'study'">看资料</button><button @click="activeTab = 'criteria'">看标准</button></div>
          </section>

          <section class="path-stats">
            <div><strong>{{ prerequisiteTotal }}</strong><span>前置</span></div>
            <div><strong>{{ dependentTotal }}</strong><span>后续</span></div>
            <div><strong>{{ relatedTotal }}</strong><span>关联</span></div>
          </section>

          <section class="relation-route" aria-labelledby="relation-title">
            <header>
              <div><p>LEARNING PATH</p><h2 id="relation-title">知识前置与后续路径</h2></div>
              <button @click="router.push('/knowledge/graph')">图谱 →</button>
            </header>
            <div class="relation-lanes">
              <div class="relation-column prerequisite-column">
                <span class="relation-label">学习之前</span>
                <button v-for="item in relations?.prerequisites" :key="item.id" @click="router.push(`/knowledge/${item.code}`)">
                  <code>{{ item.code }}</code><strong>{{ item.title }}</strong><small :data-status="item.status">{{ formatStatus(item.status) }}</small>
                </button>
                <p v-if="!relations?.prerequisites.length">这是当前路径的起点，无强制前置知识。</p>
              </div>
              <div class="current-relation-node">
                <span :class="{ ready: pendingPrerequisites === 0 }">{{ pendingPrerequisites ? `${pendingPrerequisites} 项前置待掌握` : '前置已就绪' }}</span>
                <code>{{ point.code }}</code><strong>{{ point.title }}</strong><small>当前知识点</small>
              </div>
              <div class="relation-column dependent-column">
                <span class="relation-label">掌握之后</span>
                <button v-for="item in relations?.dependents" :key="item.id" @click="router.push(`/knowledge/${item.code}`)">
                  <code>{{ item.code }}</code><strong>{{ item.title }}</strong><small>解锁下一步</small>
                </button>
                <p v-if="!relations?.dependents.length">这是当前路径的终点，下一步可进入领域综合考核。</p>
              </div>
            </div>
            <div v-if="relations?.related.length" class="related-points"><span>横向关联</span><button v-for="item in relations.related" :key="item.id" @click="router.push(`/knowledge/${item.code}`)"><code>{{ item.code }}</code>{{ item.title }}</button></div>
          </section>
        </aside>
      </div>
    </div>

    <!-- 自评掌握对话框 -->
    <div v-if="showSelfMasterDialog" class="dialog-overlay" @click.self="showSelfMasterDialog = false">
      <div class="dialog">
        <h3 class="dialog-title">自评掌握</h3>
        <p class="dialog-desc">请填写你对这个知识点的理解摘要：</p>

        <textarea
          v-model="selfMasterSummary"
          placeholder="总结你的理解..."
          rows="5"
          class="note-textarea"
        ></textarea>

        <div class="dialog-actions">
          <button
            @click="submitSelfMaster"
            class="btn btn-primary"
            :disabled="!selfMasterSummary.trim() || selfMasterMutation.isPending.value"
          >
            {{ selfMasterMutation.isPending.value ? '提交中...' : '确认掌握' }}
          </button>
          <button
            @click="showSelfMasterDialog = false"
            class="btn btn-secondary"
            :disabled="selfMasterMutation.isPending.value"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.knowledge-detail-page {
  max-width: 900px;
}

/* 加载和错误状态 */
.loading-state,
.error-state {
  padding: calc(var(--space-base) * 4);
  text-align: center;
  color: #888;
  background-color: #fff;
  border-radius: var(--radius-base);
  border: 1px solid #eee;
}

.error-state {
  color: var(--color-redline);
}

/* 头部 */
.detail-header {
  margin-bottom: calc(var(--space-base) * 3);
}

.header-top {
  margin-bottom: var(--space-base);
}

.back-btn {
  padding: calc(var(--space-base) * 0.5) var(--space-base);
  border: none;
  background: none;
  color: var(--color-blueprint);
  font-size: 0.875rem;
  cursor: pointer;
  font-family: var(--font-body);
}

.back-btn:hover {
  text-decoration: underline;
}

.header-main {
  background-color: #fff;
  padding: calc(var(--space-base) * 2);
  border-radius: var(--radius-base);
  border: 1px solid #eee;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: calc(var(--space-base) * 0.75);
  margin-bottom: var(--space-base);
}

.point-code {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--color-blueprint);
  font-weight: 600;
}

.point-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-draft-ink);
}

.meta-row {
  display: flex;
  gap: var(--space-base);
  margin-bottom: calc(var(--space-base) * 1.5);
  font-size: 0.75rem;
  color: #888;
}

.domain-tag,
.difficulty-tag,
.week-tag {
  padding: calc(var(--space-base) * 0.25) calc(var(--space-base) * 0.5);
  background-color: var(--color-cool-sheet);
  border-radius: calc(var(--radius-base) / 2);
}

.status-row {
  display: flex;
  align-items: center;
  gap: calc(var(--space-base) * 1.5);
}

.status-badge {
  display: inline-block;
  padding: calc(var(--space-base) * 0.5) var(--space-base);
  border-radius: var(--radius-base);
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.effort-panel { display: grid; grid-template-columns: minmax(230px,.8fr) minmax(0,1.2fr); gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; color: #eaf2ff; background: linear-gradient(130deg,#152a45,#1d3d55); border: 1px solid rgba(119,169,239,.18); border-radius: 16px; box-shadow: 0 16px 38px rgba(17,43,72,.13); }
.effort-summary p { margin: 0; color: #77a9ef; font: 750 .58rem var(--font-mono); letter-spacing: .14em; }.effort-summary h2 { margin: .28rem 0 .35rem; color: #fff; font-size: 1rem; }.effort-summary span { display: block; color: #9fb3ca; font-size: .62rem; line-height: 1.55; }
.effort-stages { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: .35rem; align-content: center; }.effort-stages>div { display: grid; grid-template-columns: 7px 1fr; gap: .12rem .35rem; align-items: center; min-width: 0; padding: .55rem .45rem; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.07); border-radius: 9px; }.effort-stages i { grid-row: 1 / 3; width: 7px; height: 28px; background: #73a7ef; border-radius: 99px; }.effort-stages [data-stage='practice'] i { background: #69d4b0; }.effort-stages [data-stage='project'] i { background: #f0bd62; }.effort-stages [data-stage='assessment'] i { background: #eb7e78; }.effort-stages [data-stage='retest'] i { background: #b395e8; }.effort-stages span { overflow: hidden; color: #9fb3ca; font-size: .52rem; text-overflow: ellipsis; white-space: nowrap; }.effort-stages strong { color: #fff; font: 720 .62rem var(--font-mono); }
.relation-route { margin-bottom: 1.5rem; padding: 1rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; box-shadow: var(--shadow-xs); }
.relation-route>header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-end; padding-bottom: .8rem; border-bottom: 1px solid var(--color-border-subtle); }.relation-route>header p { margin: 0; color: var(--color-primary); font: 750 .62rem var(--font-mono); letter-spacing: .14em; }.relation-route>header h2 { margin: .15rem 0 0; font-size: 1rem; }.relation-route>header button { padding: 0; color: var(--color-primary); font-size: .65rem; background: transparent; border: 0; cursor: pointer; }
.relation-lanes { display: grid; grid-template-columns: 1fr 180px 1fr; gap: .8rem; align-items: stretch; padding-top: .9rem; }.relation-column { position: relative; display: grid; align-content: start; gap: .4rem; }.relation-label { color: var(--color-text-tertiary); font: 650 .56rem var(--font-mono); }.relation-column button { display: grid; grid-template-columns: auto 1fr auto; gap: .45rem; align-items: center; min-height: 45px; padding: .45rem .55rem; text-align: left; color: var(--color-text); background: var(--color-surface-raised); border: 1px solid var(--color-border-subtle); border-radius: 9px; cursor: pointer; }.relation-column button:hover { border-color: var(--color-primary-border); }.relation-column code { color: var(--color-primary); font: 700 .56rem var(--font-mono); }.relation-column strong { overflow: hidden; font-size: .62rem; text-overflow: ellipsis; white-space: nowrap; }.relation-column small { color: var(--color-text-tertiary); font-size: .52rem; }.relation-column small[data-status='MASTERED'] { color: var(--color-success); }.relation-column>p { margin: 0; padding: .75rem; color: var(--color-text-tertiary); font-size: .61rem; background: var(--color-surface-raised); border-radius: 9px; }
.current-relation-node { position: relative; display: flex; min-height: 112px; align-items: center; justify-content: center; padding: .7rem; flex-direction: column; text-align: center; background: var(--color-primary-soft); border: 1px solid var(--color-primary-border); border-radius: 14px; }.current-relation-node::before,.current-relation-node::after { position: absolute; top: 50%; width: .85rem; content: ''; border-top: 1px dashed var(--color-primary); }.current-relation-node::before { right: 100%; }.current-relation-node::after { left: 100%; }.current-relation-node>span { margin-bottom: .45rem; padding: .15rem .35rem; color: var(--color-warning); font-size: .52rem; background: #fff8e9; border-radius: 5px; }.current-relation-node>span.ready { color: var(--color-success); background: var(--color-success-soft); }.current-relation-node code { color: var(--color-primary); font: 750 .65rem var(--font-mono); }.current-relation-node strong { margin: .15rem 0; font-size: .7rem; line-height: 1.3; }.current-relation-node small { color: var(--color-text-tertiary); font-size: .52rem; }
.related-points { display: flex; flex-wrap: wrap; gap: .35rem; align-items: center; margin-top: .8rem; padding-top: .7rem; border-top: 1px solid var(--color-border-subtle); }.related-points>span { margin-right: .2rem; color: var(--color-text-tertiary); font-size: .57rem; }.related-points button { padding: .28rem .45rem; color: var(--color-text-secondary); font-size: .57rem; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: 7px; cursor: pointer; }.related-points code { margin-right: .3rem; color: var(--color-primary); font: 700 .54rem var(--font-mono); }

/* 标签页 */
.tabs {
  display: flex;
  gap: calc(var(--space-base) * 0.5);
  margin-bottom: calc(var(--space-base) * 2);
}

.tab-btn {
  padding: calc(var(--space-base) * 0.75) calc(var(--space-base) * 1.5);
  border: 1px solid #ddd;
  background-color: #fff;
  color: var(--color-draft-ink);
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: var(--radius-base);
  font-family: var(--font-body);
  transition: background-color 0.2s, border-color 0.2s;
}

.tab-btn:hover {
  background-color: var(--color-cool-sheet);
}

.tab-btn.active {
  background-color: var(--color-blueprint);
  border-color: var(--color-blueprint);
  color: #fff;
}

/* 内容区 */
.content-area {
  background-color: #fff;
  padding: calc(var(--space-base) * 2);
  border-radius: var(--radius-base);
  border: 1px solid #eee;
  margin-bottom: calc(var(--space-base) * 3);
}

.tab-content {
  min-height: 200px;
}

.markdown-content {
  font-size: 0.9375rem;
  line-height: 1.75;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3 {
  margin-top: calc(var(--space-base) * 2);
  margin-bottom: var(--space-base);
  color: var(--color-draft-ink);
}

.markdown-content h1 {
  font-size: 1.25rem;
}

.markdown-content h2 {
  font-size: 1.125rem;
}

.markdown-content h3 {
  font-size: 1rem;
}

.markdown-content p {
  margin-bottom: var(--space-base);
}

.markdown-content ul,
.markdown-content ol {
  margin-bottom: var(--space-base);
  padding-left: calc(var(--space-base) * 2);
}

.markdown-content li {
  margin-bottom: calc(var(--space-base) * 0.5);
}

.markdown-content a {
  color: var(--color-blueprint);
  text-decoration: none;
}

.markdown-content a:hover {
  text-decoration: underline;
}

.markdown-content :deep(a) {
  display: inline-flex;
  align-items: center;
  gap: .3rem;
  margin: .12rem .18rem .12rem 0;
  padding: .42rem .65rem;
  color: var(--color-primary-strong);
  font-weight: 650;
  text-decoration: none;
  background: var(--color-primary-soft);
  border: 1px solid var(--color-primary-border);
  border-radius: 999px;
  transition: transform .18s ease, border-color .18s ease, background .18s ease;
}

.markdown-content :deep(a:hover) {
  transform: translateY(-1px);
  border-color: var(--color-primary);
  background: #fff;
}

.markdown-content code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background-color: var(--color-cool-sheet);
  padding: calc(var(--space-base) * 0.125) calc(var(--space-base) * 0.25);
  border-radius: calc(var(--radius-base) / 4);
}

.markdown-content pre {
  background-color: var(--color-cool-sheet);
  padding: calc(var(--space-base) * 1.5);
  border-radius: var(--radius-base);
  overflow-x: auto;
  margin-bottom: var(--space-base);
}

.markdown-content pre code {
  background: none;
  padding: 0;
}

/* 笔记区 */
.notes-section {
  background-color: #fff;
  padding: calc(var(--space-base) * 2);
  border-radius: var(--radius-base);
  border: 1px solid #eee;
}

.section-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 calc(var(--space-base) * 1.5) 0;
  color: var(--color-draft-ink);
}

.note-textarea {
  width: 100%;
  padding: var(--space-base);
  border: 1px solid #ddd;
  border-radius: var(--radius-base);
  font-family: var(--font-body);
  font-size: 0.875rem;
  line-height: 1.65;
  resize: vertical;
}

.note-textarea:focus {
  outline: 2px solid var(--color-blueprint);
  outline-offset: 2px;
}

.note-display {
  margin-bottom: var(--space-base);
}

.note-content {
  padding: var(--space-base);
  background-color: var(--color-cool-sheet);
  border-radius: var(--radius-base);
  margin-bottom: var(--space-base);
  white-space: pre-wrap;
  font-size: 0.875rem;
  line-height: 1.65;
}

.note-empty {
  padding: var(--space-base);
  background-color: var(--color-cool-sheet);
  border-radius: var(--radius-base);
  margin-bottom: var(--space-base);
  font-size: 0.875rem;
  color: #888;
}

.editor-actions,
.dialog-actions {
  display: flex;
  gap: var(--space-base);
}

/* 按钮 */
.btn {
  padding: calc(var(--space-base) * 0.75) calc(var(--space-base) * 1.5);
  border: 1px solid #ddd;
  border-radius: var(--radius-base);
  font-size: 0.875rem;
  font-family: var(--font-body);
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--color-blueprint);
  border-color: var(--color-blueprint);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2a4a70;
}

.btn-secondary {
  background-color: #fff;
  color: var(--color-draft-ink);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-cool-sheet);
}

.btn-sm {
  padding: calc(var(--space-base) * 0.5) var(--space-base);
  font-size: 0.75rem;
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background-color: #fff;
  padding: calc(var(--space-base) * 2.5);
  border-radius: var(--radius-base);
  max-width: 500px;
  width: 90%;
}

.dialog-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 var(--space-base) 0;
  color: var(--color-draft-ink);
}

.dialog-desc {
  font-size: 0.875rem;
  color: #666;
  margin: 0 0 calc(var(--space-base) * 1.5) 0;
}

.assessment-launch {
  margin-top: calc(var(--space-base) * 2);
  padding: calc(var(--space-base) * 1.5);
  border-left: 4px solid var(--color-blueprint);
  background: #f3f6f2;
}

.assessment-launch p { line-height: 1.7; }
.launch-error { color: var(--color-redline); }

.knowledge-detail-page {
  max-width: 1320px;
  margin: 0 auto;
}

.detail-header {
  margin-bottom: 1rem;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: .7rem;
}

.graph-shortcut {
  min-height: 36px;
  padding: 0 .75rem;
  color: var(--color-primary);
  font-size: .66rem;
  font-weight: 700;
  background: var(--color-primary-soft);
  border: 1px solid var(--color-primary-border);
  border-radius: 9px;
  cursor: pointer;
}

.header-main {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 1.2rem;
  background:
    linear-gradient(90deg, rgba(50,104,199,.08) 0 1px, transparent 1px 100%),
    linear-gradient(180deg, #fff, #f8fbff);
  background-size: 32px 32px, auto;
  border-color: var(--color-primary-border);
  border-radius: 18px;
  box-shadow: var(--shadow-xs);
}

.title-row {
  gap: .7rem;
  margin-bottom: .7rem;
}

.point-code {
  display: inline-grid;
  place-items: center;
  height: 34px;
  padding: 0 .7rem;
  color: #fff;
  background: var(--color-primary);
  border-radius: 10px;
}

.point-title {
  font-size: 2rem;
  line-height: 1.15;
  letter-spacing: 0;
}

.meta-row {
  flex-wrap: wrap;
  gap: .45rem;
  margin-bottom: 0;
}

.domain-tag,
.difficulty-tag,
.week-tag {
  color: var(--color-text-secondary);
  background: #fff;
  border: 1px solid var(--color-border);
}

.hero-actions {
  display: grid;
  justify-items: end;
  gap: .55rem;
}

.status-badge {
  border-radius: 999px;
}

.effort-panel {
  grid-template-columns: minmax(280px,.75fr) minmax(0,1.25fr);
  margin-bottom: .9rem;
  border-radius: 18px;
}

.detail-workbench {
  display: grid;
  grid-template-columns: minmax(0,1fr) 390px;
  gap: .9rem;
  align-items: start;
}

.detail-main {
  min-width: 0;
}

.detail-rail {
  position: sticky;
  top: 1rem;
  display: grid;
  gap: .8rem;
  min-width: 0;
}

.quick-card,
.path-stats {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: var(--shadow-xs);
}

.quick-card {
  padding: 1rem;
  background: linear-gradient(155deg,#142942,#1e3c52);
  color: #dce9f7;
}

.quick-card p {
  margin: 0;
  color: #7fb0f0;
  font: 760 .58rem var(--font-mono);
  letter-spacing: .12em;
}

.quick-card h2 {
  margin: .25rem 0 .35rem;
  color: #fff;
  font-size: 1.05rem;
}

.quick-card span {
  display: block;
  color: #adc0d4;
  font-size: .65rem;
  line-height: 1.65;
}

.quick-card div {
  display: flex;
  gap: .45rem;
  margin-top: .8rem;
}

.quick-card button {
  min-height: 34px;
  padding: 0 .7rem;
  color: #fff;
  font-size: .62rem;
  font-weight: 700;
  background: rgba(255,255,255,.09);
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 9px;
  cursor: pointer;
}

.path-stats {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  overflow: hidden;
}

.path-stats div {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border-right: 1px solid var(--color-border-subtle);
}

.path-stats div:last-child {
  border-right: 0;
}

.path-stats strong {
  color: var(--color-primary);
  font: 760 1.2rem var(--font-mono);
}

.path-stats span {
  color: var(--color-text-tertiary);
  font-size: .58rem;
}

.detail-rail .relation-route {
  margin-bottom: 0;
}

.detail-rail .relation-route>header {
  align-items: flex-start;
}

.detail-rail .relation-lanes {
  grid-template-columns: 1fr;
}

.detail-rail .current-relation-node {
  grid-row: 1;
  min-height: 96px;
}

.detail-rail .current-relation-node::before,
.detail-rail .current-relation-node::after {
  display: none;
}

.detail-rail .relation-column button {
  grid-template-columns: auto minmax(0,1fr);
}

.detail-rail .relation-column small {
  grid-column: 2;
}

.detail-rail .related-points {
  max-height: 120px;
  overflow: auto;
}

.tabs {
  position: sticky;
  z-index: 3;
  top: 0;
  gap: .4rem;
  margin-bottom: .65rem;
  padding: .35rem;
  background: rgba(246,249,253,.92);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  backdrop-filter: blur(10px);
}

.tab-btn {
  flex: 1;
  min-height: 42px;
  border-radius: 10px;
  font-size: .72rem;
  font-weight: 760;
}

.content-area,
.notes-section {
  border-color: var(--color-border);
  border-radius: 18px;
  box-shadow: var(--shadow-xs);
}

.content-area {
  padding: 1.15rem;
  margin-bottom: .9rem;
}

.content-heading {
  display: grid;
  grid-template-columns: 42px minmax(0,1fr);
  gap: .75rem;
  align-items: center;
  margin-bottom: .85rem;
  padding-bottom: .8rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.content-heading>span {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  color: #fff;
  font: 760 .68rem var(--font-mono);
  background: var(--color-primary);
  border-radius: 12px;
}

.content-heading h2 {
  margin: 0;
  font-size: 1.15rem;
}

.content-heading p {
  margin: .15rem 0 0;
  color: var(--color-text-tertiary);
  font-size: .66rem;
}

.markdown-content {
  max-width: 860px;
}

.markdown-content :deep(h2) {
  padding-top: .55rem;
  border-top: 1px solid var(--color-border-subtle);
}

.markdown-content :deep(li) {
  line-height: 1.7;
}

.notes-section {
  padding: 1rem;
}

.notes-heading {
  display: flex;
  justify-content: space-between;
  gap: .8rem;
  align-items: center;
  margin-bottom: .75rem;
}

.notes-heading p {
  margin: 0;
  color: var(--color-primary);
  font: 740 .58rem var(--font-mono);
  letter-spacing: .12em;
}

.notes-heading .section-title {
  margin: .15rem 0 0;
}

.note-display {
  margin-bottom: 0;
}

/* 响应式 */
@media (max-width: 1080px) {
  .detail-workbench { grid-template-columns: 1fr; }
  .detail-rail { position: static; grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .header-main { grid-template-columns: 1fr; }
  .hero-actions { justify-items: start; }
  .effort-panel { grid-template-columns: 1fr; }
  .effort-stages { grid-template-columns: repeat(5,minmax(72px,1fr)); overflow-x: auto; }
  .title-row {
    flex-direction: column;
    gap: calc(var(--space-base) * 0.5);
  }

  .point-title {
    font-size: 1.25rem;
  }

  .meta-row {
    flex-wrap: wrap;
  }

  .status-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .tabs {
    flex-wrap: wrap;
  }

  .tab-btn {
    flex: 1;
    min-width: 100px;
  }

  .relation-route>header { align-items: flex-start; flex-direction: column; }
  .relation-lanes { grid-template-columns: 1fr; }
  .current-relation-node { grid-row: 1; }
  .current-relation-node::before,.current-relation-node::after { display: none; }
}
</style>

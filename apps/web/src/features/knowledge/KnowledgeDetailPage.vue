<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiClient, type KnowledgePointDetail, type KnowledgeNote, type LearningBranch } from '@/api/client';
import BaseDialog from '@/components/BaseDialog.vue';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import PracticeWorkspace from '@/components/PracticeWorkspace.vue';

const route = useRoute();
const router = useRouter();
const point = ref<KnowledgePointDetail | null>(null);
const note = ref<KnowledgeNote | null>(null);
const branches = ref<LearningBranch[]>([]);
const noteDraft = ref('');
const loading = ref(true);
const saving = ref(false);
const organizing = ref(false);
const streamingOrganizedMd = ref('');
const streamingThinking = ref('');
const organizeProgress = ref('');
const organizeElapsedSeconds = ref(0);
const notePreviewMode = ref<'split' | 'edit' | 'preview'>('split');
let organizeController: AbortController | null = null;
const message = ref('');
const error = ref('');
const activeTab = ref<'materials' | 'notes' | 'mastery'>('materials');
const selectedStage = ref(1);
const challengeMode = ref<'THEORY' | 'PRACTICE' | 'MIXED'>('THEORY');
const launching = ref(false);
const deferDialogOpen = ref(false);
const deferReason = ref('');
const deferring = ref(false);
const activePracticeId = ref<string | null>(null);

const code = computed(() => String(route.params.code));
const organizedDisplayMd = computed(() => organizing.value ? streamingOrganizedMd.value : note.value?.organizedMd || '');
const masteryCopy = computed(() => [
  ['M0', '未评估', '还没有系统证据，不代表没有学过'],
  ['M1', '初步理解', '能解释核心概念与边界'],
  ['M2', '引导应用', '在提示或脚手架下完成应用'],
  ['M3', '已掌握', '能够独立完成理论或实践挑战'],
  ['M4', '稳定掌握', '至少 7 天后通过变式挑战'],
]);
const profileText = computed(() => ({
  THEORY_ONLY: '理解辨析型：重在概念、边界和反例，不强行安排编码题。',
  EXAMPLE_DRIVEN: '示例驱动型：先看最小例子，再回到文字解释机制。',
  CODING: '编码验证型：理解机制后，用可运行的最小代码验证。',
  DEBUGGING: '排错诊断型：从异常出发建立“假设—验证—修复”链路。',
  TOOL_OPERATION: '工具操作型：沿真实工作流操作并保留产物。',
  DESIGN_CASE: '方案设计型：围绕具体约束比较方案与代价。',
} as Record<string, string>)[point.value?.challengeProfile ?? 'EXAMPLE_DRIVEN']);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [pointData, noteData, branchData] = await Promise.all([
      apiClient.getKnowledgePoint(code.value), apiClient.getNote(code.value), apiClient.getNextBranches(code.value),
    ]);
    point.value = pointData;
    note.value = noteData;
    noteDraft.value = noteData?.originalMd ?? pointData.summary ?? '';
    branches.value = branchData;
    selectedStage.value = Math.min(4, Math.max(1, pointData.masteryLevel + 1));
    challengeMode.value = pointData.challengeProfile === 'THEORY_ONLY' ? 'THEORY' : 'THEORY';
    if (['materials', 'notes', 'mastery'].includes(String(route.query.tab))) activeTab.value = String(route.query.tab) as typeof activeTab.value;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '知识点加载失败';
  } finally {
    loading.value = false;
  }
}

async function saveNote(showMessage = true) {
  if (saving.value) return;
  saving.value = true;
  try {
    note.value = await apiClient.saveNote(code.value, noteDraft.value);
    if (showMessage) message.value = '原始笔记已保存，并写入版本历史';
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '笔记保存失败';
  } finally { saving.value = false; }
}

async function organizeNote() {
  if (!noteDraft.value.trim()) { message.value = '请先写下一些原始笔记'; return; }
  await saveNote(false);
  organizing.value = true;
  streamingOrganizedMd.value = '';
  streamingThinking.value = '';
  organizeProgress.value = '正在保存原始笔记并准备整理';
  organizeElapsedSeconds.value = 0;
  organizeController = new AbortController();
  error.value = '';
  try {
    note.value = await apiClient.organizeNoteStream(code.value, (_delta, accumulated) => {
      streamingOrganizedMd.value = accumulated;
    }, organizeController.signal, (progress, elapsedSeconds) => {
      organizeProgress.value = progress;
      organizeElapsedSeconds.value = elapsedSeconds;
    }, (_delta, accumulated) => {
      streamingThinking.value = accumulated;
    });
    streamingOrganizedMd.value = '';
    message.value = note.value.generationMode === 'LOCAL_FALLBACK'
      ? `已生成安全排版稿；${note.value.generationNotice ?? '尚未执行 AI 事实核验'}`
      : 'AI 候选稿已生成。原始笔记未被覆盖，请核对后再接受';
  } catch (reason) {
    if ((reason instanceof DOMException && reason.name === 'AbortError') || (reason instanceof Error && /abort|中止|停止/i.test(reason.message))) message.value = '已停止本次整理，尚未完成的内容没有保存';
    else error.value = reason instanceof Error ? reason.message : 'AI 整理失败';
  } finally { organizing.value = false; organizeController = null; }
}

function cancelOrganization() { organizeController?.abort(); }

async function acceptOrganized() {
  try {
    note.value = await apiClient.acceptOrganizedNote(code.value);
    message.value = '已将整理稿设为阅读版本；原始笔记和全部版本仍然保留';
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '接受整理稿失败'; }
}

async function focusCurrent() {
  await apiClient.focusLearningPoint(code.value);
  await load();
  message.value = '已设为当前学习知识点';
}

async function completeLearning() {
  if (!noteDraft.value.trim()) { activeTab.value = 'notes'; message.value = '请先留下学习笔记，再确认已学完'; return; }
  await saveNote(false);
  await apiClient.completeLearningPoint(code.value);
  await load();
  message.value = '已记录“阅读资料并完成笔记”。掌握等级仍由可选挑战判定';
}

async function deferCurrent() {
  deferReason.value = '';
  deferDialogOpen.value = true;
}

async function confirmDefer() {
  deferring.value = true;
  try {
    await apiClient.deferLearningPoint(code.value, deferReason.value || undefined);
    deferDialogOpen.value = false;
    await router.push('/');
  } finally { deferring.value = false; }
}

async function chooseBranch(branch: LearningBranch) {
  await apiClient.saveRouteChoice({ sourceCode: code.value, targetCode: branch.code, state: 'SELECTED', scope: 'POINT' });
  await apiClient.focusLearningPoint(branch.code);
  await router.push(`/knowledge/${branch.code}`);
}

async function deferBranch(branch: LearningBranch, scope: 'POINT' | 'BRANCH') {
  await apiClient.saveRouteChoice({ sourceCode: code.value, targetCode: branch.code, state: 'DEFERRED', scope });
  branches.value = await apiClient.getNextBranches(code.value);
  message.value = scope === 'BRANCH' ? '已暂缓这条支线，可随时从知识体系恢复' : '已把这个知识点放入稍后学习';
}

async function launchChallenge() {
  if (!point.value || launching.value) return;
  launching.value = true;
  error.value = '';
  try {
    const type = selectedStage.value === 4 ? 'RETEST' : 'FIRST';
    const session = await apiClient.createAssessment({
      knowledgePointCode: point.value.code,
      type,
      durationMinutes: selectedStage.value <= 2 ? 35 : 60,
      masteryStage: selectedStage.value,
      challengeMode: challengeMode.value,
      challengeProfile: point.value.challengeProfile,
    });
    await router.push({ path: `/assessment/${session.id}`, query: session.resumedExisting ? { resumed: '1', message: session.resumeMessage ?? '' } : {} });
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '无法创建掌握挑战'; }
  finally { launching.value = false; }
}

function togglePractice(activityId: string) {
  activePracticeId.value = activePracticeId.value === activityId ? null : activityId;
}

watch(code, load);
onMounted(load);
onBeforeUnmount(() => organizeController?.abort());
</script>

<template>
  <div class="knowledge-detail">
    <div v-if="loading" class="state-card">正在打开学习内容…</div>
    <div v-else-if="error && !point" class="state-card error">{{ error }}<button @click="load">重试</button></div>
    <template v-else-if="point">
      <header class="point-hero">
        <button class="back" @click="router.back()">← 返回</button>
        <div class="hero-copy">
          <p>{{ point.domainCode }} · {{ point.domainTitle }}</p>
          <h1><code>{{ point.code }}</code>{{ point.title }}</h1>
          <div class="state-row">
            <span :data-state="point.learningState">{{ { NOT_STARTED: '未开始', LEARNING: '学习中', LEARNED: '已学完', DEFERRED: '稍后再学' }[point.learningState] }}</span>
            <span class="mastery">M{{ point.masteryLevel }} · {{ masteryCopy[point.masteryLevel]?.[1] }}</span>
            <span>{{ profileText }}</span>
          </div>
        </div>
        <div class="hero-actions">
          <button v-if="point.learningState !== 'LEARNED'" class="primary" @click="focusCurrent">{{ point.currentFocus ? '正在学习' : '设为当前学习' }}</button>
          <button v-if="point.learningState !== 'LEARNED'" @click="deferCurrent">暂时不学</button>
          <button v-else @click="activeTab = 'mastery'">可选：掌握挑战</button>
        </div>
      </header>

      <p v-if="error" class="notice error">{{ error }}</p>
      <p v-if="message" class="notice">{{ message }}</p>

      <details class="learning-guide">
        <summary><span><small>推荐学习方式</small><strong>{{ profileText }}</strong></span><em>展开规则与预计投入</em><i aria-hidden="true"></i></summary>
        <div class="learning-guide__body">
          <ol>
            <li>读资料并结合示例形成自己的解释</li>
            <li>随时记录原始笔记，可让 AI 生成独立整理稿</li>
            <li>由你点击“已学完”；掌握挑战完全可选</li>
          </ol>
          <div class="effort"><span v-for="activity in point.learningActivities" :key="activity.type">{{ activity.label }} {{ activity.minutes }}m</span><b>只有资料与笔记是学习完成条件；其余任务均可选</b></div>
        </div>
      </details>

      <nav class="tabs">
        <button :class="{ active: activeTab === 'materials' }" @click="activeTab = 'materials'">学习资料</button>
        <button :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">我的笔记</button>
        <button :class="{ active: activeTab === 'mastery' }" @click="activeTab = 'mastery'">掌握挑战 <em>可选</em></button>
      </nav>

      <main v-if="activeTab === 'materials'" class="materials-layout">
        <MarkdownRenderer class="content-card material-reader markdown-content" :source="point.studyMaterialMd" aria-label="学习资料" />
        <aside class="content-card activity-panel" :class="{ expanded: activePracticeId }">
          <header><small>LEARNING ACTIVITIES</small><h2>学完资料后，可以这样练</h2><p>每一项都给出实际任务，不再用没有入口的“项目时间”占位。</p></header>
          <article v-for="(activity, index) in point.learningActivities" :key="activity.id" :class="{ required: !activity.optional, active: activePracticeId === activity.id }">
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <h3>{{ activity.label }}<em>{{ activity.optional ? '可选' : '学习完成条件' }}</em></h3>
              <p>{{ activity.task }}</p><small>建议 {{ activity.minutes }} 分钟，可按实际情况调整</small>
              <button v-if="activity.deliveryMode === 'WORKSPACE'" class="practice-entry" @click="togglePractice(activity.id)">{{ activePracticeId === activity.id ? '收起练习区' : '在系统中开始并完成 →' }}</button>
            </div>
            <PracticeWorkspace v-if="activePracticeId === activity.id" class="activity-workspace" :point-code="point.code" :point-title="point.title" :activity="activity" @completed="message = '练习已验证并保存，不会影响“已学完”或掌握等级。'" />
          </article>
        </aside>
      </main>

      <main v-else-if="activeTab === 'notes'" class="notes-layout">
        <section class="content-card note-editor">
          <header><div><small>Markdown 原始笔记</small><h2>边写边预览，你的原文永远保留</h2></div><span>{{ note?.versions.length ?? 0 }} 个可见版本</span></header>
          <nav class="note-view-switch" aria-label="笔记编辑视图">
            <button :class="{ active: notePreviewMode === 'edit' }" @click="notePreviewMode = 'edit'">只编辑</button>
            <button :class="{ active: notePreviewMode === 'split' }" @click="notePreviewMode = 'split'">编辑 + 预览</button>
            <button :class="{ active: notePreviewMode === 'preview' }" @click="notePreviewMode = 'preview'">只预览</button>
          </nav>
          <div class="markdown-workbench" :class="`mode-${notePreviewMode}`">
            <label v-show="notePreviewMode !== 'preview'" class="markdown-source"><span>Markdown 源文本</span><textarea v-model="noteDraft" aria-label="Markdown 原始笔记" placeholder="# 标题&#10;&#10;记录理解、疑问、代码和示例……"></textarea></label>
            <section v-show="notePreviewMode !== 'edit'" class="markdown-preview" aria-label="Markdown 实时预览"><span>实时预览</span><MarkdownRenderer v-if="noteDraft.trim()" class="markdown-content" :source="noteDraft" :streaming="true" aria-label="笔记实时预览" /><p v-else>开始输入后，这里会实时显示标题、表格、公式、图形、任务清单、引用、链接和代码块。</p></section>
          </div>
          <footer><span>支持标题、列表、任务清单、表格、引用、链接、粗体、行内代码和代码块</span><button :disabled="saving" @click="saveNote()">{{ saving ? '保存中…' : '保存原始笔记' }}</button><button v-if="organizing" @click="cancelOrganization">停止生成</button><button class="primary" :disabled="organizing" @click="organizeNote">{{ organizing ? `AI 整理中 · ${organizeElapsedSeconds} 秒 · ${streamingOrganizedMd.length} 字` : '用 AI 整理并核对' }}</button></footer>
        </section>
        <section class="content-card organized">
          <header><div><small>AI 整理候选稿</small><h2>{{ organizing ? '正在生成可核对的最终正文' : note?.generationMode === 'LOCAL_FALLBACK' ? 'AI 未完成：这是安全排版稿' : '核对后由你决定是否采用' }}</h2></div><button v-if="note?.organizedMd && !organizing" @click="acceptOrganized">采用为阅读版本</button></header>
          <div v-if="organizing" class="stream-state" aria-live="polite"><i></i><span><b>{{ organizeProgress }}</b><small>{{ organizeElapsedSeconds }} 秒 · 正文 {{ streamingOrganizedMd.length }} 字 · 思考 {{ streamingThinking.length }} 字；两条内容严格分离</small></span></div>
          <MarkdownRenderer v-if="organizedDisplayMd || streamingThinking" class="markdown-content streaming-markdown" :class="{ live: organizing }" :source="organizedDisplayMd" :thinking="streamingThinking" :streaming="organizing" aria-label="AI 整理候选稿" />
          <p v-if="organizing && !streamingOrganizedMd" class="awaiting-final">AI 正在核对资料。最终整理正文尚未开始输出，不会用原始笔记冒充整理结果。</p>
          <p v-if="!organizing && !organizedDisplayMd && !streamingThinking" class="empty">保存原始笔记后，可让 AI 按学习资料检查正确性、遗漏和结构。它只会生成新稿，不覆盖你的文字。</p>
          <div v-if="note?.aiReview && !organizing" class="ai-review">
            <p v-for="item in note.aiReview.corrections" :key="item"><b>纠正</b>{{ item }}</p>
            <p v-for="item in note.aiReview.additions" :key="item"><b>补充</b>{{ item }}</p>
            <p v-for="item in note.aiReview.uncertainItems" :key="item"><b>待确认</b>{{ item }}</p>
          </div>
        </section>
      </main>

      <main v-else class="mastery-layout">
        <section class="content-card mastery-path">
          <header><small>OPTIONAL MASTERY CHALLENGE</small><h2>从会做一点，到独立、稳定地掌握</h2><p>失败不会撤销“已学完”，也不会降低已有等级；提示不扣分，但会如实记录独立程度。</p></header>
          <button v-for="(level, index) in masteryCopy.slice(1)" :key="level[0]" :class="{ selected: selectedStage === index + 1, achieved: point.masteryLevel >= index + 1 }" @click="selectedStage = index + 1">
            <span>{{ level[0] }}</span><strong>{{ level[1] }}</strong><small>{{ level[2] }}</small><i>{{ point.masteryLevel >= index + 1 ? '已达到' : '选择' }}</i>
          </button>
        </section>
        <section class="content-card launch-card">
          <small>挑战形式</small><h2>M{{ selectedStage }} · {{ masteryCopy[selectedStage]?.[1] }}</h2>
          <p>默认先理论后实战，但不强制。系统已按这个知识点判定为“{{ point.challengeProfile }}”。</p>
          <div class="mode-picker">
            <button :class="{ active: challengeMode === 'THEORY' }" @click="challengeMode = 'THEORY'">先做理论</button>
            <button v-if="point.challengeProfile !== 'THEORY_ONLY'" :class="{ active: challengeMode === 'PRACTICE' }" @click="challengeMode = 'PRACTICE'">先做实战</button>
            <button v-if="point.challengeProfile !== 'THEORY_ONLY'" :class="{ active: challengeMode === 'MIXED' }" @click="challengeMode = 'MIXED'">理论 + 实战</button>
          </div>
          <button class="primary launch" :disabled="point.learningState !== 'LEARNED' || launching" @click="launchChallenge">{{ launching ? '正在准备…' : point.learningState !== 'LEARNED' ? '先标记为已学完' : '开始这一级挑战 →' }}</button>
          <MarkdownRenderer class="criteria markdown-content" :source="point.passCriteriaMd" aria-label="通过标准" />
        </section>
      </main>

      <section class="completion-card">
        <div><small>LEARNING COMPLETION</small><h2>{{ point.learningState === 'LEARNED' ? '你已确认完成资料阅读与笔记' : '读完资料并写好笔记了吗？' }}</h2><p>这个按钮只记录学习完成，不声称已经掌握。</p></div>
        <button v-if="point.learningState !== 'LEARNED'" class="primary" @click="completeLearning">我已阅读资料并完成笔记</button>
        <span v-else>已学完 ✓</span>
      </section>

      <section class="branches-section">
        <header><div><small>{{ branches[0]?.navigationKind === 'TRACK_CHOICE' ? 'NEXT TRACK' : 'CONTINUE ROUTE' }}</small><h2>{{ branches[0]?.navigationKind === 'TRACK_CHOICE' ? '当前路线已完成，选择下一条学习方向' : '继续当前路线的下一个知识点' }}</h2><p>{{ branches[0]?.navigationKind === 'TRACK_CHOICE' ? '只有一条连续路线走完后才会出现选择；未选择的方向不会被放弃，完成所选路线后仍会再次出现。' : '系统沿当前路线连续推进，不在每个知识点后制造分支；暂缓时会跳过该点继续后面的内容。' }}</p></div></header>
        <div v-if="branches.length" class="branch-grid">
          <article v-for="branch in branches" :key="branch.code" :class="{ deferred: branch.routeChoice === 'DEFERRED' || branch.learningState === 'DEFERRED' }">
            <div><code>{{ branch.code }}</code><span>{{ branch.navigationKind === 'CONTINUE' ? '唯一下一步' : '新路线入口' }}</span></div>
            <h3>{{ branch.title }}</h3><p>{{ branch.relationDescription || branch.learningApproach }}</p>
            <dl><div><dt>路线</dt><dd>{{ branch.trackName }}</dd></div><div><dt>剩余</dt><dd>{{ branch.trackRemaining }} 个知识点</dd></div><div><dt>预计投入</dt><dd>当前点约 {{ branch.estimatedMinutes }} 分钟</dd></div><div><dt>暂缓影响</dt><dd>{{ branch.impactIfDeferred }}</dd></div></dl>
            <footer><button class="primary" @click="chooseBranch(branch)">{{ branch.navigationKind === 'CONTINUE' ? '学习下一个 →' : '选择这条路线 →' }}</button><button @click="deferBranch(branch, 'POINT')">暂缓此知识点</button><button v-if="branch.navigationKind === 'TRACK_CHOICE'" @click="deferBranch(branch, 'BRANCH')">暂缓整条路线</button></footer>
          </article>
        </div>
        <div v-else class="content-card empty">所有可继续的路线都已完成或被你主动暂缓。你仍可在知识体系中恢复任意知识点。</div>
      </section>
    </template>
  </div>
  <BaseDialog
    :open="deferDialogOpen"
    eyebrow="LEARN LATER"
    title="暂时搁置这个知识点？"
    description="它只会离开当前路线，不会删除知识点、笔记或掌握记录，你可以随时恢复。"
    confirm-label="放到稍后学习"
    :busy="deferring"
    @cancel="deferDialogOpen = false"
    @confirm="confirmDefer"
  >
    <textarea v-model="deferReason" maxlength="300" placeholder="为什么暂时不学？可以留空，例如：当前工作暂时用不到。"></textarea>
  </BaseDialog>
</template>

<style scoped>
.knowledge-detail{max-width:1320px;margin:0 auto;padding:24px;display:grid;gap:18px}.point-hero,.learning-guide,.content-card,.completion-card,.branches-section{background:var(--color-bg-primary,#fff);border:1px solid var(--color-border-subtle,#dce2e8);border-radius:18px}.point-hero{padding:22px;display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:start}.back{border:0;background:transparent}.hero-copy p,.hero-copy h1{margin:0}.hero-copy h1{display:flex;gap:12px;align-items:baseline;margin-top:7px;font-size:clamp(1.6rem,3vw,2.5rem)}.hero-copy code{font-size:.78rem;color:var(--color-primary,#3157d5)}.state-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.state-row span{padding:7px 10px;border-radius:999px;background:#f1f4f8;font-size:.78rem}.state-row .mastery{background:#eef0ff;color:#453db5}.hero-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}button{cursor:pointer;border:1px solid #ccd3dd;background:#fff;border-radius:10px;padding:9px 13px;color:inherit}button.primary{background:#243a73;border-color:#243a73;color:#fff}.notice{margin:0;padding:10px 14px;border-radius:10px;background:#eaf7ef;color:#17613a}.notice.error,.state-card.error{background:#fff0ee;color:#9c2d25}.learning-guide{padding:18px;display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:20px}.learning-guide small,.content-card small,.branches-section small{display:block;color:#657086;font:700 .68rem ui-monospace;letter-spacing:.09em}.learning-guide strong{display:block;margin-top:7px;line-height:1.55}.learning-guide ol{margin:0;padding-left:20px;line-height:1.75}.effort{display:flex;flex-wrap:wrap;gap:7px;align-content:start}.effort span{background:#f2f4f8;border-radius:8px;padding:7px}.effort b{width:100%;font-size:.74rem;color:#727b8c}.tabs{display:flex;gap:8px}.tabs button{padding:11px 18px}.tabs button.active{background:#1d2636;color:#fff}.tabs em{font-style:normal;color:#9cb8ff}.content-card{padding:22px}.markdown-content{line-height:1.75;overflow-wrap:anywhere}.notes-layout,.mastery-layout{display:grid;grid-template-columns:1fr 1fr;gap:16px}.note-editor header,.organized header{display:flex;justify-content:space-between;gap:12px;align-items:start}.note-editor h2,.organized h2,.mastery-layout h2{margin:4px 0 14px}.note-editor textarea{width:100%;min-height:430px;box-sizing:border-box;border:1px solid #cbd3df;border-radius:12px;padding:14px;font:inherit;line-height:1.65;resize:vertical}.note-editor footer{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:10px}.note-editor footer span{margin-right:auto;color:#6d7686;font-size:.75rem}.organized{max-height:650px;overflow:auto}.empty{color:#697487;line-height:1.7}.ai-review{border-top:1px solid #e2e6ec;margin-top:16px;padding-top:10px}.ai-review p{display:flex;gap:8px;font-size:.84rem}.ai-review b{color:#385dc7}.mastery-path{display:grid;gap:8px}.mastery-path header{margin-bottom:5px}.mastery-path header p,.launch-card>p{color:#687286}.mastery-path>button{text-align:left;display:grid;grid-template-columns:44px 100px 1fr auto;align-items:center;gap:8px}.mastery-path>button span{font:800 1rem ui-monospace}.mastery-path>button small{letter-spacing:0;font-family:inherit}.mastery-path>button i{font-style:normal;font-size:.72rem}.mastery-path>button.selected{border-color:#324f9f;box-shadow:0 0 0 2px #dce5ff}.mastery-path>button.achieved{background:#eff8f2}.mode-picker{display:flex;gap:8px;margin:18px 0}.mode-picker button.active{background:#e8edff;border-color:#5773c3}.launch{width:100%;font-size:1rem;padding:12px}.criteria{border-top:1px solid #e1e6ed;margin-top:18px;padding-top:10px;font-size:.86rem}.completion-card{padding:20px;display:flex;justify-content:space-between;align-items:center;gap:18px}.completion-card h2{margin:4px 0}.completion-card p{margin:0;color:#6d7686}.completion-card>span{color:#177240;font-weight:700}.branches-section{padding:22px}.branches-section header h2{margin:4px 0}.branches-section header p{margin:0;color:#697487}.branch-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:13px;margin-top:17px}.branch-grid article{border:1px solid #dce1e8;border-radius:13px;padding:16px;display:flex;flex-direction:column}.branch-grid article.deferred{opacity:.58}.branch-grid article>div:first-child{display:flex;gap:7px;align-items:center}.branch-grid article>div span{font-size:.68rem;background:#e8edff;color:#3852a1;padding:3px 6px;border-radius:5px}.branch-grid h3{margin:10px 0 5px}.branch-grid>article>p{color:#657084;line-height:1.6}.branch-grid dl{font-size:.78rem}.branch-grid dl div{display:grid;grid-template-columns:66px 1fr;gap:6px;margin:6px 0}.branch-grid dt{color:#7b8493}.branch-grid dd{margin:0}.branch-grid footer{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;padding-top:10px}.state-card{padding:30px;border-radius:15px;background:#fff}.state-card button{margin-left:12px}@media(max-width:900px){.point-hero,.learning-guide{grid-template-columns:1fr}.hero-actions{justify-content:flex-start}.notes-layout,.mastery-layout{grid-template-columns:1fr}.mastery-path>button{grid-template-columns:40px 90px 1fr}.mastery-path>button i{display:none}.completion-card{align-items:flex-start;flex-direction:column}}@media(max-width:600px){.knowledge-detail{padding:12px}.point-hero,.content-card,.branches-section{padding:16px}.tabs{overflow:auto}.tabs button{white-space:nowrap}.note-editor footer{flex-wrap:wrap}.note-editor footer span{width:100%}}
</style>

<style scoped>
.knowledge-detail{width:100%;max-width:1580px;padding:0;gap:16px}
.point-hero,.learning-guide,.content-card,.completion-card,.branches-section{border-color:#dfe5ed;box-shadow:0 9px 30px rgba(26,48,79,.065)}
.point-hero{position:relative;overflow:hidden;align-items:center;padding:16px 20px;background:linear-gradient(135deg,#fff 0%,#f7faff 72%,#edf5ff 100%)}
.point-hero::after{position:absolute;right:-90px;bottom:-120px;width:280px;height:280px;content:'';background:radial-gradient(circle,rgba(61,116,211,.12),transparent 68%);pointer-events:none}
.point-hero>*{position:relative;z-index:1}.hero-copy h1{margin-top:3px;font-size:clamp(1.55rem,2.25vw,2.3rem);line-height:1.14;letter-spacing:-.035em}.hero-copy h1 code{padding:4px 7px;color:#2d63b8;background:#eaf2ff;border-radius:8px}.state-row{margin-top:9px}.state-row span{padding:5px 8px;background:#fff;border:1px solid #e1e7ef;box-shadow:0 2px 7px rgba(27,48,78,.035)}.hero-actions button{padding:8px 10px}
.learning-guide{display:block;padding:0;overflow:hidden}.learning-guide>summary{display:grid;grid-template-columns:minmax(0,1fr) auto 12px;gap:14px;align-items:center;min-height:62px;padding:10px 18px;cursor:pointer;list-style:none}.learning-guide>summary::-webkit-details-marker{display:none}.learning-guide>summary span{min-width:0}.learning-guide>summary strong{overflow:hidden;margin-top:2px;text-overflow:ellipsis;white-space:nowrap}.learning-guide>summary em{color:#617087;font-size:.72rem;font-style:normal;white-space:nowrap}.learning-guide>summary i{width:8px;height:8px;border-right:2px solid #718096;border-bottom:2px solid #718096;transform:rotate(45deg);transition:transform .18s ease}.learning-guide[open]>summary i{transform:rotate(225deg)}.learning-guide__body{display:grid;grid-template-columns:1fr 1.2fr;gap:18px;padding:15px 18px 18px;border-top:1px solid #e5eaf0}.learning-guide__body ol{margin:0}.effort span{color:#33465f;background:#f2f6fc;border:1px solid #e0e7f0}.effort b{line-height:1.5}
.tabs{position:sticky;top:12px;z-index:12;width:max-content;padding:5px;background:rgba(241,245,250,.9);border:1px solid #dce4ed;border-radius:14px;box-shadow:0 7px 24px rgba(27,50,80,.08);backdrop-filter:blur(14px)}.tabs button{border:0;background:transparent}.tabs button.active{background:linear-gradient(135deg,#1c3353,#245a83);box-shadow:0 7px 18px rgba(28,62,99,.2)}
.materials-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:stretch}.material-reader{min-width:0;padding:24px 28px}.activity-panel{position:static;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:20px}.activity-panel>header{grid-column:1/-1}.activity-panel header h2{margin:3px 0}.activity-panel header p{margin:0 0 5px;color:#68768a;font-size:.82rem}.activity-panel>article{display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;height:100%;padding:14px;border:1px solid #e1e7ef;border-radius:14px;background:linear-gradient(145deg,#fff,#f8fbff)}.activity-panel>article.active{grid-column:1/-1;height:auto;border-color:#9eb8dc;box-shadow:0 8px 24px rgba(41,84,139,.08)}.activity-panel>article>span{display:grid;place-items:center;width:36px;height:36px;color:#4b6591;font:760 .67rem var(--font-mono);background:#edf3fb;border-radius:11px}.activity-panel>article.required>span{color:#fff;background:linear-gradient(145deg,#3972c8,#24579e)}.activity-panel>article>div{display:flex;min-width:0;flex-direction:column}.activity-panel h3{display:flex;gap:8px;align-items:center;margin:0 0 5px;font-size:.94rem}.activity-panel h3 em{padding:2px 6px;color:#56708f;font-size:.62rem;font-style:normal;background:#eef2f7;border-radius:999px}.activity-panel article.required h3 em{color:#28624f;background:#e9f7f0}.activity-panel article p{margin:0;color:#4f6075;font-size:.82rem;line-height:1.68}.activity-panel article small{margin-top:7px;color:#8792a1;letter-spacing:0;font-family:inherit}.activity-panel.expanded{position:static}.activity-panel .activity-workspace{grid-column:1/-1}.practice-entry{align-self:flex-start;margin-top:auto;padding:9px 13px;border-color:#9fb5d3;background:#edf4fc;color:#28558b;font-weight:750}
.content-card{padding:25px}.branch-grid{grid-template-columns:repeat(auto-fit,minmax(330px,1fr))}.branch-grid article{padding:18px;background:linear-gradient(145deg,#fff,#fafcff);border-radius:16px;box-shadow:0 5px 17px rgba(28,51,82,.04)}.branch-grid article:first-child{border-color:#9cb5df;box-shadow:0 9px 24px rgba(43,91,171,.09)}
.notes-layout,.mastery-layout,.branch-grid{align-items:stretch}.notes-layout>.content-card,.mastery-layout>.content-card,.branch-grid>article{height:100%}.note-editor,.organized{display:flex;min-width:0;flex-direction:column}.note-editor footer{margin-top:auto;padding-top:10px}.organized{max-height:none}.organized>.empty{margin:auto 0}
.completion-card{background:linear-gradient(135deg,#f9fffb,#f0f9f5)}
.note-view-switch{display:flex;gap:5px;width:max-content;margin:0 0 12px;padding:4px;border:1px solid #dce4ed;border-radius:11px;background:#f2f6fa}.note-view-switch button{border:0;background:transparent;padding:7px 10px}.note-view-switch button.active{color:#fff;background:#234e77;box-shadow:0 4px 12px rgba(32,72,111,.18)}
.markdown-workbench{display:grid;grid-template-columns:1fr 1fr;gap:10px;min-height:430px}.markdown-workbench.mode-edit,.markdown-workbench.mode-preview{grid-template-columns:1fr}.markdown-source,.markdown-preview{display:flex;min-width:0;flex-direction:column;border:1px solid #d7e0e9;border-radius:13px;overflow:hidden;background:#fff}.markdown-source>span,.markdown-preview>span{padding:9px 12px;color:#617087;font-size:.7rem;font-weight:800;background:#f3f7fa;border-bottom:1px solid #dfe6ed}.note-editor .markdown-source textarea{min-height:430px;height:100%;border:0;border-radius:0;outline:0;font:13px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace}.markdown-preview>article,.markdown-preview>p{padding:4px 17px 20px;margin:0;overflow:auto}.markdown-preview>p{padding-top:20px;color:#7a8492}.markdown-preview pre,.organized pre{overflow:auto;padding:14px;color:#deebf8;background:#122033;border-radius:11px}.markdown-preview code,.organized code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.markdown-preview table,.organized table{width:100%;border-collapse:collapse}.markdown-preview th,.markdown-preview td,.organized th,.organized td{padding:8px;border:1px solid #dce3eb;text-align:left}.markdown-preview blockquote,.organized blockquote{margin-left:0;padding:2px 14px;color:#53677e;border-left:4px solid #81a4ce;background:#f4f8fc}.task-item{display:flex;gap:7px;align-items:flex-start}.task-item input{margin-top:6px}
.stream-state{display:flex;gap:10px;align-items:center;margin-bottom:12px;padding:11px 12px;color:#31597e;background:#edf6ff;border:1px solid #d3e7f8;border-radius:10px;font-size:.8rem}.stream-state>span{display:grid;gap:3px}.stream-state b{font-size:.8rem}.stream-state small{color:#647b94;font-size:.7rem}.stream-state i{flex:0 0 auto;width:9px;height:9px;background:#2a75bc;border-radius:50%;box-shadow:0 0 0 0 rgba(42,117,188,.35);animation:stream-pulse 1.25s infinite}.awaiting-final{margin:.7rem 0 0;padding:12px;color:#64758a;font-size:.78rem;background:#f6f8fb;border:1px dashed #ccd7e3;border-radius:10px}.streaming-markdown.live::after{display:inline-block;width:2px;height:1.1em;margin-left:3px;vertical-align:text-bottom;content:'';background:#2c70b1;animation:stream-caret .7s steps(1) infinite}@keyframes stream-pulse{70%{box-shadow:0 0 0 8px rgba(42,117,188,0)}}@keyframes stream-caret{50%{opacity:0}}
@media(max-width:1100px){.activity-panel{grid-template-columns:1fr 1fr}.activity-panel>article.active{grid-column:1/-1}.learning-guide__body{grid-template-columns:1fr 1fr}}
@media(max-width:900px){.notes-layout>.content-card,.mastery-layout>.content-card{height:auto}}
@media(max-width:700px){.knowledge-detail{padding:0}.point-hero{padding:18px}.learning-guide>summary{grid-template-columns:minmax(0,1fr) 12px}.learning-guide>summary em{display:none}.learning-guide__body{grid-template-columns:1fr}.materials-layout{display:block}.activity-panel{grid-template-columns:1fr;margin-top:14px}.activity-panel>article.active{grid-column:auto}.tabs{top:6px;width:100%;overflow:auto}.tabs button{flex:1}.material-reader{padding:19px}.branch-grid{grid-template-columns:1fr}.markdown-workbench{grid-template-columns:1fr}.note-view-switch{width:100%}.note-view-switch button{flex:1}.note-editor footer button{flex:1}}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { apiClient, type LearningActivity, type PracticeAttempt } from '@/api/client';
import { runBrowserCode, type BrowserExecutionStatus } from '@/utils/browser-code-runner';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';

const props = defineProps<{ pointCode: string; pointTitle: string; activity: LearningActivity }>();
const emit = defineEmits<{ completed: [activityId: string] }>();

const submissionMd = ref('');
const code = ref('');
const executionOutput = ref('');
const executionStatus = ref<'NOT_RUN' | BrowserExecutionStatus>('NOT_RUN');
const attempt = ref<PracticeAttempt | null>(null);
const loading = ref(true);
const running = ref(false);
const saving = ref(false);
const validating = ref(false);
const message = ref('');
const error = ref('');
const validationProgress = ref('');
const validationReceivedChars = ref(0);
const validationThinking = ref('');
let validationController: AbortController | null = null;

const verificationChecklist = computed(() => props.activity.verificationChecklist.length
  ? props.activity.verificationChecklist
  : props.activity.completionCriteria);
const semanticReview = computed(() => {
  const validation = attempt.value?.validation;
  // 旧记录没有 validationLevel；历史上 AI 模式即表示语义复核已运行。
  return validation?.validationLevel === 'SEMANTIC'
    || (!validation?.validationLevel && validation?.mode === 'AI');
});
const fullyPassed = computed(() => Boolean(attempt.value?.validation?.passed && semanticReview.value));
const validationTitle = computed(() => {
  const validation = attempt.value?.validation;
  if (!validation) return '等待验证';
  if (fullyPassed.value) return '完全通过';
  if (semanticReview.value) return 'AI 语义复核未通过';
  return validation.passed ? '本地结构检查通过' : '本地结构检查待补充';
});
const validationDescription = computed(() => {
  const validation = attempt.value?.validation;
  if (!validation) return '先保存草稿或提交。系统会先检查结构；只有 AI 语义复核通过才会显示“完全通过”。';
  if (fullyPassed.value) return '本地结构检查与 AI 对资料、任务边界的语义复核均已通过。';
  if (semanticReview.value) return '本地结构已提交，但 AI 复核发现资料依据、任务边界或验证证据仍需补充。';
  if (validation.passed) return 'AI 未参与本次结论；这只证明提交结构可复核，不能证明已符合资料语义或完全通过。';
  return '先逐项补齐本地结构检查，再提交语义复核。';
});

onMounted(async () => {
  try {
    const attempts = await apiClient.getPracticeAttempts(props.pointCode);
    attempt.value = attempts.find((item) => item.activityId === props.activity.id) ?? null;
    submissionMd.value = attempt.value?.submissionMd || props.activity.submissionTemplate || '';
    code.value = attempt.value?.code || props.activity.starterCode || '';
    executionOutput.value = attempt.value?.executionOutput || '';
    executionStatus.value = (attempt.value?.executionStatus as typeof executionStatus.value) || 'NOT_RUN';
    if (attempt.value) {
      message.value = attempt.value.status === 'COMPLETED'
        ? '已恢复上次保存的练习证据与验证结果；可以继续查看或补充后重新验证。'
        : '已恢复上次草稿、代码和执行输出；未提交的内容仍保留在这里。';
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '练习记录加载失败';
  } finally {
    loading.value = false;
  }
});

function payload() {
  return {
    submissionMd: submissionMd.value,
    code: props.activity.workspaceMode === 'CODE' ? code.value : undefined,
    language: props.activity.language ?? undefined,
    executionOutput: props.activity.workspaceMode === 'CODE' ? executionOutput.value : undefined,
    executionStatus: props.activity.workspaceMode === 'CODE' ? executionStatus.value : undefined,
  };
}

async function runCode() {
  if (!props.activity.language || !code.value.trim()) return;
  running.value = true;
  error.value = '';
  message.value = '';
  try {
    const result = await runBrowserCode(code.value, props.activity.language);
    executionStatus.value = result.status;
    executionOutput.value = `${result.output}\n\n[运行耗时 ${result.durationMs}ms]`;
    message.value = result.status === 'SUCCESS' ? '脚本已在本地 Worker 自检区执行完成；该记录不是安全沙箱或服务端证明。' : '执行没有通过，请根据输出修正后重试。';
  } catch (reason) {
    executionStatus.value = 'ERROR';
    error.value = reason instanceof Error ? reason.message : '脚本执行失败';
  } finally {
    running.value = false;
  }
}

async function saveDraft() {
  saving.value = true;
  error.value = '';
  try {
    attempt.value = await apiClient.savePracticeAttempt(props.pointCode, props.activity.id, payload());
    message.value = '练习草稿、代码和执行输出已经保存。';
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '练习保存失败';
  } finally {
    saving.value = false;
  }
}

async function validate() {
  validating.value = true;
  error.value = '';
  message.value = '';
  validationProgress.value = '正在建立流式验证连接';
  validationReceivedChars.value = 0;
  validationThinking.value = '';
  validationController = new AbortController();
  try {
    attempt.value = await apiClient.validatePracticeAttemptStream(
      props.pointCode,
      props.activity.id,
      payload(),
      (progress, receivedChars) => {
        validationProgress.value = progress;
        validationReceivedChars.value = receivedChars ?? validationReceivedChars.value;
      },
      validationController.signal,
      (_delta, accumulated) => { validationThinking.value = accumulated; },
    );
    if (attempt.value.validation?.passed) {
      message.value = '练习已通过系统验证并保存为完成证据。';
      emit('completed', props.activity.id);
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '练习验证失败';
  } finally {
    validating.value = false;
    validationController = null;
  }
}

onBeforeUnmount(() => validationController?.abort());
</script>

<template>
  <section class="practice-workspace" :aria-label="`${pointCode} ${activity.label}`">
    <div v-if="loading" class="workspace-state">正在打开站内练习区…</div>
    <template v-else>
      <header class="workspace-header">
        <div><small>IN-SITE PRACTICE</small><h3>{{ pointCode }} · {{ activity.label }}</h3><p>{{ pointTitle }}</p></div>
        <span :data-status="attempt?.status ?? 'DRAFT'">{{ fullyPassed ? '完全通过' : attempt?.status === 'COMPLETED' ? '已保存证据' : attempt ? '已恢复草稿' : '新草稿' }}</span>
      </header>

      <section class="task-statement" aria-label="具体任务题干">
        <span>00 · 具体任务题干</span><p>{{ activity.task }}</p>
      </section>

      <div class="task-contract">
        <section><span>01 · 固定输入与约束</span><p>{{ activity.input }}</p></section>
        <section><span>02 · 必须提交</span><ol><li v-for="item in activity.outputRequirements" :key="item">{{ item }}</li></ol></section>
        <section><span>03 · 验证清单</span><ul><li v-for="item in verificationChecklist" :key="item">{{ item }}</li></ul></section>
      </div>

      <div v-if="activity.failureFixture || activity.vetoItems.length" class="risk-contract" aria-label="失败夹具与否决项">
        <section v-if="activity.failureFixture"><span>失败夹具 / 复测变式</span><p>{{ activity.failureFixture }}</p></section>
        <section v-if="activity.vetoItems.length"><span>否决项</span><ul><li v-for="item in activity.vetoItems" :key="item">{{ item }}</li></ul></section>
      </div>

      <details class="source-contract" open>
        <summary>本练习对应的学习资料位置</summary>
        <div v-for="source in activity.materialReferences" :key="`${source.title}-${source.url}`">
          <a v-if="source.url" :href="source.url" target="_blank" rel="noreferrer">{{ source.title }} ↗</a>
          <strong v-else>{{ source.title }}</strong>
          <p>{{ source.locator }}；重点核对：{{ source.focus }}</p>
        </div>
      </details>

      <section v-if="activity.workspaceMode === 'CODE'" class="code-lab">
        <header><div><span>隔离脚本运行区</span><small>{{ activity.language }} · 无 DOM · 3 秒超时</small></div><button type="button" :disabled="running" @click="runCode">{{ running ? '正在执行…' : '▶ 执行并捕获输出' }}</button></header>
        <textarea v-model="code" spellcheck="false" aria-label="练习代码" />
        <div class="execution-output" :data-status="executionStatus"><span>执行结果 · {{ executionStatus }}</span><pre>{{ executionOutput || '尚未执行。请让脚本打印固定输入、预期输出和实际输出。' }}</pre></div>
      </section>

      <label class="submission-editor">
        <span>{{ activity.workspaceMode === 'CODE' ? '实现说明与验证记录' : '在系统中完成练习' }}</span>
        <textarea v-model="submissionMd" rows="16" placeholder="请按模板逐项填写；系统将据此验证输入、输出、资料依据和边界。" />
      </label>

      <p v-if="error" class="workspace-message error" role="alert">{{ error }}</p>
      <p v-else-if="message" class="workspace-message">{{ message }}</p>
      <p v-else-if="validating" class="workspace-message stream-progress" aria-live="polite">
        <span class="stream-dot" />{{ validationProgress }}<small v-if="validationReceivedChars">已接收 {{ validationReceivedChars }} 字符</small>
      </p>
      <MarkdownRenderer v-if="validationThinking" class="validation-thinking" source="" :thinking="validationThinking" :streaming="validating" :thinking-open="false" aria-label="AI 练习验证思考过程" />

      <ol class="validation-rail" aria-label="练习验证阶段">
        <li :class="{ done: Boolean(attempt?.validation), pending: !attempt?.validation }"><b>1</b><div><strong>本地结构检查</strong><small>{{ attempt?.validation ? '已检查提交、产物与可复核证据。' : '尚未执行' }}</small></div></li>
        <li :class="{ done: semanticReview, pending: !semanticReview }"><b>2</b><div><strong>AI 语义复核</strong><small>{{ semanticReview ? '已依据资料、任务边界和验证证据复核。' : '未参与；不能替代为完全通过。' }}</small></div></li>
        <li :class="{ done: fullyPassed, pending: !fullyPassed }"><b>3</b><div><strong>完全通过</strong><small>{{ fullyPassed ? '两层验证均已通过。' : '须在前两层均通过后才会点亮。' }}</small></div></li>
      </ol>

      <article v-if="attempt?.validation" class="validation-result" :class="{ passed: fullyPassed, semantic: semanticReview }">
        <header><strong>{{ validationTitle }}</strong><span>{{ semanticReview ? 'AI 依据资料复核' : '仅本地结构检查' }}</span></header>
        <p class="validation-explainer">{{ validationDescription }}</p>
        <p>{{ attempt.validation.summary }}</p>
        <ul><li v-for="check in attempt.validation.checks" :key="check.label" :class="{ passed: check.passed }">{{ check.passed ? '✓' : '×' }} {{ check.label }}</li></ul>
        <footer>{{ attempt.validation.nextAction }}</footer>
      </article>

      <footer class="workspace-actions">
        <button type="button" :disabled="saving || validating" @click="saveDraft">{{ saving ? '保存中…' : '保存草稿' }}</button>
        <button type="button" class="primary" :disabled="saving || validating" @click="validate">{{ validating ? '正在按资料验证…' : '提交并验证' }}</button>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.practice-workspace{display:grid;gap:18px;margin-top:16px;padding:22px;border:1px solid #b9c9dd;border-radius:18px;background:linear-gradient(145deg,#f9fcff,#f3f7fb);box-shadow:inset 0 1px #fff,0 12px 34px rgba(30,59,91,.08)}
.workspace-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.workspace-header small{font:800 .67rem ui-monospace;letter-spacing:.12em;color:#3662a1}.workspace-header h3{margin:5px 0 2px;font-size:1.25rem}.workspace-header p{margin:0;color:#66758a}.workspace-header>span{padding:7px 10px;border-radius:999px;background:#e9eef5;color:#56667b;font-size:.72rem;font-weight:800}.workspace-header>span[data-status=COMPLETED]{background:#dff5e8;color:#17623b}
.task-statement{padding:15px 17px;border:1px solid #cdddeb;border-radius:13px;background:#edf5ff}.task-statement span,.task-contract span,.risk-contract span{font-size:.7rem;font-weight:900;color:#41679e}.task-statement p{margin:8px 0 0;white-space:pre-line;line-height:1.7;font-weight:700;color:#263d57}.task-contract{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.task-contract section{min-width:0;padding:15px;border:1px solid #d8e1eb;border-radius:13px;background:#fff}.task-contract p,.task-contract ol,.task-contract ul,.risk-contract p,.risk-contract ul{margin:9px 0 0;padding-left:18px;line-height:1.65;font-size:.84rem}.task-contract p,.risk-contract p{padding:0;white-space:pre-line}.risk-contract{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.risk-contract section{min-width:0;padding:14px 15px;border:1px solid #e8d8af;border-radius:13px;background:#fffbf1}.risk-contract ul{color:#7a4b17}
.source-contract{padding:13px 15px;border:1px solid #d8e2ed;border-radius:13px;background:#fff}.source-contract summary{cursor:pointer;font-weight:800}.source-contract div{padding:10px 0;border-top:1px solid #edf0f4;margin-top:9px}.source-contract a,.source-contract strong{color:#2c5c9d;font-weight:800}.source-contract p{margin:4px 0 0;color:#68778a;font-size:.8rem}
.code-lab{overflow:hidden;border:1px solid #202c3a;border-radius:15px;background:#111a24;color:#e8eef6}.code-lab>header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid #2a3949}.code-lab>header span,.code-lab>header small{display:block}.code-lab>header small{margin-top:3px;color:#91a4ba}.code-lab button{border:1px solid #4c769e;background:#193d5b;color:#fff}.code-lab textarea{width:100%;min-height:330px;box-sizing:border-box;border:0;outline:0;resize:vertical;padding:18px;background:#101821;color:#dce8f5;font:13px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;tab-size:2}.execution-output{border-top:1px solid #2a3949;padding:13px}.execution-output>span{font:800 .68rem ui-monospace;color:#8fa7bd}.execution-output[data-status=SUCCESS]>span{color:#6bd49a}.execution-output[data-status=ERROR]>span,.execution-output[data-status=TIMEOUT]>span{color:#ff8f84}.execution-output pre{margin:9px 0 0;max-height:250px;overflow:auto;white-space:pre-wrap;color:#d4dfeb;font:12px/1.6 ui-monospace,monospace}
.submission-editor{display:grid;gap:8px}.submission-editor>span{font-weight:850}.submission-editor textarea{width:100%;box-sizing:border-box;border:1px solid #c7d3df;border-radius:13px;padding:15px;background:#fff;font:inherit;line-height:1.65;resize:vertical}.workspace-message{margin:0;padding:11px 13px;border-radius:10px;background:#e7f5ec;color:#1b6540}.workspace-message.error{background:#fff0ee;color:#992f29}
.stream-progress{display:flex;align-items:center;gap:9px;background:#eaf2ff;color:#274f83}.stream-progress small{margin-left:auto;color:#617691}.stream-dot{width:8px;height:8px;border-radius:50%;background:#3975bb;box-shadow:0 0 0 0 rgba(57,117,187,.4);animation:pulse 1.2s infinite}@keyframes pulse{70%{box-shadow:0 0 0 8px rgba(57,117,187,0)}100%{box-shadow:0 0 0 0 rgba(57,117,187,0)}}
.validation-rail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:0;padding:0;list-style:none}.validation-rail li{display:flex;min-width:0;gap:9px;align-items:flex-start;padding:11px;border:1px solid #dbe3ed;border-radius:12px;background:#fff}.validation-rail b{display:grid;flex:0 0 auto;place-items:center;width:21px;height:21px;border-radius:50%;color:#607185;background:#e8edf3;font:800 .7rem ui-monospace}.validation-rail strong,.validation-rail small{display:block}.validation-rail strong{font-size:.78rem;color:#44566b}.validation-rail small{margin-top:3px;color:#718094;font-size:.69rem;line-height:1.45}.validation-rail li.done{border-color:#abd9bd;background:#f2fbf5}.validation-rail li.done b{color:#fff;background:#287148}.validation-rail li.pending{background:#fbfcfe}.validation-result{padding:16px;border:1px solid #e0b3ae;border-radius:13px;background:#fff7f5}.validation-result.semantic{border-color:#c8d8eb;background:#f6faff}.validation-result.passed{border-color:#add9be;background:#f2fbf5}.validation-result header{display:flex;justify-content:space-between;gap:12px}.validation-result header span{font-size:.72rem;color:#647286}.validation-result p{line-height:1.6}.validation-result .validation-explainer{margin-bottom:8px;color:#4c6176;font-weight:700}.validation-result ul{display:grid;gap:5px;padding:0;list-style:none}.validation-result li{color:#a13b32}.validation-result li.passed{color:#17633b}.validation-result footer{color:#536579;font-weight:700}
.workspace-actions{display:flex;justify-content:flex-end;gap:9px}.workspace-actions button{padding:10px 15px}.workspace-actions .primary{background:#193d68;border-color:#193d68;color:#fff}
.workspace-state{padding:24px;color:#647388}@media(max-width:850px){.task-contract,.risk-contract,.validation-rail{grid-template-columns:1fr}.workspace-header{flex-direction:column}.practice-workspace{padding:15px}.code-lab>header{align-items:flex-start;flex-direction:column}.workspace-actions{justify-content:stretch}.workspace-actions button{flex:1}}
</style>

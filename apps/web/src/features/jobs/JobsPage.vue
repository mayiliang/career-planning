<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  apiClient,
  type Job,
  type JobCSVRow,
  type JobFunnelStats,
  type JobImportPreview,
  type JobKanbanColumn,
} from '../../api/client';
import BaseDialog from '@/components/BaseDialog.vue';
import { jobCsvSample, parseJobCsv, type JobCsvIssue } from './job-csv';

const router = useRouter();
const kanbanColumns = ref<JobKanbanColumn[]>([]);
const funnelStats = ref<JobFunnelStats | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const message = ref('');

const createOpen = ref(false);
const createSaving = ref(false);
const createForm = ref({ company: '', jobTitle: '', platform: '', salary: '', location: '', sourceUrl: '', notes: '' });
const createDisabled = computed(() => !createForm.value.company.trim() || !createForm.value.jobTitle.trim() || !createForm.value.platform.trim());

const importOpen = ref(false);
const importSaving = ref(false);
const csvText = ref('');
const csvRows = ref<JobCSVRow[]>([]);
const csvErrors = ref<JobCsvIssue[]>([]);
const csvWarnings = ref<JobCsvIssue[]>([]);
const importPreview = ref<JobImportPreview | null>(null);
const importConfirmLabel = computed(() => importPreview.value ? `确认导入 ${importPreview.value.valid} 个岗位` : '先检查并预览');
const importConfirmDisabled = computed(() => {
  if (!csvText.value.trim()) return true;
  return importPreview.value ? importPreview.value.valid === 0 || importPreview.value.invalid > 0 : false;
});

async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const [kanban, funnel] = await Promise.all([apiClient.getJobKanban(), apiClient.getJobFunnelStats()]);
    kanbanColumns.value = kanban;
    funnelStats.value = funnel;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '求职数据加载失败';
  } finally { loading.value = false; }
}

const totalJobs = computed(() => kanbanColumns.value.reduce((sum, column) => sum + column.jobs.length, 0));
const conversionRate = computed(() => {
  if (!funnelStats.value) return 0;
  const { saved, applied, interviewing, offer } = funnelStats.value;
  const total = saved + applied + interviewing + offer;
  return total === 0 ? 0 : Math.round((offer / total) * 100);
});

function viewJobDetail(job: Job) { void router.push(`/jobs/${job.id}`); }

function openCreate() {
  createForm.value = { company: '', jobTitle: '', platform: '', salary: '', location: '', sourceUrl: '', notes: '' };
  createOpen.value = true;
}

async function submitCreate() {
  if (createDisabled.value || createSaving.value) return;
  createSaving.value = true;
  error.value = null;
  try {
    const form = createForm.value;
    await apiClient.createJob({
      company: form.company.trim(), jobTitle: form.jobTitle.trim(), platform: form.platform.trim(),
      salary: form.salary.trim() || undefined, location: form.location.trim() || undefined,
      sourceUrl: form.sourceUrl.trim() || undefined, notes: form.notes.trim() || undefined,
    });
    createOpen.value = false;
    message.value = `已创建 ${form.company.trim()} · ${form.jobTitle.trim()}，可在看板中继续补充下一步。`;
    await loadData();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '岗位创建失败'; }
  finally { createSaving.value = false; }
}

function openImport() {
  csvText.value = '';
  csvErrors.value = [];
  csvWarnings.value = [];
  importPreview.value = null;
  importOpen.value = true;
}

async function loadCsvFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    csvErrors.value = [{ message: 'CSV 文件不能超过 2 MB；请拆分后再导入。' }];
    return;
  }
  csvText.value = await file.text();
}

async function previewImport() {
  const parsed = parseJobCsv(csvText.value);
  csvRows.value = parsed.rows;
  csvErrors.value = parsed.errors;
  csvWarnings.value = parsed.warnings;
  importPreview.value = null;
  if (parsed.errors.length > 0) return;
  try {
    importPreview.value = await apiClient.previewJobImport(parsed.rows);
  } catch (reason) { csvErrors.value = [{ message: reason instanceof Error ? reason.message : 'CSV 预览失败' }]; }
}

async function confirmImport() {
  if (!importPreview.value) { await previewImport(); return; }
  if (importPreview.value.invalid > 0 || importSaving.value) return;
  importSaving.value = true;
  try {
    const result = await apiClient.importJobs(csvRows.value);
    importOpen.value = false;
    message.value = result.message;
    await loadData();
  } catch (reason) { csvErrors.value = [{ message: reason instanceof Error ? reason.message : 'CSV 导入失败' }]; }
  finally { importSaving.value = false; }
}

watch(csvText, () => {
  csvRows.value = [];
  csvErrors.value = [];
  csvWarnings.value = [];
  importPreview.value = null;
});

onMounted(loadData);
</script>

<template>
  <div class="jobs-page">
    <header class="page-header">
      <div class="title-row">
        <div><small>JOB SEARCH WORKSPACE</small><h1>求职管理</h1><p>先记录事实，再把每个岗位推进到一个清晰的下一步。</p></div>
        <div class="header-actions"><button @click="openImport">导入 CSV</button><button class="primary" @click="openCreate">新增岗位</button></div>
      </div>
      <div v-if="funnelStats" class="funnel-stats" aria-label="求职漏斗">
        <div class="stat-item"><span class="stat-value">{{ funnelStats.saved }}</span><span class="stat-label">已保存</span></div>
        <div class="stat-arrow" aria-hidden="true">→</div>
        <div class="stat-item"><span class="stat-value">{{ funnelStats.applied }}</span><span class="stat-label">已投递</span></div>
        <div class="stat-arrow" aria-hidden="true">→</div>
        <div class="stat-item"><span class="stat-value">{{ funnelStats.interviewing }}</span><span class="stat-label">面试中</span></div>
        <div class="stat-arrow" aria-hidden="true">→</div>
        <div class="stat-item highlight"><span class="stat-value">{{ funnelStats.offer }}</span><span class="stat-label">Offer</span></div>
        <div class="conversion-rate">Offer 占当前漏斗 {{ conversionRate }}%</div>
      </div>
    </header>

    <p v-if="message" class="inline-message" role="status" aria-live="polite">{{ message }}</p>
    <div v-if="loading" class="loading-state">正在恢复求职看板…</div>
    <div v-else-if="error" class="error-state" role="alert">{{ error }}<button @click="loadData">重试</button></div>

    <section v-else-if="totalJobs === 0" class="empty-state">
      <small>NO JOBS YET</small><h2>先放入一个真实岗位</h2><p>手动创建适合单个岗位；已有表格时，用 CSV 先预览、修正，再一次导入。</p>
      <div><button class="primary" @click="openCreate">新增第一个岗位</button><button @click="openImport">粘贴或选择 CSV</button></div>
      <ol class="empty-guide" aria-label="求职管理三步流程">
        <li><span>01</span><div><strong>记录事实</strong><p>公司、岗位、来源和原始链接先入库。</p></div></li>
        <li><span>02</span><div><strong>明确下一步</strong><p>每次只保留一个可执行动作和日期。</p></div></li>
        <li><span>03</span><div><strong>用证据复盘</strong><p>按投递、面试和 Offer 反馈更新技能缺口。</p></div></li>
      </ol>
      <p class="privacy-note">岗位数据只保存在当前本地工作台；除非你主动使用 AI 功能，否则不会发送给模型服务商。</p>
    </section>

    <div v-else class="kanban-board" aria-label="岗位看板">
      <section v-for="column in kanbanColumns" :key="column.status" class="kanban-column" :aria-label="column.title">
        <div class="column-header"><span class="column-title">{{ column.title }}</span><span class="column-count">{{ column.jobs.length }}</span></div>
        <div class="column-content">
          <button v-for="job in column.jobs" :key="job.id" class="job-card" @click="viewJobDetail(job)">
            <span class="job-company">{{ job.company }}</span><strong class="job-title">{{ job.jobTitle }}</strong>
            <span class="job-meta"><span v-if="job.salary" class="salary">{{ job.salary }}</span><span v-if="job.location" class="location">{{ job.location }}</span></span>
            <span v-if="job.nextAction" class="next-action">下一步：{{ job.nextAction }}</span>
            <span v-if="job.matchLevel" class="match-indicator"><span :class="['match-level', job.matchLevel.toLowerCase()]">{{ job.matchLevel === 'HIGH' ? '高匹配' : job.matchLevel === 'MEDIUM' ? '中匹配' : '低匹配' }}</span></span>
          </button>
          <p v-if="column.jobs.length === 0" class="empty-column">当前没有岗位<br><span>从岗位详情推进到这里后会自动出现</span></p>
        </div>
      </section>
    </div>
  </div>

  <BaseDialog :open="createOpen" eyebrow="NEW JOB" title="新增一个真实岗位" description="先填公司、岗位和来源平台；其它信息可以进入详情后再补。" confirm-label="创建岗位" :busy="createSaving" :confirm-disabled="createDisabled" @cancel="createOpen = false" @confirm="submitCreate">
    <div class="job-form">
      <label>公司名称 <input v-model="createForm.company" maxlength="200" autocomplete="organization" placeholder="例如：示例科技"></label>
      <label>岗位名称 <input v-model="createForm.jobTitle" maxlength="200" placeholder="例如：高级前端工程师"></label>
      <label>来源平台 <input v-model="createForm.platform" maxlength="120" placeholder="公司官网、Boss、猎聘……"></label>
      <label>薪资（可选） <input v-model="createForm.salary" maxlength="120" placeholder="例如：30k-45k"></label>
      <label>地点（可选） <input v-model="createForm.location" maxlength="120" placeholder="例如：上海 / 远程"></label>
      <label class="wide">岗位链接（可选） <input v-model="createForm.sourceUrl" type="url" maxlength="2000" placeholder="https://..."></label>
      <label class="wide">备注（可选） <textarea v-model="createForm.notes" maxlength="10000" placeholder="先记录一条需要核实的信息或下一步。"></textarea></label>
    </div>
  </BaseDialog>

  <BaseDialog :open="importOpen" eyebrow="CSV IMPORT" title="先预览，再导入岗位" description="支持英文或常用中文表头；必需列为 company、job_title、platform。单次最多 500 行。" :confirm-label="importConfirmLabel" :busy="importSaving" :confirm-disabled="importConfirmDisabled" @cancel="importOpen = false" @confirm="confirmImport">
    <div class="import-workspace">
      <label class="file-picker">选择 CSV 文件（最大 2 MB）<input type="file" accept=".csv,text/csv" @change="loadCsvFile"></label>
      <label>或粘贴 CSV 文本<textarea v-model="csvText" spellcheck="false" :placeholder="jobCsvSample"></textarea></label>
      <button class="sample-button" type="button" @click="csvText = jobCsvSample">填入格式示例</button>
      <ul v-if="csvErrors.length" class="import-issues error" role="alert"><li v-for="issue in csvErrors" :key="`${issue.row}-${issue.message}`">{{ issue.row ? `第 ${issue.row} 行：` : '' }}{{ issue.message }}</li></ul>
      <ul v-if="csvWarnings.length" class="import-issues"><li v-for="issue in csvWarnings" :key="issue.message">{{ issue.message }}</li></ul>
      <section v-if="importPreview" class="import-preview">
        <header><strong>{{ importPreview.valid }} 行可导入</strong><span v-if="importPreview.invalid">{{ importPreview.invalid }} 行需修正</span><span v-else>全部通过服务端校验</span></header>
        <ul v-if="importPreview.errors.length" class="import-issues error"><li v-for="issue in importPreview.errors" :key="`${issue.row}-${issue.field}`">第 {{ issue.row }} 行 · {{ issue.field }}：{{ issue.message }}</li></ul>
        <table v-if="importPreview.preview.length"><thead><tr><th>公司</th><th>岗位</th><th>平台</th><th>状态</th></tr></thead><tbody><tr v-for="row in importPreview.preview" :key="`${row.company}-${row.jobTitle}`"><td>{{ row.company }}</td><td>{{ row.jobTitle }}</td><td>{{ row.platform }}</td><td>{{ row.status }}</td></tr></tbody></table>
      </section>
    </div>
  </BaseDialog>
</template>

<style src="./JobsPage.styles.css" scoped></style>

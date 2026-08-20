<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { apiClient } from '@/api/client';
import BaseDialog from '@/components/BaseDialog.vue';

const queryClient = useQueryClient();
const backupNote = ref('');
const notice = ref<string | null>(null);
const pendingAction = ref<{ kind: 'RESTORE' | 'DELETE' | 'RESET'; filename?: string } | null>(null);
const actionBusy = ref(false);
const restorePreview = ref<Awaited<ReturnType<typeof apiClient.previewBackupRestore>> | null>(null);
const previewLoadingFilename = ref('');
const exporting = ref(false);
const dialogCopy = computed(() => {
  const action = pendingAction.value;
  if (action?.kind === 'RESTORE') return { title: '确认按预览结果恢复？', description: `已验证 ${action.filename} 的完整性。恢复会先生成回滚文件，完成后需要重启服务。`, confirm: '按此差异恢复', tone: 'primary' as const };
  if (action?.kind === 'DELETE') return { title: '永久删除这份快照？', description: `${action.filename} 删除后无法从系统中恢复。`, confirm: '永久删除', tone: 'danger' as const };
  return { title: '重置全部学习进度？', description: '学习状态、掌握证据和打卡会被清空；原始笔记、AI 整理稿、版本历史、岗位、项目和备份全部保留。', confirm: '重置学习进度', tone: 'danger' as const };
});
const restoreRows = computed(() => {
  const preview = restorePreview.value;
  if (!preview) return [];
  return [
    { label: '知识点', current: preview.currentStats.knowledgePoints, after: preview.metadata.stats.knowledgePoints, difference: preview.differences.knowledgePoints },
    { label: '计划事件', current: preview.currentStats.planEvents, after: preview.metadata.stats.planEvents, difference: preview.differences.planEvents },
    { label: '掌握挑战', current: preview.currentStats.assessments, after: preview.metadata.stats.assessments, difference: preview.differences.assessments },
    { label: '岗位', current: preview.currentStats.jobs, after: preview.metadata.stats.jobs, difference: preview.differences.jobs },
  ];
});

const healthQuery = useQuery({ queryKey: ['system', 'health'], queryFn: apiClient.getHealth });
const aiQuery = useQuery({ queryKey: ['system', 'ai'], queryFn: apiClient.getAIStatus });
const executorQuery = useQuery({ queryKey: ['system', 'executor'], queryFn: apiClient.getExecutorStatus });
const importQuery = useQuery({ queryKey: ['system', 'import'], queryFn: apiClient.getImportStatus });
const backupsQuery = useQuery({ queryKey: ['system', 'backups'], queryFn: apiClient.listBackups });
const aiState = computed(() => {
  if (aiQuery.isPending.value) return { label: '检查中', tone: 'pending' };
  const status = aiQuery.data.value;
  if (!status?.configured) return { label: '未配置', tone: 'warn' };
  if (status.connectionOk === false) return { label: '连接失败', tone: 'bad' };
  return { label: status.connectionOk ? '已连接' : '已配置', tone: 'ok' };
});
const executorWarnings = computed(() => (executorQuery.data.value?.warnings ?? []).map((warning) => ({
  'Executor disabled by configuration': '代码执行器已在当前配置中关闭。',
  'Code execution is disabled for security reasons': '出于安全考虑，系统不会直接执行不受信任的代码。',
  'Assessment will require manual review for code questions': '代码题将使用本地自检，并由人工或 AI 进行语义复核。',
}[warning] ?? warning)));

const importMutation = useMutation({
  mutationFn: apiClient.executeContentImport,
  onSuccess: (result) => {
    notice.value = `同步完成：新增 ${result.importedPoints}，更新 ${result.updatedPoints}，未变化 ${result.skippedPoints}`;
    queryClient.invalidateQueries({ queryKey: ['system', 'import'] });
    queryClient.invalidateQueries({ queryKey: ['knowledge'] });
  },
});

const resetProgressMutation = useMutation({
  mutationFn: () => apiClient.resetLearningProgress(),
  onSuccess: (result) => {
    notice.value = `学习进度已重置：${result.resetKnowledgePoints} 个知识点回到未开始。你的原始笔记、AI 整理稿与版本历史均已保留。`;
    queryClient.invalidateQueries({ queryKey: ['system', 'import'] });
    queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
    queryClient.invalidateQueries({ queryKey: ['today'] });
  },
});

const createBackupMutation = useMutation({
  mutationFn: () => apiClient.createBackup(backupNote.value.trim() || undefined),
  onSuccess: () => {
    backupNote.value = '';
    notice.value = '本地数据库快照已创建';
    queryClient.invalidateQueries({ queryKey: ['system', 'backups'] });
  },
});

async function restore(filename: string) {
  try {
    const result = await apiClient.restoreBackup(filename);
    notice.value = result.message;
  } catch (reason) {
    notice.value = reason instanceof Error ? reason.message : '恢复失败';
  }
}

async function prepareRestore(filename: string) {
  if (previewLoadingFilename.value) return;
  previewLoadingFilename.value = filename;
  notice.value = null;
  try {
    restorePreview.value = await apiClient.previewBackupRestore(filename);
    pendingAction.value = { kind: 'RESTORE', filename };
  } catch (reason) { notice.value = reason instanceof Error ? reason.message : '无法读取恢复预览'; }
  finally { previewLoadingFilename.value = ''; }
}

async function exportPortableData() {
  exporting.value = true;
  try {
    const exported = await apiClient.exportPortableData();
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `career-atlas-export-${exported.exportedAt.slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    notice.value = `可读数据导出完成：${Object.values(exported.counts).reduce((sum, count) => sum + count, 0)} 条记录。`;
  } catch (reason) { notice.value = reason instanceof Error ? reason.message : '数据导出失败'; }
  finally { exporting.value = false; }
}

async function remove(filename: string) {
  try {
    await apiClient.deleteBackup(filename);
    notice.value = '备份已删除';
    await backupsQuery.refetch();
  } catch (reason) {
    notice.value = reason instanceof Error ? reason.message : '删除失败';
  }
}

async function confirmAction() {
  const action = pendingAction.value;
  if (!action) return;
  actionBusy.value = true;
  try {
    if (action.kind === 'RESTORE' && action.filename) await restore(action.filename);
    if (action.kind === 'DELETE' && action.filename) await remove(action.filename);
    if (action.kind === 'RESET') await resetProgressMutation.mutateAsync();
    pendingAction.value = null;
    restorePreview.value = null;
  } finally { actionBusy.value = false; }
}

function cancelPendingAction() {
  pendingAction.value = null;
  restorePreview.value = null;
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
</script>

<template>
  <main class="settings-page">
    <header class="page-header">
      <p class="eyebrow">LOCAL CONTROL ROOM</p>
      <h1>系统与数据</h1>
      <p>首次启动会自动迁移、同步知识并创建数据快照；35 个核心批次只编排真实知识点，不会生成泛化每日任务。这里不会回显任何 API Key。</p>
    </header>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <section>
      <div class="section-heading"><span>01</span><div><h2>运行状态</h2><p>本地服务、AI 连接与代码题复核方式</p></div></div>
      <div class="status-table">
        <div class="status-card" :class="healthQuery.isPending.value ? 'status-pending' : healthQuery.data.value?.db ? 'status-ok' : 'status-bad'"><span>SQLite 数据库</span><strong>{{ healthQuery.isPending.value ? '检查中' : healthQuery.data.value?.db ? '正常' : '异常' }}</strong><small>学习记录与笔记保存在本机</small></div>
        <div class="status-card" :class="healthQuery.isPending.value ? 'status-pending' : healthQuery.data.value?.dataDir ? 'status-ok' : 'status-bad'"><span>本地数据目录</span><strong>{{ healthQuery.isPending.value ? '检查中' : healthQuery.data.value?.dataDir ? '可写' : '异常' }}</strong><small>备份与导出均来自这个目录</small></div>
        <div class="status-card" :class="`status-${aiState.tone}`"><span>DeepSeek</span><strong>{{ aiState.label }}</strong><small>{{ aiQuery.data.value?.model || '尚未选择模型' }}</small></div>
        <div class="status-card" :class="executorQuery.isPending.value ? 'status-pending' : executorQuery.data.value?.available ? 'status-ok' : 'status-warn'"><span>代码题复核</span><strong>{{ executorQuery.isPending.value ? '检查中' : executorQuery.data.value?.available ? executorQuery.data.value.type : '保守复核模式' }}</strong><small>{{ executorQuery.data.value?.available ? '服务端执行器可用' : '本地自检不作为服务端证明' }}</small></div>
      </div>
      <div v-if="executorWarnings.length" class="mode-note"><strong>当前采用保守复核模式</strong><ul><li v-for="warning in executorWarnings" :key="warning">{{ warning }}</li></ul></div>
    </section>

    <section>
      <div class="section-heading"><span>02</span><div><h2>知识内容同步</h2><p>启动时自动增量同步；手动同步用于立即获取刚修改的文档</p></div></div>
      <div class="action-row">
        <div><strong>{{ importQuery.data.value?.pointCount ?? '—' }} 个知识点</strong><p>{{ importQuery.data.value?.domainCount ?? '—' }} 个领域已入库</p></div>
        <button :disabled="importMutation.isPending.value" @click="importMutation.mutate()">{{ importMutation.isPending.value ? '同步中...' : '重新扫描并增量同步' }}</button>
      </div>
    </section>

    <section>
      <div class="section-heading"><span>03</span><div><h2>学习进度重置</h2><p>用于重新开始学习状态；笔记始终保留</p></div></div>
      <div class="action-row reset-row">
        <div><strong>清空进度，但保留全部笔记</strong><p>同步最新知识库并重置学习状态、掌握证据和打卡；不会创建每日任务。</p></div>
        <button class="danger-button" :disabled="resetProgressMutation.isPending.value" @click="pendingAction = { kind: 'RESET' }">{{ resetProgressMutation.isPending.value ? '重置中...' : '重置学习进度' }}</button>
      </div>
    </section>

    <section>
      <div class="section-heading"><span>04</span><div><h2>备份与恢复</h2><p>系统每天自动创建一次一致性快照；你也可以随时留下手动快照</p></div></div>
      <div class="backup-create">
        <input v-model="backupNote" maxlength="120" placeholder="给这份快照加一句备注（可选）" />
        <button :disabled="createBackupMutation.isPending.value" @click="createBackupMutation.mutate()">{{ createBackupMutation.isPending.value ? '创建中...' : '创建本地快照' }}</button>
      </div>
      <div class="portable-export">
        <div><strong>导出可阅读的个人数据</strong><p>生成 JSON，包含学习进度、笔记及版本、挑战记录、打卡、路线选择、岗位、求职活动、技能缺口和项目；不包含 API Key。</p></div>
        <button :disabled="exporting" @click="exportPortableData">{{ exporting ? '正在整理…' : '下载个人数据 JSON' }}</button>
      </div>
      <div v-if="backupsQuery.data.value?.length" class="backup-list">
        <article v-for="backup in backupsQuery.data.value" :key="backup.filename">
          <div><strong>{{ new Date(backup.createdAt).toLocaleString('zh-CN') }}</strong><p>{{ backup.note || backup.filename }}</p></div>
          <div class="backup-stats"><span>{{ formatSize(backup.size) }}</span><span>{{ backup.stats.knowledgePoints }} 知识点</span><span>{{ backup.stats.assessments }} 考核</span></div>
          <div class="backup-actions"><button :aria-busy="previewLoadingFilename === backup.filename" @click="prepareRestore(backup.filename)">{{ previewLoadingFilename === backup.filename ? '检查中…' : '预览恢复' }}</button><button class="danger" @click="pendingAction = { kind: 'DELETE', filename: backup.filename }">删除</button></div>
        </article>
      </div>
      <p v-else class="empty">还没有本地快照。</p>
    </section>
  </main>
  <BaseDialog
    :open="Boolean(pendingAction)"
    :title="dialogCopy.title"
    :description="dialogCopy.description"
    :confirm-label="dialogCopy.confirm"
    :tone="dialogCopy.tone"
    :busy="actionBusy"
    @cancel="cancelPendingAction"
    @confirm="confirmAction"
  >
    <div v-if="pendingAction?.kind === 'RESTORE' && restorePreview" class="restore-preview">
      <div class="restore-grid">
        <span>数据类别</span><b>当前</b><b>恢复后</b><b>变化</b>
        <template v-for="row in restoreRows" :key="row.label">
          <span>{{ row.label }}</span><b>{{ row.current }}</b><b>{{ row.after }}</b><b :class="row.difference < 0 ? 'negative' : 'positive'">{{ row.difference > 0 ? '+' : '' }}{{ row.difference }}</b>
        </template>
      </div>
      <ul v-if="restorePreview.warnings.length" class="restore-warnings"><li v-for="warning in restorePreview.warnings" :key="warning">{{ warning }}</li></ul>
      <p v-else class="restore-safe">未发现按数量计算的数据减少；仍建议保留系统自动创建的回滚文件。</p>
    </div>
  </BaseDialog>
</template>

<style scoped>
.settings-page{max-width:1120px;margin:0 auto}.page-header{padding:.5rem 0 2rem}.eyebrow{margin:0;color:var(--color-primary);font:750 .72rem var(--font-mono);letter-spacing:.16em}.page-header h1{margin:.25rem 0 .5rem;font-size:clamp(2.4rem,5vw,4.6rem);line-height:1;letter-spacing:-.06em}.page-header>p:last-child{max-width:720px;margin:0;color:var(--color-text-secondary)}.notice{margin:0 0 1rem;padding:.8rem 1rem;color:var(--color-success-strong);background:var(--color-success-soft);border:1px solid var(--color-success-border);border-radius:12px}.settings-page section{margin-bottom:1rem;padding:1.35rem;background:var(--color-surface);border:1px solid var(--color-border);border-radius:18px;box-shadow:var(--shadow-xs)}.section-heading{display:grid;grid-template-columns:2.5rem 1fr;gap:.7rem;margin-bottom:1.2rem}.section-heading>span{display:grid;place-items:center;width:2rem;height:2rem;color:var(--color-primary);font:750 .68rem var(--font-mono);background:var(--color-primary-soft);border-radius:9px}.section-heading h2,.section-heading p{margin:0}.section-heading h2{font-size:1.12rem}.section-heading p{margin-top:.15rem;color:var(--color-text-tertiary);font-size:.76rem}.status-table{display:grid;grid-template-columns:repeat(2,1fr);gap:.6rem;margin-left:3.2rem}.status-table>div{display:grid;grid-template-columns:1fr auto;gap:.6rem;align-items:center;padding:.8rem;background:var(--color-surface-raised);border:1px solid var(--color-border-subtle);border-radius:11px}.status-table>div span{font-size:.78rem}.status-table strong{font:700 .72rem var(--font-mono)}.status-table small{grid-column:1/-1;color:var(--color-text-tertiary);font:.62rem var(--font-mono)}.status-card{position:relative;overflow:hidden}.status-card::after{position:absolute;top:12px;right:12px;width:7px;height:7px;content:'';background:var(--color-text-tertiary);border-radius:50%;box-shadow:0 0 0 5px rgba(137,149,164,.1)}.status-card.status-ok strong{color:var(--color-success)}.status-card.status-ok::after{background:var(--color-success);box-shadow:0 0 0 5px rgba(47,138,106,.1)}.status-card.status-warn strong{color:var(--color-warning)}.status-card.status-warn::after{background:var(--color-warning);box-shadow:0 0 0 5px rgba(198,138,45,.1)}.status-card.status-bad strong{color:var(--color-danger)}.status-card.status-bad::after{background:var(--color-danger);box-shadow:0 0 0 5px rgba(196,80,82,.1)}.status-card.status-pending strong{color:var(--color-text-tertiary)}.ok{color:var(--color-success)}.warn{color:var(--color-warning)}.bad,.danger{color:var(--color-danger)}.mode-note{display:grid;grid-template-columns:auto 1fr;gap:14px;margin:.85rem 0 0 3.2rem;padding:12px 14px;color:#6f582c;background:#fff8e9;border:1px solid #efe0b9;border-radius:11px}.mode-note strong{font-size:.76rem;white-space:nowrap}.mode-note ul{margin:0;padding-left:18px;font-size:.74rem;line-height:1.65}.action-row,.backup-create{display:flex;justify-content:space-between;gap:1rem;align-items:center;margin-left:3.2rem}.action-row p{margin:.15rem 0 0;color:var(--color-text-tertiary);font-size:.76rem}.settings-page button{min-height:40px;padding:0 .9rem;color:var(--color-text);font-weight:650;background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:10px;cursor:pointer}.settings-page button:hover{border-color:var(--color-primary)}.settings-page button:disabled{opacity:.5;cursor:wait}.danger-button{color:var(--color-danger)!important;border-color:var(--color-danger)!important}.danger-button:hover{background:color-mix(in srgb,var(--color-danger) 8%,transparent)}.backup-create input{flex:1;min-height:42px;padding:0 .8rem;background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:10px}.backup-list{display:grid;gap:.6rem;margin:1rem 0 0 3.2rem}.backup-list article{display:grid;grid-template-columns:1fr auto auto;gap:1rem;align-items:center;padding:.9rem;background:var(--color-surface-raised);border:1px solid var(--color-border-subtle);border-radius:12px}.backup-list p{margin:.2rem 0 0;color:var(--color-text-tertiary);font-size:.7rem}.backup-stats{display:flex;gap:.7rem;color:var(--color-text-secondary);font:.65rem var(--font-mono)}.backup-actions{display:flex;gap:.4rem}.empty{margin-left:3.2rem;color:var(--color-text-tertiary)}@media(max-width:760px){.status-table{grid-template-columns:1fr}.status-table,.action-row,.backup-create,.backup-list,.empty,.mode-note{margin-left:0}.mode-note{grid-template-columns:1fr}.action-row,.backup-create{align-items:stretch;flex-direction:column}.backup-list article{grid-template-columns:1fr}.backup-stats{flex-wrap:wrap}}
.settings-page{width:100%;max-width:1480px}.page-header{padding:4px 2px 22px}.settings-page section{padding:1.5rem;border-color:#dfe5ed;box-shadow:0 9px 28px rgba(25,48,78,.055)}.status-table{grid-template-columns:repeat(4,1fr)}.status-table>div{min-height:88px;background:linear-gradient(145deg,#f9fbfe,#f5f8fc)}
.portable-export{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:14px 0 0 3.2rem;padding:13px 15px;background:#f5f8fc;border:1px solid #e0e7ef;border-radius:12px}.portable-export p{max-width:760px;margin:4px 0 0;color:var(--color-text-tertiary);font-size:.74rem;line-height:1.55}.restore-preview{display:grid;gap:12px}.restore-grid{display:grid;grid-template-columns:1fr repeat(3,auto);gap:7px 14px;align-items:center;padding:12px;background:#f5f8fc;border-radius:11px;font-size:.76rem}.restore-grid>span:first-child,.restore-grid>b:nth-child(-n+4){color:#6c7a8d;font-size:.68rem}.restore-grid b{text-align:right}.restore-grid .negative{color:#a53732}.restore-grid .positive{color:#247047}.restore-warnings{margin:0;padding:10px 12px 10px 28px;color:#8e342d;background:#fff0ee;border-radius:10px;font-size:.76rem;line-height:1.6}.restore-safe{margin:0;padding:10px 12px;color:#247047;background:#edf8f1;border-radius:10px;font-size:.76rem}
@media(max-width:1180px){.status-table{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){.status-table{grid-template-columns:1fr}.portable-export{align-items:stretch;flex-direction:column;margin-left:0}.restore-grid{grid-template-columns:1fr repeat(3,minmax(42px,auto));gap:6px}}
</style>

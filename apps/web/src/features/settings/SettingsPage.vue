<script setup lang="ts">
import { ref } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { apiClient } from '@/api/client';

const queryClient = useQueryClient();
const backupNote = ref('');
const notice = ref<string | null>(null);

const healthQuery = useQuery({ queryKey: ['system', 'health'], queryFn: apiClient.getHealth });
const aiQuery = useQuery({ queryKey: ['system', 'ai'], queryFn: apiClient.getAIStatus });
const executorQuery = useQuery({ queryKey: ['system', 'executor'], queryFn: apiClient.getExecutorStatus });
const importQuery = useQuery({ queryKey: ['system', 'import'], queryFn: apiClient.getImportStatus });
const backupsQuery = useQuery({ queryKey: ['system', 'backups'], queryFn: apiClient.listBackups });

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
    notice.value = `学习进度已重置：${result.resetKnowledgePoints} 个知识点回到未开始，已按 ${result.startDate} 重新生成 ${result.importedPlanEvents} 条计划`;
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
  if (!window.confirm(`恢复 ${filename}？当前数据会先保留为回滚文件，并需要重启服务。`)) return;
  try {
    const result = await apiClient.restoreBackup(filename);
    notice.value = result.message;
  } catch (reason) {
    notice.value = reason instanceof Error ? reason.message : '恢复失败';
  }
}

async function remove(filename: string) {
  if (!window.confirm(`永久删除备份 ${filename}？`)) return;
  try {
    await apiClient.deleteBackup(filename);
    notice.value = '备份已删除';
    await backupsQuery.refetch();
  } catch (reason) {
    notice.value = reason instanceof Error ? reason.message : '删除失败';
  }
}

function resetLearningProgress() {
  if (!window.confirm('重置学习进度？这会清空知识掌握状态、考核记录、打卡、复盘、请假和模板学习计划，并从北京时间今天开始按最新版 48 周模板重新生成计划。岗位、项目和备份会保留。')) return;
  resetProgressMutation.mutate();
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
      <p>首次启动会自动迁移、同步知识、生成每周 7 天的 48 周学习计划并创建每日快照。这里不会回显任何 API Key。</p>
    </header>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <section>
      <div class="section-heading"><span>01</span><div><h2>运行状态</h2><p>服务、DeepSeek 与代码执行沙箱</p></div></div>
      <div class="status-table">
        <div><span>SQLite 数据库</span><strong :class="healthQuery.data.value?.db ? 'ok' : 'bad'">{{ healthQuery.data.value?.db ? '正常' : '异常' }}</strong></div>
        <div><span>本地数据目录</span><strong :class="healthQuery.data.value?.dataDir ? 'ok' : 'bad'">{{ healthQuery.data.value?.dataDir ? '可写' : '异常' }}</strong></div>
        <div><span>DeepSeek</span><strong :class="aiQuery.data.value?.configured ? 'ok' : 'warn'">{{ aiQuery.data.value?.configured ? (aiQuery.data.value.connectionOk === false ? '已配置 / 连接失败' : '已配置') : '未配置' }}</strong><small>{{ aiQuery.data.value?.model }}</small></div>
        <div><span>代码执行器</span><strong :class="executorQuery.data.value?.available ? 'ok' : 'warn'">{{ executorQuery.data.value?.available ? executorQuery.data.value.type : '人工复核模式' }}</strong></div>
      </div>
      <ul v-if="executorQuery.data.value?.warnings.length" class="warnings"><li v-for="warning in executorQuery.data.value.warnings" :key="warning">{{ warning }}</li></ul>
    </section>

    <section>
      <div class="section-heading"><span>02</span><div><h2>知识内容同步</h2><p>启动时自动增量同步；手动同步用于立即获取刚修改的文档</p></div></div>
      <div class="action-row">
        <div><strong>{{ importQuery.data.value?.pointCount ?? '—' }} 个知识点</strong><p>{{ importQuery.data.value?.domainCount ?? '—' }} 个领域已入库</p></div>
        <button :disabled="importMutation.isPending.value" @click="importMutation.mutate()">{{ importMutation.isPending.value ? '同步中...' : '重新扫描并增量同步' }}</button>
      </div>
    </section>

    <section>
      <div class="section-heading"><span>03</span><div><h2>学习进度重置</h2><p>用于知识体系大改后重新开始；从北京时间今天重排计划</p></div></div>
      <div class="action-row reset-row">
        <div><strong>清空进度并重建计划</strong><p>同步最新知识库，重置掌握状态和考核证据，从今天重新生成 48 周学习日历。</p></div>
        <button class="danger-button" :disabled="resetProgressMutation.isPending.value" @click="resetLearningProgress">{{ resetProgressMutation.isPending.value ? '重置中...' : '重置学习进度' }}</button>
      </div>
    </section>

    <section>
      <div class="section-heading"><span>04</span><div><h2>备份与恢复</h2><p>系统每天自动创建一次一致性快照；你也可以随时留下手动快照</p></div></div>
      <div class="backup-create">
        <input v-model="backupNote" maxlength="120" placeholder="给这份快照加一句备注（可选）" />
        <button :disabled="createBackupMutation.isPending.value" @click="createBackupMutation.mutate()">{{ createBackupMutation.isPending.value ? '创建中...' : '创建本地快照' }}</button>
      </div>
      <div v-if="backupsQuery.data.value?.length" class="backup-list">
        <article v-for="backup in backupsQuery.data.value" :key="backup.filename">
          <div><strong>{{ new Date(backup.createdAt).toLocaleString('zh-CN') }}</strong><p>{{ backup.note || backup.filename }}</p></div>
          <div class="backup-stats"><span>{{ formatSize(backup.size) }}</span><span>{{ backup.stats.knowledgePoints }} 知识点</span><span>{{ backup.stats.assessments }} 考核</span></div>
          <div class="backup-actions"><button @click="restore(backup.filename)">恢复</button><button class="danger" @click="remove(backup.filename)">删除</button></div>
        </article>
      </div>
      <p v-else class="empty">还没有本地快照。</p>
    </section>
  </main>
</template>

<style scoped>
.settings-page{max-width:1120px;margin:0 auto}.page-header{padding:.5rem 0 2rem}.eyebrow{margin:0;color:var(--color-primary);font:750 .72rem var(--font-mono);letter-spacing:.16em}.page-header h1{margin:.25rem 0 .5rem;font-size:clamp(2.4rem,5vw,4.6rem);line-height:1;letter-spacing:-.06em}.page-header>p:last-child{max-width:720px;margin:0;color:var(--color-text-secondary)}.notice{margin:0 0 1rem;padding:.8rem 1rem;color:var(--color-success-strong);background:var(--color-success-soft);border:1px solid var(--color-success-border);border-radius:12px}.settings-page section{margin-bottom:1rem;padding:1.35rem;background:var(--color-surface);border:1px solid var(--color-border);border-radius:18px;box-shadow:var(--shadow-xs)}.section-heading{display:grid;grid-template-columns:2.5rem 1fr;gap:.7rem;margin-bottom:1.2rem}.section-heading>span{display:grid;place-items:center;width:2rem;height:2rem;color:var(--color-primary);font:750 .68rem var(--font-mono);background:var(--color-primary-soft);border-radius:9px}.section-heading h2,.section-heading p{margin:0}.section-heading h2{font-size:1.12rem}.section-heading p{margin-top:.15rem;color:var(--color-text-tertiary);font-size:.76rem}.status-table{display:grid;grid-template-columns:repeat(2,1fr);gap:.6rem;margin-left:3.2rem}.status-table>div{display:grid;grid-template-columns:1fr auto;gap:.6rem;align-items:center;padding:.8rem;background:var(--color-surface-raised);border:1px solid var(--color-border-subtle);border-radius:11px}.status-table>div span{font-size:.78rem}.status-table strong{font:700 .72rem var(--font-mono)}.status-table small{grid-column:1/-1;color:var(--color-text-tertiary);font:.62rem var(--font-mono)}.ok{color:var(--color-success)}.warn{color:var(--color-warning)}.bad,.danger{color:var(--color-danger)}.warnings{margin:.8rem 0 0 3.2rem;color:#8a682e;font-size:.76rem}.action-row,.backup-create{display:flex;justify-content:space-between;gap:1rem;align-items:center;margin-left:3.2rem}.action-row p{margin:.15rem 0 0;color:var(--color-text-tertiary);font-size:.76rem}.settings-page button{min-height:40px;padding:0 .9rem;color:var(--color-text);font-weight:650;background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:10px;cursor:pointer}.settings-page button:hover{border-color:var(--color-primary)}.settings-page button:disabled{opacity:.5;cursor:wait}.danger-button{color:var(--color-danger)!important;border-color:var(--color-danger)!important}.danger-button:hover{background:color-mix(in srgb,var(--color-danger) 8%,transparent)}.backup-create input{flex:1;min-height:42px;padding:0 .8rem;background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:10px}.backup-list{display:grid;gap:.6rem;margin:1rem 0 0 3.2rem}.backup-list article{display:grid;grid-template-columns:1fr auto auto;gap:1rem;align-items:center;padding:.9rem;background:var(--color-surface-raised);border:1px solid var(--color-border-subtle);border-radius:12px}.backup-list p{margin:.2rem 0 0;color:var(--color-text-tertiary);font-size:.7rem}.backup-stats{display:flex;gap:.7rem;color:var(--color-text-secondary);font:.65rem var(--font-mono)}.backup-actions{display:flex;gap:.4rem}.empty{margin-left:3.2rem;color:var(--color-text-tertiary)}@media(max-width:760px){.status-table{grid-template-columns:1fr}.status-table,.action-row,.backup-create,.backup-list,.empty,.warnings{margin-left:0}.action-row,.backup-create{align-items:stretch;flex-direction:column}.backup-list article{grid-template-columns:1fr}.backup-stats{flex-wrap:wrap}}
</style>

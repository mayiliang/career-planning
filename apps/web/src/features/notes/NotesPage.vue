<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { apiClient, type KnowledgeNote } from '@/api/client';
import { renderMarkdown } from '@/utils/markdown';

const router = useRouter();
const notes = ref<KnowledgeNote[]>([]);
const selected = ref<KnowledgeNote | null>(null);
const search = ref('');
const loading = ref(true);
const error = ref('');
const view = ref<'active' | 'original' | 'organized'>('active');
let timer: number | undefined;

const grouped = computed(() => {
  const map = new Map<string, KnowledgeNote[]>();
  for (const note of notes.value) {
    const key = `${note.domainCode ?? '—'} · ${note.domainTitle ?? '未分类'}`;
    map.set(key, [...(map.get(key) ?? []), note]);
  }
  return [...map.entries()];
});
const displayedMd = computed(() => {
  if (!selected.value) return '';
  if (view.value === 'original') return selected.value.originalMd;
  if (view.value === 'organized') return selected.value.organizedMd ?? selected.value.originalMd;
  return selected.value.activeMd;
});

async function load() {
  loading.value = true;
  try {
    notes.value = await apiClient.listNotes({ search: search.value || undefined });
    if (selected.value) selected.value = notes.value.find((item) => item.id === selected.value?.id) ?? notes.value[0] ?? null;
    else selected.value = notes.value[0] ?? null;
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '笔记加载失败'; }
  finally { loading.value = false; }
}

function choose(note: KnowledgeNote) { selected.value = note; view.value = 'active'; }
watch(search, () => { window.clearTimeout(timer); timer = window.setTimeout(load, 250); });
onMounted(load);
</script>

<template>
  <div class="notes-page">
    <header class="notes-header"><div><p>KNOWLEDGE NOTES</p><h1>笔记中心</h1><span>知识点里写下的内容会自动同步到这里，并按知识体系归档。</span></div><button @click="router.push('/knowledge/map')">打开知识体系</button></header>
    <div class="notes-shell">
      <aside class="notes-index">
        <label><span>搜索标题、编号或正文</span><input v-model="search" placeholder="例如：ES Modules"></label>
        <div v-if="loading" class="empty">正在读取笔记…</div>
        <template v-else-if="grouped.length">
          <section v-for="[domain, items] in grouped" :key="domain"><h2>{{ domain }} <span>{{ items.length }}</span></h2><button v-for="item in items" :key="item.id" :class="{ active: selected?.id === item.id }" @click="choose(item)"><code>{{ item.knowledgePointCode }}</code><strong>{{ item.pointTitle }}</strong><small>{{ new Date(item.updatedAt).toLocaleString('zh-CN') }}</small></button></section>
        </template>
        <div v-else class="empty">还没有笔记。进入任意知识点写下第一条，保存后会自动出现在这里。</div>
      </aside>

      <main v-if="selected" class="note-reader">
        <header><div><small>{{ selected.domainCode }} · {{ selected.domainTitle }}</small><h2>{{ selected.knowledgePointCode }} · {{ selected.pointTitle }}</h2><p>{{ selected.versions.length }} 个最近版本 · 当前阅读版本：{{ selected.activeVersionSource === 'ORGANIZED' ? 'AI 整理稿' : '原始笔记' }}</p></div><button @click="router.push(`/knowledge/${selected.knowledgePointCode}`)">回到知识点编辑 →</button></header>
        <nav><button :class="{ active: view === 'active' }" @click="view = 'active'">当前阅读版</button><button :class="{ active: view === 'original' }" @click="view = 'original'">原始笔记</button><button :disabled="!selected.organizedMd" :class="{ active: view === 'organized' }" @click="view = 'organized'">AI 整理稿</button></nav>
        <article class="markdown" v-html="renderMarkdown(displayedMd)"></article>
        <section v-if="selected.aiReview" class="review"><h3>AI 核对记录</h3><p v-for="item in selected.aiReview.corrections" :key="item"><b>纠正</b>{{ item }}</p><p v-for="item in selected.aiReview.additions" :key="item"><b>补充</b>{{ item }}</p><p v-for="item in selected.aiReview.uncertainItems" :key="item"><b>待确认</b>{{ item }}</p></section>
        <details><summary>查看版本历史</summary><ol><li v-for="version in selected.versions" :key="version.id"><code>v{{ version.versionNo }}</code><strong>{{ { USER: '用户保存', MIGRATED: '旧版迁移', AI_DRAFT: 'AI 候选稿', AI_ACCEPTED: '用户采用 AI 稿' }[version.source] ?? version.source }}</strong><span>{{ version.changeSummary }}</span><time>{{ new Date(version.createdAt).toLocaleString('zh-CN') }}</time></li></ol></details>
      </main>
      <main v-else class="note-reader empty-reader"><div><strong>选择一条笔记阅读</strong><p>原文、AI 整理稿和版本历史会并排保留。</p></div></main>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.notes-page{max-width:1380px;margin:0 auto;padding:26px}.notes-header{display:flex;align-items:end;justify-content:space-between;margin-bottom:18px}.notes-header p{font:700 .68rem ui-monospace;color:#596fa1;letter-spacing:.13em}.notes-header h1{font-size:clamp(2rem,4vw,3rem);margin:4px 0}.notes-header span{color:#6a7483}.notes-page button{border:1px solid #ccd4df;background:#fff;border-radius:9px;padding:9px 12px;cursor:pointer;color:inherit}.notes-shell{display:grid;grid-template-columns:350px 1fr;min-height:690px;border:1px solid #dce1e8;border-radius:18px;overflow:hidden;background:#fff}.notes-index{background:#f5f7fa;border-right:1px solid #dce1e8;padding:17px;overflow:auto;max-height:calc(100vh - 155px)}.notes-index label span{display:block;font-size:.7rem;color:#6d7785;margin-bottom:6px}.notes-index input{width:100%;box-sizing:border-box;padding:11px;border:1px solid #ccd4df;border-radius:9px;font:inherit}.notes-index section h2{font-size:.76rem;margin:20px 5px 7px;color:#536078}.notes-index section h2 span{float:right}.notes-index section button{width:100%;border:0;background:transparent;text-align:left;display:grid;grid-template-columns:68px 1fr;padding:10px 8px}.notes-index section button.active{background:#fff;box-shadow:0 2px 10px #1c294214}.notes-index code{color:#3d58a2}.notes-index strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.notes-index small{grid-column:2;color:#88909b;margin-top:4px}.note-reader{padding:28px;overflow:auto;max-height:calc(100vh - 155px)}.note-reader>header{display:flex;justify-content:space-between;gap:15px;border-bottom:1px solid #e1e5eb;padding-bottom:18px}.note-reader>header small{color:#65718a}.note-reader>header h2{font-size:1.7rem;margin:5px 0}.note-reader>header p{margin:0;color:#7b8490}.note-reader nav{display:flex;gap:7px;margin:18px 0}.note-reader nav button.active{background:#1d2a43;color:#fff}.note-reader nav button:disabled{opacity:.4}.markdown{line-height:1.75;max-width:900px;overflow-wrap:anywhere}.review{border:1px solid #dce5ff;background:#f4f7ff;border-radius:12px;padding:15px;margin-top:20px}.review h3{margin-top:0}.review p{display:flex;gap:9px}.review b{color:#3a57a5}details{margin-top:22px;border-top:1px solid #e0e5eb;padding-top:14px}summary{cursor:pointer;font-weight:700}details ol{padding:0;list-style:none}details li{display:grid;grid-template-columns:50px 110px 1fr auto;gap:8px;border-bottom:1px solid #edf0f3;padding:9px 0;font-size:.78rem}details li span{color:#6e7887}details time{color:#89919c}.empty{padding:18px;color:#737d8b;line-height:1.65}.empty-reader{display:grid;place-items:center;text-align:center;color:#6f7987}.error{background:#fff0ee;color:#992f27;padding:10px;border-radius:9px}@media(max-width:850px){.notes-page{padding:13px}.notes-header{align-items:flex-start;flex-direction:column;gap:12px}.notes-shell{grid-template-columns:1fr}.notes-index{border-right:0;border-bottom:1px solid #dce1e8;max-height:320px}.note-reader{max-height:none;padding:18px}.note-reader>header{flex-direction:column}details li{grid-template-columns:45px 1fr}details li span,details time{grid-column:2}}
</style>

<style scoped>
.notes-page{width:100%;max-width:1600px;padding:0}.notes-header{padding:4px 2px 10px}.notes-shell{grid-template-columns:390px 1fr;min-height:calc(100vh - 145px);border-color:#dbe3ec;border-radius:22px;box-shadow:0 18px 50px rgba(24,48,79,.09)}.notes-index{background:linear-gradient(180deg,#f6f9fc,#f2f6fa)}.notes-index section button.active{border:1px solid #dfe7f0;box-shadow:0 7px 22px rgba(27,54,88,.08)}.note-reader{padding:32px 36px}.note-reader>header{padding-bottom:21px}.note-reader nav{padding:5px;background:#f1f5f9;border:1px solid #e0e6ed;border-radius:13px;width:max-content}.note-reader nav button{border:0;background:transparent}.note-reader nav button.active{background:linear-gradient(135deg,#1c3556,#285e88);box-shadow:0 6px 16px rgba(30,69,108,.18)}
@media(max-width:850px){.notes-page{padding:0}.notes-shell{grid-template-columns:1fr}.note-reader{padding:20px}}
</style>

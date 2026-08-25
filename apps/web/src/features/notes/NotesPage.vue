<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { apiClient, type KnowledgeNote, type NoteSortMode } from '@/api/client';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';

const router = useRouter();
const notes = ref<KnowledgeNote[]>([]);
const selected = ref<KnowledgeNote | null>(null);
const search = ref('');
const loading = ref(true);
const error = ref('');
const view = ref<'active' | 'original' | 'organized'>('active');
const sortMode = ref<NoteSortMode>('knowledge');
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
const libraryStats = computed(() => ({
  total: notes.value.length,
  organized: notes.value.filter((note) => Boolean(note.organizedMd)).length,
  versions: notes.value.reduce((sum, note) => sum + note.versions.length, 0),
}));
const currentViewLabel = computed(() => ({
  active: '当前阅读版',
  original: '原始笔记',
  organized: 'AI 整理稿',
})[view.value]);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    notes.value = await apiClient.listNotes({ search: search.value || undefined, sort: sortMode.value });
    if (selected.value) selected.value = notes.value.find((item) => item.id === selected.value?.id) ?? notes.value[0] ?? null;
    else selected.value = notes.value[0] ?? null;
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '笔记加载失败'; }
  finally { loading.value = false; }
}

function choose(note: KnowledgeNote) { selected.value = note; view.value = 'active'; }
function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
watch(search, () => { window.clearTimeout(timer); timer = window.setTimeout(load, 250); });
watch(sortMode, () => {
  try { window.localStorage.setItem('career-atlas-note-sort', sortMode.value); } catch { /* 排序偏好不可用不影响笔记 */ }
  void load();
});
onMounted(() => {
  let saved: string | null = null;
  try { saved = window.localStorage.getItem('career-atlas-note-sort'); } catch { /* 使用默认排序 */ }
  if (['knowledge', 'updated_desc', 'updated_asc', 'title_asc', 'code_asc'].includes(saved ?? '') && saved !== sortMode.value) sortMode.value = saved as NoteSortMode;
  else void load();
});
onBeforeUnmount(() => window.clearTimeout(timer));
</script>

<template>
  <div class="notes-page">
    <header class="notes-header">
      <div class="notes-heading"><p>KNOWLEDGE NOTEBOOK</p><h1>把零散记录，沉淀成自己的工程手册</h1><span>知识点里保存的 Markdown 会自动归档。原文、AI 整理稿与版本历史彼此独立，任何整理都不会悄悄覆盖你的表达。</span></div>
      <dl aria-label="笔记库概览">
        <div><dt>已归档</dt><dd>{{ libraryStats.total }}<small>篇笔记</small></dd></div>
        <div><dt>已整理</dt><dd>{{ libraryStats.organized }}<small>篇 AI 稿</small></dd></div>
        <div><dt>可追溯</dt><dd>{{ libraryStats.versions }}<small>个版本</small></dd></div>
      </dl>
      <button type="button" @click="router.push('/knowledge/map')">打开知识体系 <span>→</span></button>
    </header>
    <div class="notes-shell">
      <aside class="notes-index">
        <header><div><small>NOTE INDEX</small><strong>笔记索引</strong></div><span>{{ notes.length }} 篇</span></header>
        <div class="index-tools"><label><span>搜索标题、编号或正文</span><div class="search-field"><i aria-hidden="true">⌕</i><input v-model="search" type="search" placeholder="例如：ES Modules"></div></label><label><span>笔记排序</span><select v-model="sortMode" aria-label="笔记排序"><option value="knowledge">知识体系顺序（默认）</option><option value="updated_desc">最近修改优先</option><option value="updated_asc">最早修改优先</option><option value="title_asc">标题拼音顺序</option><option value="code_asc">知识点编号顺序</option></select></label></div>
        <div v-if="loading" class="empty">正在读取笔记…</div>
        <template v-else-if="grouped.length">
          <section v-for="[domain, items] in grouped" :key="domain"><h2>{{ domain }} <span>{{ items.length }}</span></h2><button v-for="item in items" :key="item.id" type="button" :class="{ active: selected?.id === item.id }" :aria-current="selected?.id === item.id ? 'true' : undefined" @click="choose(item)"><code>{{ item.knowledgePointCode }}</code><strong>{{ item.pointTitle }}</strong><small>{{ sortMode === 'knowledge' ? `体系序号 ${item.routeOrder + 1}` : formatDate(item.updatedAt) }}</small><i v-if="item.organizedMd" title="已有 AI 整理稿">AI</i></button></section>
        </template>
        <div v-else class="empty"><strong>还没有匹配的笔记</strong><span>{{ search ? '换一个关键词，或清空搜索重新查看。' : '进入任意知识点写下第一条，保存后会自动归档到这里。' }}</span></div>
      </aside>

      <main v-if="selected" class="note-reader">
        <header><div><small>{{ selected.domainCode }} · {{ selected.domainTitle }}</small><h2>{{ selected.knowledgePointCode }} · {{ selected.pointTitle }}</h2><p>最近更新于 {{ formatDate(selected.updatedAt) }} · 共保留 {{ selected.versions.length }} 个版本</p></div><button type="button" @click="router.push(`/knowledge/${selected.knowledgePointCode}`)">回到知识点编辑 <span>→</span></button></header>
        <div class="reader-toolbar"><nav aria-label="笔记阅读版本"><button type="button" :aria-pressed="view === 'active'" :class="{ active: view === 'active' }" @click="view = 'active'">当前阅读版</button><button type="button" :aria-pressed="view === 'original'" :class="{ active: view === 'original' }" @click="view = 'original'">原始笔记</button><button type="button" :disabled="!selected.organizedMd" :aria-pressed="view === 'organized'" :class="{ active: view === 'organized' }" @click="view = 'organized'">AI 整理稿</button></nav><span>正在阅读：<strong>{{ currentViewLabel }}</strong></span></div>
        <article class="note-paper"><div class="paper-meta"><span>{{ selected.knowledgePointCode }}</span><i></i><span>PERSONAL ENGINEERING NOTE</span></div><MarkdownRenderer class="markdown" :source="displayedMd" aria-label="笔记内容" /></article>
        <section v-if="selected.aiReview" class="review"><header><div><small>AI REVIEW</small><h3>AI 核对记录</h3></div><span>建议，不是自动改写</span></header><p v-for="item in selected.aiReview.corrections" :key="item"><b data-kind="fix">纠正</b>{{ item }}</p><p v-for="item in selected.aiReview.additions" :key="item"><b data-kind="add">补充</b>{{ item }}</p><p v-for="item in selected.aiReview.uncertainItems" :key="item"><b data-kind="check">待确认</b>{{ item }}</p></section>
        <details><summary><span><small>VERSION HISTORY</small><strong>查看版本历史</strong></span><b>{{ selected.versions.length }} 个版本</b></summary><ol><li v-for="version in selected.versions" :key="version.id"><code>v{{ version.versionNo }}</code><strong>{{ { USER: '用户保存', MIGRATED: '旧版迁移', AI_DRAFT: 'AI 候选稿', AI_ACCEPTED: '用户采用 AI 稿' }[version.source] ?? version.source }}</strong><span>{{ version.changeSummary }}</span><time>{{ formatDate(version.createdAt) }}</time></li></ol></details>
      </main>
      <main v-else class="note-reader empty-reader"><div><span>✦</span><strong>选择一条笔记开始阅读</strong><p>原文、AI 整理稿与版本历史会分别保留，你始终知道每一段内容来自哪里。</p></div></main>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.notes-page{--note-ink:#1b3029;--note-muted:#687970;--note-green:#176a55;--note-green-soft:#edf6f2;--note-clay:#bf603f;width:100%;max-width:1660px;margin:0 auto}.notes-page button{font:inherit}.notes-header{position:relative;display:grid;grid-template-columns:minmax(0,1.5fr) auto auto;gap:28px;align-items:end;overflow:hidden;margin-bottom:14px;padding:28px 30px;color:#eff8f4;background:linear-gradient(125deg,#142f2a 0%,#183c34 64%,#294b42 100%);border:1px solid #24483f;border-radius:22px;box-shadow:0 18px 48px rgba(18,47,39,.15)}.notes-header::after{position:absolute;right:-90px;bottom:-135px;width:360px;height:360px;content:'';background:radial-gradient(circle,rgba(221,126,87,.22),transparent 68%);pointer-events:none}.notes-header>*{position:relative;z-index:1}.notes-heading p{margin:0;color:#87c8b2;font:800 .64rem var(--font-mono);letter-spacing:.13em}.notes-heading h1{max-width:720px;margin:6px 0 8px;font-size:clamp(1.75rem,3vw,2.8rem);line-height:1.12;letter-spacing:-.045em}.notes-heading span{display:block;max-width:720px;color:#b8ccc5;font-size:.78rem;line-height:1.7}.notes-header dl{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin:0;overflow:hidden;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.1);border-radius:13px}.notes-header dl div{min-width:92px;padding:11px 13px;background:rgba(255,255,255,.055)}.notes-header dt{color:#91aaa1;font-size:.6rem}.notes-header dd{margin:2px 0 0;font:750 1.25rem var(--font-mono)}.notes-header dd small{margin-left:4px;color:#a7bbb4;font:.56rem var(--font-body)}.notes-header>button,.note-reader>header>button{padding:9px 12px;color:#fff;font-size:.69rem;font-weight:760;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:9px;cursor:pointer}.notes-header>button:hover{background:rgba(255,255,255,.14)}
.notes-shell{display:grid;grid-template-columns:350px minmax(0,1fr);min-height:calc(100vh - 210px);overflow:hidden;background:#fdfefc;border:1px solid #d8e2dc;border-radius:22px;box-shadow:0 22px 60px rgba(26,55,44,.09)}.notes-index{max-height:calc(100vh - 210px);overflow:auto;padding:17px;background:linear-gradient(180deg,#f4f8f6,#eff5f2);border-right:1px solid #dae3de}.notes-index>header{display:flex;align-items:center;justify-content:space-between;padding:1px 3px 12px;border-bottom:1px solid #dae4df}.notes-index>header div{display:flex;flex-direction:column}.notes-index>header small{color:#7b9188;font:750 .56rem var(--font-mono);letter-spacing:.12em}.notes-index>header strong{font-size:.9rem}.notes-index>header>span{padding:3px 7px;color:#4e7063;font:.6rem var(--font-mono);background:#fff;border:1px solid #d5dfda;border-radius:999px}.index-tools{display:grid;gap:10px;padding:13px 0}.notes-index label>span{display:block;margin-bottom:5px;color:#6d7e77;font-size:.64rem}.search-field{position:relative}.search-field i{position:absolute;top:50%;left:11px;color:#7c8f87;font-style:normal;transform:translateY(-50%)}.notes-index input,.notes-index select{width:100%;padding:10px 11px;color:var(--note-ink);background:#fff;border:1px solid #cedbd4;border-radius:9px;outline:0}.notes-index input{padding-left:34px}.notes-index input:focus,.notes-index select:focus{border-color:#70a491;box-shadow:0 0 0 3px rgba(23,106,85,.11)}.notes-index section h2{display:flex;align-items:center;justify-content:space-between;margin:16px 4px 6px;color:#536a61;font-size:.69rem}.notes-index section h2 span{color:#8b9a94;font:600 .57rem var(--font-mono)}.notes-index section button{position:relative;display:grid;grid-template-columns:66px minmax(0,1fr) auto;width:100%;padding:10px 9px;text-align:left;color:var(--note-ink);background:transparent;border:1px solid transparent;border-radius:11px;cursor:pointer}.notes-index section button:hover{background:rgba(255,255,255,.65)}.notes-index section button.active{background:#fff;border-color:#cfddd6;box-shadow:0 8px 22px rgba(28,60,48,.08)}.notes-index section button.active::before{position:absolute;top:9px;bottom:9px;left:-1px;width:3px;content:'';background:linear-gradient(var(--note-green),var(--note-clay));border-radius:3px}.notes-index code{color:#21715b;font:700 .62rem var(--font-mono)}.notes-index section strong{overflow:hidden;font-size:.71rem;text-overflow:ellipsis;white-space:nowrap}.notes-index section small{grid-column:2;color:#8b9792;font-size:.57rem}.notes-index section button>i{grid-row:1/-1;grid-column:3;align-self:center;padding:2px 5px;color:#a45338;font:750 .49rem var(--font-mono);background:#fff2eb;border-radius:5px}.empty{display:grid;gap:5px;padding:24px 10px;color:#74827c;font-size:.72rem;line-height:1.6}.empty strong{color:#415c51}
.note-reader{max-height:calc(100vh - 210px);overflow:auto;padding:24px 30px 38px;background:linear-gradient(180deg,#fff 0%,#fbfcfa 100%)}.note-reader>header{display:flex;align-items:center;justify-content:space-between;gap:18px;padding-bottom:17px;border-bottom:1px solid #e0e6e2}.note-reader>header small{color:#34705e;font:750 .62rem var(--font-mono);letter-spacing:.04em}.note-reader>header h2{margin:4px 0 3px;color:var(--note-ink);font-size:clamp(1.35rem,2vw,1.85rem);letter-spacing:-.025em}.note-reader>header p{margin:0;color:#819089;font-size:.67rem}.note-reader>header>button{flex:0 0 auto;color:#315d4e;background:#f4f8f6;border-color:#d5e1db}.reader-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:15px 0}.reader-toolbar nav{display:flex;gap:4px;width:max-content;padding:4px;background:#eff4f1;border:1px solid #d9e2dd;border-radius:11px}.reader-toolbar nav button{padding:7px 10px;color:#60736b;font-size:.66rem;background:transparent;border:0;border-radius:8px;cursor:pointer}.reader-toolbar nav button.active{color:#fff;background:linear-gradient(135deg,#1a6652,#28594a);box-shadow:0 5px 14px rgba(28,93,74,.2)}.reader-toolbar nav button:disabled{opacity:.38;cursor:not-allowed}.reader-toolbar>span{color:#84918c;font-size:.61rem}.reader-toolbar>span strong{color:#4a655a}.note-paper{max-width:940px;min-height:380px;margin:0 auto;padding:26px 38px 42px;background:#fffefa;border:1px solid #e1e2da;border-radius:15px;box-shadow:0 14px 42px rgba(38,52,44,.07)}.paper-meta{display:flex;align-items:center;gap:9px;padding-bottom:14px;color:#809087;font:.57rem var(--font-mono);letter-spacing:.08em;border-bottom:1px solid #ebe9df}.paper-meta i{width:4px;height:4px;background:#bd6748;border-radius:50%}.markdown{overflow-wrap:anywhere;color:#293b34;line-height:1.85}.markdown :deep(.markdown-body){font-size:.92rem}.review{max-width:940px;margin:18px auto 0;padding:17px 19px;background:linear-gradient(145deg,#eff7f3,#fff8f4);border:1px solid #d2e1d9;border-radius:14px}.review>header{display:flex;align-items:end;justify-content:space-between;margin-bottom:10px}.review>header small{color:#47816e;font:.58rem var(--font-mono);letter-spacing:.1em}.review h3{margin:2px 0 0;font-size:.94rem}.review>header>span{color:#83918b;font-size:.61rem}.review p{display:flex;gap:10px;margin:7px 0;color:#53665d;font-size:.73rem;line-height:1.6}.review p b{flex:0 0 auto;padding:2px 7px;font-size:.58rem;border-radius:6px}.review p b[data-kind=fix]{color:#8f442e;background:#ffebe4}.review p b[data-kind=add]{color:#22684f;background:#dff3e9}.review p b[data-kind=check]{color:#80601c;background:#fff1c9}.note-reader details{max-width:940px;margin:18px auto 0;padding:0 16px;background:#f7f9f7;border:1px solid #e0e6e2;border-radius:13px}.note-reader summary{display:flex;align-items:center;justify-content:space-between;padding:13px 0;cursor:pointer;list-style:none}.note-reader summary::-webkit-details-marker{display:none}.note-reader summary>span{display:flex;flex-direction:column}.note-reader summary small{color:#84938c;font:.53rem var(--font-mono);letter-spacing:.1em}.note-reader summary strong{font-size:.76rem}.note-reader summary>b{color:#677a71;font:.6rem var(--font-mono)}.note-reader details ol{margin:0;padding:0 0 8px;list-style:none}.note-reader details li{display:grid;grid-template-columns:44px 92px minmax(0,1fr) auto;gap:9px;padding:9px 0;font-size:.68rem;border-top:1px solid #e2e8e4}.note-reader details li code{color:#28735d}.note-reader details li span,.note-reader details time{color:#7d8b85}.empty-reader{display:grid;place-items:center;text-align:center;color:#6f7f78}.empty-reader>div{max-width:370px}.empty-reader>div>span{display:grid;place-items:center;width:48px;height:48px;margin:0 auto 12px;color:#a85639;background:#fff2eb;border-radius:16px}.empty-reader strong{color:#314d42}.empty-reader p{font-size:.73rem;line-height:1.7}.error{margin:12px 0 0;padding:10px;color:#992f27;background:#fff0ee;border-radius:9px}
@media(max-width:1180px){.notes-header{grid-template-columns:1fr auto}.notes-header dl{grid-row:2;grid-column:1/-1;width:max-content}.notes-shell{grid-template-columns:310px minmax(0,1fr)}}
@media(max-width:850px){.notes-header{grid-template-columns:1fr;padding:23px 20px}.notes-header dl{grid-row:auto;grid-column:auto;width:100%}.notes-header>button{justify-self:start}.notes-shell{display:block;min-height:0}.notes-index{max-height:360px;border-right:0;border-bottom:1px solid #d8e2dc}.note-reader{max-height:none;padding:20px}.note-reader>header{align-items:flex-start;flex-direction:column}.reader-toolbar{align-items:flex-start;flex-direction:column}.note-paper{padding:22px 20px 32px}.note-reader details li{grid-template-columns:40px 1fr}.note-reader details li span,.note-reader details time{grid-column:2}}
@media(max-width:520px){.notes-header dl{grid-template-columns:1fr}.reader-toolbar nav{width:100%}.reader-toolbar nav button{flex:1;padding-inline:5px}.notes-index{max-height:320px}.note-reader{padding:16px 13px}.note-reader>header>button{width:100%}.note-paper{border-radius:11px}}
</style>

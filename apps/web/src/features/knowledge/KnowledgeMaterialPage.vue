<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiClient } from '@/api/client';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import { extractMarkdownHeadings } from '@/utils/markdown';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref('');
const material = ref<Awaited<ReturnType<typeof apiClient.getKnowledgeMaterial>> | null>(null);
const readerRoot = ref<HTMLElement | null>(null);
const activeHeading = ref('');
const readingProgress = ref(0);
const tocOpen = ref(false);
const copied = ref(false);
let headingObserver: IntersectionObserver | null = null;

const headings = computed(() => extractMarkdownHeadings(material.value?.markdown ?? '')
  .filter(({ level }, index) => index > 0 && level <= 4));
const characterCount = computed(() => (material.value?.markdown ?? '').replace(/\s/g, '').length);
const readingMinutes = computed(() => Math.max(1, Math.ceil(characterCount.value / 450)));
const isBeginnerGuide = computed(() => material.value?.guide === 'beginner-prerequisites-and-glossary.md');

async function load() {
  loading.value = true;
  error.value = '';
  activeHeading.value = '';
  try {
    material.value = await apiClient.getKnowledgeMaterial(
      String(route.params.guide ?? ''),
      String(route.params.anchor ?? ''),
    );
  } catch (reason) {
    material.value = null;
    error.value = reason instanceof Error ? reason.message : '学习资料加载失败';
  } finally {
    loading.value = false;
  }
}

function updateReadingProgress() {
  const root = readerRoot.value;
  if (!root) return;
  const start = root.getBoundingClientRect().top + window.scrollY;
  const distance = Math.max(1, root.offsetHeight - window.innerHeight);
  readingProgress.value = Math.min(100, Math.max(0, ((window.scrollY - start + 120) / distance) * 100));
}

function observeHeadings() {
  headingObserver?.disconnect();
  headingObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible[0]?.target.id) activeHeading.value = visible[0].target.id;
  }, { rootMargin: '-96px 0px -68% 0px', threshold: [0, 1] });
  for (const heading of headings.value) {
    const element = readerRoot.value?.querySelector<HTMLElement>(`#${CSS.escape(heading.id)}`);
    if (element) headingObserver.observe(element);
  }
  const targetId = decodeURIComponent(route.hash.replace(/^#/, ''));
  if (targetId) window.setTimeout(() => scrollToHeading(targetId), 0);
  updateReadingProgress();
}

function handleRendered() {
  void nextTick(observeHeadings);
}

function scrollToHeading(id: string) {
  const element = readerRoot.value?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (!element) return;
  activeHeading.value = id;
  tocOpen.value = false;
  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(window.history.state, '', `${route.path}#${encodeURIComponent(id)}`);
}

async function copyPageLink() {
  let didCopy = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(window.location.href);
      didCopy = true;
    }
  } catch { /* 使用兼容路径 */ }
  if (!didCopy) {
    const textarea = document.createElement('textarea');
    textarea.value = window.location.href;
    textarea.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.append(textarea);
    textarea.select();
    didCopy = document.execCommand('copy');
    textarea.remove();
  }
  copied.value = didCopy;
  window.setTimeout(() => { copied.value = false; }, 1400);
}

function openBeginnerGuide() {
  void router.push('/knowledge/materials/beginner-prerequisites-and-glossary.md/primer-00');
}

onMounted(() => {
  void load();
  window.addEventListener('scroll', updateReadingProgress, { passive: true });
  window.addEventListener('resize', updateReadingProgress);
});
watch(() => [route.params.guide, route.params.anchor], load);
onBeforeUnmount(() => {
  headingObserver?.disconnect();
  window.removeEventListener('scroll', updateReadingProgress);
  window.removeEventListener('resize', updateReadingProgress);
});
</script>

<template>
  <main class="material-page">
    <div class="reading-progress" aria-hidden="true"><i :style="{ width: `${readingProgress}%` }"></i></div>
    <nav class="page-actions" aria-label="讲义操作">
      <button class="back-link" type="button" @click="router.back()">← 返回知识点</button>
      <div>
        <button v-if="!isBeginnerGuide" type="button" @click="openBeginnerGuide">初学者术语讲义</button>
        <button type="button" @click="copyPageLink">{{ copied ? '链接已复制' : '复制本页链接' }}</button>
      </div>
    </nav>

    <div v-if="loading" class="state-panel">正在装载中文学习资料…</div>
    <div v-else-if="error" class="state-panel error" role="alert">{{ error }}</div>

    <template v-else-if="material">
      <header class="material-hero">
        <div>
          <p>站内中文讲义 <span>·</span> {{ material.anchor.toUpperCase() }}</p>
          <h1>{{ material.title }}</h1>
          <span>当前页只呈现这个知识点对应的 Markdown 章节，资料、练习与掌握挑战使用同一学习边界。</span>
        </div>
        <dl>
          <div><dt>预计阅读</dt><dd>{{ readingMinutes }} 分钟</dd></div>
          <div><dt>正文规模</dt><dd>{{ characterCount.toLocaleString('zh-CN') }} 字</dd></div>
          <div><dt>内容定位</dt><dd>{{ isBeginnerGuide ? '阅读辅助' : '知识点主讲义' }}</dd></div>
        </dl>
      </header>

      <button v-if="headings.length" class="mobile-toc-trigger" type="button" @click="tocOpen = !tocOpen">
        {{ tocOpen ? '收起目录' : '打开本页目录' }}
      </button>

      <div class="reading-layout" :class="{ 'toc-open': tocOpen }">
        <aside v-if="headings.length" class="toc-rail" aria-label="本页目录">
          <small>本页目录</small>
          <nav>
            <button
              v-for="heading in headings"
              :key="heading.id"
              type="button"
              :class="[`level-${heading.level}`, { active: activeHeading === heading.id }]"
              @click="scrollToHeading(heading.id)"
            >{{ heading.title }}</button>
          </nav>
        </aside>

        <article ref="readerRoot" class="material-sheet">
          <div class="sheet-note">
            <strong>{{ isBeginnerGuide ? '这是一份阅读辅助' : '先理解，再复现' }}</strong>
            <span>{{ isBeginnerGuide ? '用于补齐陌生术语和隐含前置知识，不单独作为考核题源。' : '建议先读机制与边界，再运行示例，并保留日志、截图或测试结果作为学习证据。' }}</span>
          </div>
          <MarkdownRenderer class="reader-content" :source="material.markdown" @rendered="handleRendered" />
          <footer>
            <span>你已读到本讲义末尾</span>
            <button type="button" @click="router.back()">带着理解返回知识点 →</button>
          </footer>
        </article>

        <aside class="support-rail">
          <section>
            <small>阅读方法</small>
            <ol>
              <li>先用自己的话解释“是什么”。</li>
              <li>运行或推演讲义中的最小示例。</li>
              <li>主动触发一个失败或反例。</li>
              <li>保存可复核的验证证据。</li>
            </ol>
          </section>
          <section v-if="!isBeginnerGuide" class="beginner-card">
            <small>遇到陌生词？</small>
            <strong>不要跳过隐含前置知识</strong>
            <p>术语讲义会同时保留中文译名与英文原名，并解释它在代码、练习和排错中的实际作用。</p>
            <button type="button" @click="openBeginnerGuide">打开初学者术语讲义 →</button>
          </section>
          <section>
            <small>考核边界</small>
            <p>阅读辅助不扩张知识点范围。挑战仍只依据知识点明确列出的资料、题目输入和交付物评分。</p>
          </section>
        </aside>
      </div>
    </template>
  </main>
</template>

<style scoped>
.material-page{--ink:#193028;--muted:#667970;--paper:#fffefa;--line:#dce5df;--accent:#176a55;--accent-warm:#c85d37;width:min(1460px,calc(100% - 36px));margin:0 auto;padding:20px 0 72px;color:var(--ink)}
.reading-progress{position:fixed;top:0;left:0;z-index:80;width:100%;height:3px;background:rgba(23,106,85,.1)}.reading-progress i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),#4e9a80,var(--accent-warm));transition:width .12s linear}
.page-actions{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.page-actions>div{display:flex;gap:8px}.page-actions button{padding:8px 11px;color:#385b4f;font-weight:750;background:rgba(255,255,255,.72);border:1px solid #d6e1db;border-radius:9px;cursor:pointer}.page-actions button:hover{border-color:#91b2a6;background:#fff}.back-link{border-color:transparent!important;background:transparent!important}
.state-panel{padding:28px;border:1px solid #d7e0dc;border-radius:16px;background:#fff}.state-panel.error{color:#9b302b;background:#fff4f2}
.material-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:30px;align-items:end;overflow:hidden;margin-bottom:18px;padding:34px 38px;border:1px solid #d6e3dc;border-radius:24px;background:linear-gradient(135deg,#f8fcfa 0%,#eef7f3 68%,#fff5ef 100%);box-shadow:0 18px 52px rgba(31,67,54,.08)}.material-hero::after{position:absolute;right:-70px;bottom:-100px;width:300px;height:300px;content:'';background:radial-gradient(circle,rgba(200,93,55,.12),transparent 68%);pointer-events:none}.material-hero>*{position:relative;z-index:1}.material-hero p{margin:0;color:#397664;font:800 .7rem ui-monospace;letter-spacing:.11em;text-transform:uppercase}.material-hero p span{color:#bd6a4c}.material-hero h1{max-width:920px;margin:9px 0 10px;font-size:clamp(1.85rem,3.7vw,3.4rem);line-height:1.12;letter-spacing:-.045em}.material-hero>div>span{display:block;max-width:760px;color:#60736b;line-height:1.7}.material-hero dl{display:grid;grid-template-columns:repeat(3,minmax(92px,1fr));gap:1px;margin:0;overflow:hidden;border:1px solid rgba(125,157,145,.25);border-radius:14px;background:rgba(125,157,145,.2)}.material-hero dl div{padding:13px 15px;background:rgba(255,255,255,.74)}.material-hero dt{color:#7a8983;font-size:.66rem}.material-hero dd{margin:5px 0 0;color:#274c40;font-size:.82rem;font-weight:800;white-space:nowrap}
.reading-layout{display:grid;grid-template-columns:220px minmax(0,850px) 230px;gap:18px;align-items:start;justify-content:center}.toc-rail,.support-rail{position:sticky;top:24px;max-height:calc(100vh - 48px);overflow:auto}.toc-rail{padding:16px 0}.toc-rail>small,.support-rail small{display:block;margin-bottom:10px;color:#71827b;font:800 .66rem ui-monospace;letter-spacing:.1em;text-transform:uppercase}.toc-rail nav{display:grid;gap:3px;border-left:1px solid #d9e3de}.toc-rail button{width:100%;padding:7px 10px;color:#60726b;font-size:.75rem;line-height:1.4;text-align:left;background:transparent;border:0;border-left:2px solid transparent;cursor:pointer}.toc-rail button.level-4{padding-left:25px;font-size:.7rem}.toc-rail button:hover{color:#234f40}.toc-rail button.active{color:#0f664f;font-weight:800;background:linear-gradient(90deg,rgba(23,106,85,.09),transparent);border-left-color:#1d8064}
.material-sheet{min-width:0;overflow:hidden;border:1px solid #d6e0da;border-radius:22px;background:var(--paper);box-shadow:0 20px 60px rgba(27,54,43,.09)}.sheet-note{display:flex;gap:10px;align-items:baseline;padding:15px 30px;color:#526c61;font-size:.75rem;line-height:1.55;background:#f1f7f4;border-bottom:1px solid #dce7e1}.sheet-note strong{flex:0 0 auto;color:#1c604d}.reader-content{padding:34px 42px 46px}.reader-content :deep(.markdown-body){font-size:1.02rem;line-height:1.9}.reader-content :deep(.markdown-body>h2:first-child){display:none}.reader-content :deep(h2),.reader-content :deep(h3),.reader-content :deep(h4){scroll-margin-top:90px}.reader-content :deep(h2){margin-top:2.2em;padding-top:.25em;border-top:1px solid #e3e9e5}.reader-content :deep(h3){position:relative;padding-left:.75rem}.reader-content :deep(h3)::before{position:absolute;top:.35em;bottom:.22em;left:0;width:3px;content:'';background:linear-gradient(#2c8068,#d27a59);border-radius:3px}.material-sheet>footer{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 30px;color:#6b7c75;font-size:.76rem;background:#f7faf8;border-top:1px solid #e0e7e3}.material-sheet>footer button{padding:9px 12px;color:#fff;font-weight:800;background:#245f4e;border:0;border-radius:9px;cursor:pointer}
.support-rail{display:grid;gap:12px}.support-rail section{padding:15px;border:1px solid #dbe4df;border-radius:15px;background:rgba(255,255,255,.76)}.support-rail ol{margin:0;padding-left:1.2rem;color:#52665d;font-size:.76rem;line-height:1.7}.support-rail li+li{margin-top:6px}.support-rail p{margin:7px 0 0;color:#64766f;font-size:.75rem;line-height:1.65}.beginner-card{background:linear-gradient(145deg,#f2f8f5,#fff7f2)!important;border-color:#cfded7!important}.beginner-card strong{display:block;color:#254d40;font-size:.86rem}.beginner-card button{margin-top:12px;padding:0;color:#a94e31;font-weight:800;background:transparent;border:0;cursor:pointer}.mobile-toc-trigger{display:none}
@media(max-width:1180px){.reading-layout{grid-template-columns:190px minmax(0,1fr)}.support-rail{position:static;grid-column:2;grid-template-columns:repeat(3,1fr);max-height:none}.material-hero{grid-template-columns:1fr}.material-hero dl{width:max-content}}
@media(max-width:800px){.material-page{width:min(100% - 22px,1460px);padding-top:12px}.page-actions{display:grid;grid-template-columns:1fr;align-items:start;gap:8px}.page-actions>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.page-actions button{width:100%;white-space:nowrap}.page-actions .back-link{width:max-content;padding-left:0}.material-hero{padding:25px 22px;border-radius:19px}.material-hero dl{width:100%;grid-template-columns:1fr}.reading-layout{display:block}.mobile-toc-trigger{display:block;width:100%;margin:0 0 10px;padding:11px;color:#315c4d;font-weight:800;background:#f3f8f5;border:1px solid #d7e2dc;border-radius:11px}.toc-rail{display:none;position:static;max-height:none;margin-bottom:10px;padding:10px 0;background:#fff;border:1px solid #dce5e0;border-radius:12px}.toc-open .toc-rail{display:block}.toc-rail>small{padding:0 12px}.support-rail{display:grid;grid-template-columns:1fr;margin-top:12px}.reader-content{padding:26px 21px 34px}.sheet-note{display:grid;padding:14px 20px}.material-sheet>footer{align-items:flex-start;flex-direction:column;padding:18px 20px}}
@media(prefers-reduced-motion:reduce){.reading-progress i{transition:none}}
</style>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiClient } from '@/api/client';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref('');
const material = ref<Awaited<ReturnType<typeof apiClient.getKnowledgeMaterial>> | null>(null);

async function load() {
  loading.value = true;
  error.value = '';
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

onMounted(load);
watch(() => [route.params.guide, route.params.anchor], load);
</script>

<template>
  <main class="material-page">
    <button class="back-link" type="button" @click="router.back()">← 返回知识点</button>
    <div v-if="loading" class="state-panel">正在装载中文学习资料…</div>
    <div v-else-if="error" class="state-panel error" role="alert">{{ error }}</div>
    <article v-else-if="material" class="material-sheet">
      <header>
        <p>IN-SITE LEARNING MATERIAL · {{ material.anchor.toUpperCase() }}</p>
        <h1>{{ material.title }}</h1>
        <span>本页只展示该知识点对应章节，便于学习、练习与掌握挑战引用同一份资料。</span>
      </header>
      <MarkdownRenderer :source="material.markdown" />
    </article>
  </main>
</template>

<style scoped>
.material-page{width:min(980px,calc(100% - 40px));margin:0 auto;padding:28px 0 64px}.back-link{margin-bottom:18px;border:0;background:transparent;color:#345f92;font-weight:800;cursor:pointer}.state-panel{padding:28px;border:1px solid #d7e0ea;border-radius:16px;background:#fff}.state-panel.error{color:#9b302b;background:#fff4f2}.material-sheet{overflow:hidden;border:1px solid #d5e0eb;border-radius:22px;background:#fff;box-shadow:0 18px 55px rgba(29,55,84,.09)}.material-sheet>header{padding:28px 32px;border-bottom:1px solid #e5ebf1;background:linear-gradient(135deg,#f8fbff,#eef5fc)}.material-sheet>header p{margin:0;color:#3c6798;font:800 .72rem ui-monospace;letter-spacing:.1em}.material-sheet>header h1{margin:8px 0;font-size:clamp(1.65rem,4vw,2.45rem)}.material-sheet>header span{color:#66778a;line-height:1.6}.material-sheet :deep(.markdown-body){padding:30px 32px}@media (max-width:640px){.material-page{width:min(100% - 24px,980px);padding-top:18px}.material-sheet>header,.material-sheet :deep(.markdown-body){padding:22px 20px}}
</style>

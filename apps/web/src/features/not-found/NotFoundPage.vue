<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <main class="not-found-page">
    <section>
      <p>ROUTE NOT FOUND · 404</p>
      <span class="route-mark" aria-hidden="true">?</span>
      <h1>这条路线还没有内容</h1>
      <p class="description">地址可能已经变化，或者输入时多了字符。你的学习进度和笔记没有受到影响。</p>
      <div class="actions">
        <button class="primary" @click="router.push('/')">回到学习台</button>
        <button @click="router.push('/knowledge/map')">打开知识体系</button>
      </div>
      <small>也可以按 <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd> 快速查找知识点或页面。</small>
    </section>
  </main>
</template>

<style scoped>
.not-found-page{display:grid;min-height:calc(100vh - 48px);place-items:center;padding:32px}.not-found-page section{position:relative;width:min(680px,100%);overflow:hidden;padding:clamp(32px,6vw,68px);text-align:center;background:linear-gradient(145deg,#fff 0%,#f8fbff 72%,#edf4ff 100%);border:1px solid var(--color-border);border-radius:24px;box-shadow:var(--shadow-md)}.not-found-page section>p:first-child{margin:0;color:var(--color-primary);font:750 .68rem var(--font-mono);letter-spacing:.15em}.route-mark{display:grid;width:82px;height:82px;margin:24px auto 18px;place-items:center;color:#fff;font:800 2rem var(--font-display);background:linear-gradient(135deg,#3268c7,#2d879b);border-radius:26px;box-shadow:0 20px 45px rgba(50,104,199,.24);transform:rotate(-4deg)}h1{margin:0;font-size:clamp(2rem,5vw,3.4rem);line-height:1.08;letter-spacing:-.055em}.description{max-width:520px;margin:14px auto 0;color:var(--color-text-secondary)}.actions{display:flex;justify-content:center;gap:9px;margin:26px 0 20px}.actions button{min-height:44px;padding:0 18px;color:var(--color-text);font-weight:680;background:#fff;border:1px solid var(--color-border-strong);border-radius:11px;cursor:pointer}.actions .primary{color:#fff;background:var(--color-primary-strong);border-color:var(--color-primary-strong)}small{color:var(--color-text-tertiary)}kbd{padding:2px 5px;color:var(--color-text-secondary);font:600 .68rem var(--font-mono);background:#fff;border:1px solid var(--color-border);border-radius:5px;box-shadow:0 1px 0 var(--color-border-strong)}@media(max-width:520px){.not-found-page{min-height:calc(100vh - 116px);padding:12px}.not-found-page section{padding:32px 20px}.actions{align-items:stretch;flex-direction:column}.actions button{width:100%}}
</style>

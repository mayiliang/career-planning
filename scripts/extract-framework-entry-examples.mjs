import { readFileSync, mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// 只从实际正文提取固定文件，避免测试副本与学习者看到的代码分叉。
for (const [framework, guide, ids] of [
  ['react', 'react-01-render-purity-state-snapshot.md', ['react01-package', 'react01-tsconfig', 'react01-index', 'react01-main', 'react01-controlled']],
  ['vue', 'vue-01-vite-sfc-project-structure.md', ['vue01-package', 'vue01-tsconfig', 'vue01-index', 'vue01-main', 'vue01-two-cards', 'vue01-card', 'vue01-alias', 'vue01-env', 'vue01-public-config']],
]) {
  const markdown = readFileSync(resolve('docs/knowledge/chinese-guides', guide), 'utf8');
  const blocks = [...markdown.matchAll(/```\w+ example=([^\s]+)[^\n]*?file=([^\s]+)\n([\s\S]*?)\n```/g)];
  // 环境文件全部来自正文命名块；拒绝旧实验残留，避免模式覆盖悄悄改变故障预期。
  const envBlocks = blocks.filter(block => /^\.env(?:\.|$)/.test(block[2]));
  const root = resolve('tmp/framework-entry-examples', framework);
  const expectedEnv = envBlocks.map(block => block[2]).sort();
  if (framework === 'vue' && JSON.stringify(expectedEnv) !== '[".env"]') throw new Error('Vue 固定工程必须只有 .env；修改协议时需同步验证');
  if (existsSync(root)) {
    const unexpected = readdirSync(root).filter(file => /^\.env(?:\.|$)/.test(file) && !expectedEnv.includes(file));
    if (unexpected.length) throw new Error(`请先检查并移走实验残留环境文件：${unexpected.join(', ')}`);
  }
  for (const block of envBlocks) if (!ids.includes(block[1])) ids.push(block[1]);
  for (const id of ids) {
    const match = blocks.find(block => block[1] === id);
    if (!match) throw new Error(`缺少完整文件 ${id}`);
    const file = resolve('tmp/framework-entry-examples', framework, match[2]);
    mkdirSync(dirname(file), { recursive: true });
    let source = match[3];
    if (id === 'vue01-two-cards') source = source.replace("import ReadingCard from './ReadingCard.vue';", "import ReadingCard from '@/ReadingCard.vue';\nimport { publicConfig } from './public-config';").replace('<h1>两张独立的资料卡片</h1>', '<h1>两张独立的资料卡片</h1><h2>卡片外标题</h2><p>公开地址：{{ publicConfig.apiBase }}；提示开关：{{ publicConfig.showReadingTips }}</p>');
    if (id === 'vue01-card') source += '\n<style scoped>h2 { color: rgb(20, 100, 60); }</style>\n';
    writeFileSync(file, source + '\n');
  }
}

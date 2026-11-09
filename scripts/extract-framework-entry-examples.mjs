import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// 只从实际正文提取固定文件，避免测试副本与学习者看到的代码分叉。
for (const [framework, guide, ids] of [
  ['react', 'react-01-render-purity-state-snapshot.md', ['react01-package', 'react01-tsconfig', 'react01-index', 'react01-main', 'react01-controlled']],
  ['vue', 'vue-01-vite-sfc-project-structure.md', ['vue01-package', 'vue01-tsconfig', 'vue01-index', 'vue01-main', 'vue01-two-cards', 'vue01-card', 'vue01-alias', 'vue01-env', 'vue01-public-config']],
]) {
  const markdown = readFileSync(resolve('docs/knowledge/chinese-guides', guide), 'utf8');
  const blocks = [...markdown.matchAll(/```\w+ example=([^\s]+)[^\n]*?file=([^\s]+)\n([\s\S]*?)\n```/g)];
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

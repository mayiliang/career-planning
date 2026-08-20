import { readdir, readFile, stat } from 'node:fs/promises';
const distDir = new URL('../dist/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('.vite/manifest.json', distDir), 'utf8'));
const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!entryKey) throw new Error('未找到 Vite 入口清单，无法检查首屏预算。');

const initialKeys = new Set();
function collectInitial(key) {
  if (initialKeys.has(key)) return;
  initialKeys.add(key);
  for (const dependency of manifest[key]?.imports ?? []) collectInitial(dependency);
}
collectInitial(entryKey);

const bytes = async (relativePath) => (await stat(new URL(relativePath, distDir))).size;
const initialJsFiles = [...initialKeys].map((key) => manifest[key]?.file).filter((file) => file?.endsWith('.js'));
const initialCssFiles = [...initialKeys].flatMap((key) => manifest[key]?.css ?? []);
const initialJs = (await Promise.all(initialJsFiles.map(bytes))).reduce((sum, size) => sum + size, 0);
const initialCss = (await Promise.all(initialCssFiles.map(bytes))).reduce((sum, size) => sum + size, 0);

const assetsDir = new URL('assets/', distDir);
const assetNames = await readdir(assetsDir);
const jsAssets = await Promise.all(assetNames.filter((name) => name.endsWith('.js')).map(async (name) => ({ name, size: await bytes(`assets/${name}`) })));
const sourceMaps = assetNames.filter((name) => name.endsWith('.map'));
const compilerChunk = jsAssets.find((asset) => asset.name.startsWith('typescript-'));
const largestRegularChunk = jsAssets.filter((asset) => asset !== compilerChunk).sort((a, b) => b.size - a.size)[0];
const totalJs = jsAssets.reduce((sum, asset) => sum + asset.size, 0);

const failures = [];
if (initialJs > 350 * 1024) failures.push(`首屏 JS ${(initialJs / 1024).toFixed(1)} KiB 超过 350 KiB`);
if (initialCss > 150 * 1024) failures.push(`首屏 CSS ${(initialCss / 1024).toFixed(1)} KiB 超过 150 KiB`);
if (compilerChunk && compilerChunk.size > 3.8 * 1024 * 1024) failures.push(`按需 TypeScript 编译器 ${(compilerChunk.size / 1024 / 1024).toFixed(2)} MiB 超过 3.8 MiB`);
if (largestRegularChunk && largestRegularChunk.size > 800 * 1024) failures.push(`最大常规懒加载块 ${largestRegularChunk.name} 超过 800 KiB`);
if (totalJs > 8 * 1024 * 1024) failures.push(`全部 JS ${(totalJs / 1024 / 1024).toFixed(2)} MiB 超过 8 MiB`);
if (process.env.VITE_SOURCEMAP !== 'true' && sourceMaps.length) failures.push(`生产包意外包含 ${sourceMaps.length} 个源码映射`);

if (failures.length) throw new Error(`前端体积预算失败：\n- ${failures.join('\n- ')}`);
console.log(`体积预算通过：首屏 JS ${(initialJs / 1024).toFixed(1)} KiB，首屏 CSS ${(initialCss / 1024).toFixed(1)} KiB，全部 JS ${(totalJs / 1024 / 1024).toFixed(2)} MiB。`);

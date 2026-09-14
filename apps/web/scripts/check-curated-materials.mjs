import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import { catalogUrl, guideRoot, readMaterialExamples, prepareMaterialExamples } from './learning-material-examples.mjs';

const batchIds = ['b01', 'b02', 'b03', 'b04', 'b05', 'b06', 'b07', 'b08', 'b09', 'b10', 'b11', 'b12'];
const catalogs = await Promise.all(batchIds.map(async (batch) => JSON.parse(await readFile(new URL(`${batch}.json`, catalogUrl), 'utf8'))));
const chapters = catalogs.flatMap((catalog) => catalog.chapters);
const batches = JSON.parse(await readFile(new URL('./pronunciation-batches.json', import.meta.url), 'utf8'));
const slug = (heading) => heading.replace(/[`*_~]/g, '').toLowerCase()
  .replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const documents = new Map();
async function document(guide) {
  assert.match(guide, /^[a-z0-9][a-z0-9.-]*\.md$/);
  assert(!guide.includes('..'));
  if (!documents.has(guide)) documents.set(guide, await readFile(new URL(guide, guideRoot), 'utf8'));
  return documents.get(guide);
}
function headings(markdown) {
  return [...markdown.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '').matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1].trim());
}
function hasAnchor(markdown, anchor) {
  return headings(markdown).some((heading) => slug(heading) === anchor || heading.match(/\b[A-Z][A-Z0-9]*-\d+\b/)?.[0].toLowerCase() === anchor);
}

const reviewToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
for (const [index, catalog] of catalogs.entries()) {
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.batch, batchIds[index].toUpperCase());
  assert.deepEqual(catalog.chapters.map(({ id }) => id), [
    ['JS-01', 'JS-02', 'JS-03', 'JS-07'],
    ['CS-01', 'CS-02', 'CS-03', 'JS-04'],
    ['JS-05', 'JS-06', 'TS-01', 'TS-02'],
    ['TS-03', 'WEB-01', 'REACT-01', 'VUE-01', 'VUE-02'],
    ['REACT-02', 'VUE-03', 'VUE-04', 'REACT-03'],
    ['REACT-04', 'VUE-05', 'REACT-05', 'VUE-06'],
    ['REACT-06', 'VUE-08', 'REACT-08', 'REACT-10'],
    ['VUE-07', 'REACT-07', 'VUE-10', 'REACT-09', 'VUE-11'],
    ['GIT-01', 'GIT-02', 'GIT-03', 'DEBUG-01'],
    ['ENG-01', 'ENG-02', 'ENG-03', 'ENG-05'],
    ['TEST-01', 'TEST-02', 'TEST-03', 'CAREER-01'],
    ['CAREER-02', 'CAREER-04', 'CAREER-05', 'WEB-02', 'WEB-03'],
  ][index]);
  assert.match(catalog.reviewedOn, /^\d{4}-\d{2}-\d{2}$/);
  assert(!Number.isNaN(Date.parse(catalog.reviewedOn)) && new Date(catalog.reviewedOn).toISOString().slice(0, 10) === catalog.reviewedOn);
  assert(catalog.reviewedOn <= reviewToday, '审校日期不能晚于项目本地日期');
}
const concepts = new Map();
for (const chapter of chapters) {
  assert.equal(chapter.anchor, chapter.id.toLowerCase());
  const markdown = await document(chapter.guide);
  assert(hasAnchor(markdown, chapter.anchor), `${chapter.id} 主入口不存在`);
  for (const field of ['title', 'question', 'summary']) assert(chapter[field]?.trim(), `${chapter.id} 缺少 ${field}`);
  assert(chapter.outcomes.length > 0);
  const prerequisiteSection = markdown.split('### 学习前先确认')[1]?.split(/\n### /)[0] ?? '';
  const actualPrerequisites = [...prerequisiteSection.matchAll(/^- 直接前置：(.*)$/gm)]
    .flatMap((match) => [...match[1].matchAll(/\.\.\/chinese-guides\/([^\s)]+)/g)].map((link) => link[1]));
  assert.deepEqual(actualPrerequisites, chapter.prerequisites, `${chapter.id} 的目录与正文直接前置不一致`);
  for (const concept of chapter.concepts) {
    assert(!concepts.has(concept.id), `概念重复归属：${concept.id}`);
    assert.equal(headings(markdown).filter((heading) => heading === concept.heading).length, 1, `${chapter.id} 缺少唯一小节：${concept.heading}`);
    concepts.set(concept.id, { chapter, concept });
  }
  const references = markdown.split('### 参考与延伸阅读')[1] ?? '';
  const specializedHosts = {
    'ENG-01': 'https://v6.vite.dev/', 'ENG-02': 'https://v6.vite.dev/',
    'ENG-03': 'https://pnpm.io/', 'ENG-05': 'https://eslint.org/',
    'TEST-01': 'https://fast-check.dev/', 'TEST-02': 'https://testing-library.com/',
    'TEST-03': 'https://playwright.dev/', 'CAREER-01': 'https://capd.mit.edu/',
    'CAREER-02': 'https://c4model.com/', 'CAREER-04': 'https://sre.google/',
    'CAREER-05': 'https://google.github.io/eng-practices/',
  };
  const officialHost = specializedHosts[chapter.id] ?? (chapter.id.startsWith('TS-') ? 'https://www.typescriptlang.org/'
    : chapter.id.startsWith('REACT-') ? 'https://react.dev/'
      : chapter.id.startsWith('VUE-') ? 'https://cn.vuejs.org/'
        : chapter.id.startsWith('GIT-') ? 'https://git-scm.com/'
          : chapter.id.startsWith('DEBUG-') ? 'https://developer.chrome.com/' : 'https://developer.mozilla.org/');
  assert(references.includes(officialHost), `${chapter.id} 缺少对应技术的官方参考入口`);
}
let connections = 0;
for (const chapter of chapters) {
  for (const connection of chapter.connections) {
    const target = concepts.get(connection.concept);
    assert(target, `关联概念不存在：${connection.concept}`);
    assert.notEqual(target.chapter.id, chapter.id, '知识连接应解释跨文档关系');
    assert(connection.reason?.trim(), '知识连接缺少理由');
    connections += 1;
  }
}

// 只审校已登记的批次；跨批次引用不改变目标资料的审校状态。
const supportGuides = [...new Set(catalogs.flatMap(({ batch }) => batches[batch.toLowerCase()]))];
let links = 0;
for (const guide of supportGuides) {
  const markdown = await document(guide);
  for (const match of markdown.matchAll(/\]\(\.\.\/chinese-guides\/([^#)]+)#([^\s)]+)\)/g)) {
    assert(hasAnchor(await document(match[1]), match[2]), `${guide} 引用不存在：${match[1]}#${match[2]}`);
    links += 1;
  }
}

const allExamples = (await Promise.all(catalogs.map(({ batch }) => readMaterialExamples(batch.toLowerCase())))).flat();
const examples = await prepareMaterialExamples(allExamples.filter(({ runtime }) => runtime === 'universal'));
// 单独 worker 限制失控示例的执行时间；代码从正文提取，不维护另一份测试代码。
await new Promise((resolve, reject) => {
  const worker = new Worker(`
    const { parentPort, workerData } = require('node:worker_threads');
    const assert = require('node:assert/strict');
    const { format } = require('node:util');
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    (async () => {
      for (const example of workerData) {
        const output = [];
        try {
          await new AsyncFunction('console', '"use strict";\\n' + example.code)({ log: (...args) => output.push(format(...args)) });
          assert.deepEqual(output, example.expected);
        } catch (error) { throw new Error(example.id + ': ' + error.message); }
      }
      parentPort.postMessage('ok');
    })().catch(error => { throw error; });
  `, { eval: true, workerData: examples });
  const timer = setTimeout(() => { void worker.terminate(); reject(new Error('讲义示例执行超过 10 秒')); }, 10000);
  worker.once('message', () => { clearTimeout(timer); void worker.terminate(); resolve(); });
  worker.once('error', (error) => { clearTimeout(timer); reject(error); });
  worker.once('exit', (code) => { clearTimeout(timer); if (code !== 0) reject(new Error(`示例进程退出 ${code}`)); });
});
console.log(`B01–B12 资料检查通过：${chapters.length} 篇主讲义，${concepts.size} 个唯一概念入口，${connections} 条知识连接，${links} 个正文内部引用，${examples.length} 个通用示例输出一致（${process.version}）；另登记 ${allExamples.filter(({ runtime }) => runtime === 'browser').length} 个浏览器示例、${allExamples.filter(({ runtime }) => runtime === 'project').length} 个页面、项目或终端片段，需按正文场景另行核对。`);

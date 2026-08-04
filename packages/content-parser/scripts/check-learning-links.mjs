import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..', '..', '..');
const KNOWLEDGE_ROOT = join(PROJECT_ROOT, 'docs', 'knowledge');
const REMOTE_CONCURRENCY = Number(process.env.LINK_CHECK_CONCURRENCY ?? 48);
const REQUEST_TIMEOUT_MS = Number(process.env.LINK_CHECK_TIMEOUT_MS ?? 8_000);
const MAX_ATTEMPTS = 2;
const STRICT = process.argv.includes('--strict');

function walkMarkdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walkMarkdownFiles(path);
    return entry.isFile() && extname(entry.name).toLowerCase() === '.md' ? [path] : [];
  });
}

function normalizeGithubAnchor(value) {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function collectHeadingAnchors(markdown) {
  const counts = new Map();
  const anchors = new Set();
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const base = normalizeGithubAnchor(match[2]);
    if (!base) continue;
    const duplicateIndex = counts.get(base) ?? 0;
    counts.set(base, duplicateIndex + 1);
    anchors.add(duplicateIndex === 0 ? base : `${base}-${duplicateIndex}`);
  }
  return anchors;
}

function extractLinks(markdown) {
  const links = [];
  const pattern = /(?<!!)\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of markdown.matchAll(pattern)) {
    links.push(match[1].replace(/^<|>$/g, ''));
  }
  return links;
}

function classifyLink(rawLink, sourceFile) {
  if (/^(?:mailto|tel|javascript|data):/i.test(rawLink)) return { kind: 'ignored' };
  if (/^https?:\/\//i.test(rawLink)) return { kind: 'remote', url: rawLink };

  const [pathPart, fragment = ''] = rawLink.split('#', 2);
  const decodedPath = decodeURIComponent(pathPart || '');
  const targetFile = decodedPath
    ? isAbsolute(decodedPath)
      ? decodedPath
      : resolve(dirname(sourceFile), decodedPath)
    : sourceFile;
  return { kind: 'local', targetFile, fragment, rawLink, sourceFile };
}

function checkLocalLink(link) {
  if (!existsSync(link.targetFile) || !statSync(link.targetFile).isFile()) {
    return {
      ok: false,
      reason: '目标文件不存在',
      link: link.rawLink,
      source: relative(PROJECT_ROOT, link.sourceFile)
    };
  }
  if (!link.fragment || extname(link.targetFile).toLowerCase() !== '.md') return { ok: true };

  const targetMarkdown = readFileSync(link.targetFile, 'utf8');
  const expectedAnchor = normalizeGithubAnchor(link.fragment);
  if (collectHeadingAnchors(targetMarkdown).has(expectedAnchor)) return { ok: true };
  return {
    ok: false,
    reason: `锚点不存在：#${link.fragment}`,
    link: link.rawLink,
    source: relative(PROJECT_ROOT, link.sourceFile)
  };
}

async function requestRemote(url) {
  let lastError = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
          Range: 'bytes=0-2047',
          'User-Agent': 'Career-Atlas-Learning-Resource-Audit/1.0'
        },
        signal: controller.signal
      });
      await response.body?.cancel();
      clearTimeout(timer);

      if (
        (response.status >= 200 && response.status < 400) ||
        [401, 403, 405, 406, 409, 429].includes(response.status)
      ) {
        return {
          ok: true,
          status: response.status,
          finalUrl: response.url,
          accessLimited: [401, 403, 405, 406, 409, 429].includes(response.status)
        };
      }
      if ([404, 410].includes(response.status)) {
        return { ok: false, definitive: true, status: response.status, reason: '页面不存在' };
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      clearTimeout(timer);
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { ok: false, definitive: false, reason: lastError };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

const files = walkMarkdownFiles(KNOWLEDGE_ROOT);
const localLinks = [];
const remoteSources = new Map();

for (const file of files) {
  const markdown = readFileSync(file, 'utf8');
  for (const rawLink of extractLinks(markdown)) {
    const link = classifyLink(rawLink, file);
    if (link.kind === 'local') localLinks.push(link);
    if (link.kind === 'remote') {
      const sources = remoteSources.get(link.url) ?? new Set();
      sources.add(relative(PROJECT_ROOT, file));
      remoteSources.set(link.url, sources);
    }
  }
}

const brokenLocal = localLinks.map(checkLocalLink).filter((result) => !result.ok);
const remoteUrls = [...remoteSources.keys()];
const remoteResults = await mapWithConcurrency(remoteUrls, REMOTE_CONCURRENCY, async (url) => ({
  url,
  ...(await requestRemote(url))
}));

const brokenRemote = remoteResults.filter((result) => !result.ok && result.definitive);
const unresolvedRemote = remoteResults.filter((result) => !result.ok && !result.definitive);
const limitedRemote = remoteResults.filter((result) => result.ok && result.accessLimited);

console.log(`知识文档：${files.length} 个`);
console.log(`本地链接：${localLinks.length} 个，失效 ${brokenLocal.length} 个`);
console.log(`远程唯一链接：${remoteUrls.length} 个`);
console.log(`可访问：${remoteResults.length - brokenRemote.length - unresolvedRemote.length} 个`);
console.log(`站点限流/鉴权但地址存在：${limitedRemote.length} 个`);
console.log(`明确失效（404/410）：${brokenRemote.length} 个`);
console.log(`网络环境下暂无法确认：${unresolvedRemote.length} 个`);
console.log(`校验模式：${STRICT ? '严格（无法确认也失败）' : '常规（只阻断明确失效）'}`);

for (const result of brokenLocal) {
  console.error(`[本地失效] ${result.source} -> ${result.link}（${result.reason}）`);
}
for (const result of brokenRemote) {
  const sources = [...(remoteSources.get(result.url) ?? [])].join(', ');
  console.error(`[远程失效] ${result.status} ${result.url}（引用：${sources}）`);
}
for (const result of unresolvedRemote) {
  console.warn(`[暂无法确认] ${result.url}（${result.reason}）`);
}

if (brokenLocal.length > 0 || brokenRemote.length > 0 || (STRICT && unresolvedRemote.length > 0)) {
  process.exitCode = 1;
}

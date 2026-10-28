import { type AssistantSource } from './types.js';
import { MAX_WEB_RESULTS } from './constants.js';
import { compact, normalize } from './text.js';

export async function searchWebSources(
  query: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<AssistantSource[]> {
  if (!query) return [];
  const restrictedDomain = /^site:([^\s/]+)\s+/iu.exec(query)?.[1]?.toLocaleLowerCase() ?? '';
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 3_500);
  try {
    const searchUrl = new URL('https://www.bing.com/search');
    searchUrl.searchParams.set('format', 'rss');
    searchUrl.searchParams.set('setlang', 'zh-hans');
    searchUrl.searchParams.set('q', query);
    const response = await fetchImpl(searchUrl, {
      headers: { 'User-Agent': 'Career-Atlas/0.2 local-learning-assistant' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`联网检索返回 ${response.status}`);
    const xml = await response.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/giu)].slice(0, MAX_WEB_RESULTS).flatMap((match, index) => {
      const item = match[1] ?? '';
      const title = decodeXml(readXmlTag(item, 'title')).trim();
      const link = decodeXml(readXmlTag(item, 'link')).trim();
      const description = compact(cleanMarkup(decodeXml(readXmlTag(item, 'description'))), 360);
      if (!title || !isPublicHttpUrl(link)) return [];
      if (restrictedDomain) {
        const hostname = new URL(link).hostname.toLocaleLowerCase();
        if (hostname !== restrictedDomain && !hostname.endsWith(`.${restrictedDomain}`)) return [];
      }
      return [{ id: `W${index + 1}`, kind: 'WEB' as const, title, url: link, excerpt: description }];
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export function buildCuratedOfficialSources(query: string): AssistantSource[] {
  const normalizedQuery = normalize(query);
  const candidates: Array<{ pattern: RegExp; title: string; url: string; excerpt: string }> = [
    {
      pattern: /\bweb\s*worker\b/iu,
      title: 'MDN · Web Worker API',
      url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API',
      excerpt: 'Web Worker 在独立后台线程运行脚本，不能直接操作 DOM；主线程与 Worker 通过消息通信。',
    },
    {
      pattern: /\babortcontroller\b/iu,
      title: 'MDN · AbortController',
      url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController',
      excerpt: 'AbortController 用于通过 AbortSignal 中止一个或多个 Web 请求。',
    },
    {
      pattern: /\bindexeddb\b/iu,
      title: 'MDN · IndexedDB API',
      url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API',
      excerpt: 'IndexedDB 是浏览器中的事务型客户端数据库 API。',
    },
    {
      pattern: /\bwebsocket\b/iu,
      title: 'MDN · WebSocket API',
      url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/WebSockets_API',
      excerpt: 'WebSocket API 用于在浏览器与服务器之间建立双向交互通信。',
    },
  ];
  return candidates.filter((candidate) => candidate.pattern.test(normalizedQuery)).slice(0, 1).map((candidate) => ({
    id: '',
    kind: 'WEB' as const,
    title: candidate.title,
    url: candidate.url,
    excerpt: candidate.excerpt,
  }));
}

export function reindexWebSources(sources: AssistantSource[]) {
  const site = sources.filter((source) => source.kind === 'SITE');
  const seen = new Set<string>();
  const web = sources.filter((source) => source.kind === 'WEB' && !seen.has(source.url) && seen.add(source.url))
    .slice(0, MAX_WEB_RESULTS)
    .map((source, index) => ({ ...source, id: `W${index + 1}` }));
  return [...site, ...web];
}

export function readXmlTag(value: string, tag: string) {
  return new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'iu').exec(value)?.[1] ?? '';
}

export function decodeXml(value: string) {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/giu, (entity) => {
    const names: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
    if (names[entity.toLowerCase()]) return names[entity.toLowerCase()]!;
    const number = entity.startsWith('&#x') ? Number.parseInt(entity.slice(3, -1), 16) : Number.parseInt(entity.slice(2, -1), 10);
    return Number.isFinite(number) ? String.fromCodePoint(number) : entity;
  });
}

export function cleanMarkup(value: string) {
  return value.replace(/<[^>]+>/gu, ' ').replace(/\s{2,}/gu, ' ').trim();
}

export function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname) && !/^(?:localhost|127\.|0\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/u.test(url.hostname);
  } catch { return false; }
}

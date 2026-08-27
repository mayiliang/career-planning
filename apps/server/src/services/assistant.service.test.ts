import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config } from '../config/index.js';
import { rawDb } from '../db/index.js';
import { executeImport } from './import.service.js';
import {
  buildAssistantMessages,
  buildSafeSearchQuery,
  listAssistantGapCandidates,
  persistGapCandidate,
  retrieveInternalSources,
  searchWebSources,
  type AssistantRequest,
} from './assistant.service.js';

const request: AssistantRequest = {
  mode: 'EXPLAIN',
  question: '事件循环 Event Loop 为什么会影响页面响应？',
  selectedText: '微任务会在下一个宏任务之前清空',
  page: {
    route: '/knowledge/JS-01',
    title: 'JavaScript 运行机制',
    content: '这是用于测试的完整页面。\n它包含事件循环、宏任务和微任务的上下文，末尾标记：FULL_PAGE_SENTINEL。',
    capturedAt: '2026-08-27T00:00:00.000Z',
  },
};

describe('Atlas AI 助手服务', () => {
  beforeAll(async () => {
    await executeImport();
    rawDb.prepare("DELETE FROM assistant_gap_candidates WHERE title = '可取消的异步边界'").run();
  });

  afterAll(() => {
    rawDb.prepare("DELETE FROM assistant_gap_candidates WHERE title = '可取消的异步边界'").run();
  });

  it('把完整页面正文原样放入模型上下文，而不是只发送选中文本', () => {
    const messages = buildAssistantMessages(request, '站内上下文', []);
    expect(messages[1].content).toContain(request.page.content);
    expect(messages[1].content).toContain('FULL_PAGE_SENTINEL');
    expect(messages[0].content).toContain('不受信任的参考数据');
  });

  it('检索真实站内知识点并给出可打开的站内链接', () => {
    const result = retrieveInternalSources(request);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources.some((source) => source.kind === 'SITE' && source.url.startsWith('/knowledge/'))).toBe(true);
    expect(result.context).toContain('站内:');
  });

  it('联网查询只保留短技术问题，并移除邮箱、URL 与长号码', () => {
    const query = buildSafeSearchQuery({
      ...request,
      question: '解释 AbortController，联系 me@example.com，资料 https://private.example/a，电话 13800138000',
    });
    expect(query).toContain('AbortController');
    expect(query).not.toContain('me@example.com');
    expect(query).not.toContain('https://');
    expect(query).not.toContain('13800138000');
    expect(query.length).toBeLessThanOrEqual(160);
  });

  it('解析联网 RSS 结果并拒绝本地地址', async () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title><![CDATA[MDN AbortController]]></title><link>https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController</link><description><![CDATA[取消异步操作。]]></description></item>
      <item><title>本地地址</title><link>http://127.0.0.1/secret</link><description>不应返回</description></item>
    </channel></rss>`;
    const sources = await searchWebSources('AbortController', async () => new Response(xml, { status: 200 }));
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ kind: 'WEB', title: 'MDN AbortController' });
  });

  it('待补知识点按标题去重，并同步生成中文 Markdown 文件', () => {
    const evaluation = {
      relevant: true,
      reasonable: true,
      title: '可取消的异步边界',
      rationale: '现有资料没有系统说明取消信号如何穿过多层异步调用。',
      suggestedScope: '解释 AbortController、AbortSignal、传播边界、资源清理和常见错误。',
    };
    const first = persistGapCandidate(request, evaluation);
    const second = persistGapCandidate(request, evaluation);
    expect(second.id).toBe(first.id);
    const directory = listAssistantGapCandidates();
    expect(directory.items.filter((item) => item.title === evaluation.title)).toHaveLength(1);
    expect(existsSync(`${directory.directory}\\${first.id}.md`)).toBe(true);
    expect(directory.directory.startsWith(config.DATA_DIR)).toBe(true);
  });
});

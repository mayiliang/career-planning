import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { config } from '../config/index.js';
import { rawDb } from '../db/index.js';
import { executeImport } from './import.service.js';
import {
  buildAssistantMessages,
  buildCorrectionAppendix,
  buildCuratedOfficialSources,
  buildOptimizedPageContext,
  buildSafeSearchQuery,
  listAssistantGapCandidates,
  persistGapCandidate,
  retrieveInternalSources,
  runAssistant,
  searchWebSources,
  shouldSearchWeb,
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

  it('短页面保留完整语境，并明确把页面数据当作不受信任参考', () => {
    const messages = buildAssistantMessages(request, '站内上下文', []);
    expect(messages[1].content).toContain(request.page.content);
    expect(messages[1].content).toContain('FULL_PAGE_SENTINEL');
    expect(messages[0].content).toContain('不能因为它们被提供给你就当作事实');
    expect(messages[0].content).toContain('资料核验与纠错');
    expect(messages[0].content).toContain('不要伪装成已经查阅了某个未提供的来源');
    expect(messages[0].content).toContain('站内优先只是检索顺序，不是可信度保证');
    expect(messages[0].content).toContain('引用只说明信息来自哪里，不等于为其真实性背书');
    expect(messages[1].content).toContain('待核验，可能不正确');
  });

  it('长页面按任务精简，保留首尾信息且显著降低模型输入', () => {
    const longRequest: AssistantRequest = {
      ...request,
      mode: 'SUMMARY',
      selectedText: undefined,
      page: {
        ...request.page,
        content: `页面开头：学习目标。\n\n${Array.from({ length: 3_000 }, (_, index) => `第 ${index} 段：用于测试的知识说明、边界提示与示例。`).join('\n\n')}\n\nPAGE_END_SENTINEL`,
      },
    };
    const plan = buildOptimizedPageContext(longRequest);
    expect(plan.contextCharacterCount).toBeLessThanOrEqual(16_000);
    expect(plan.contextCharacterCount).toBeLessThan(plan.originalCharacterCount / 2);
    expect(plan.content).toContain('页面开头');
    expect(plan.content).toContain('PAGE_END_SENTINEL');
  });

  it('检索真实站内知识点并给出可打开的站内链接', () => {
    const result = retrieveInternalSources(request);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources.some((source) => source.kind === 'SITE' && source.url.startsWith('/knowledge/'))).toBe(true);
    expect(result.context).toContain('站内:');
    expect(result.sources.length).toBeLessThanOrEqual(2);
    expect(result.context.length).toBeLessThanOrEqual(4_800);
  });

  it('划词解释默认不联网，明确要求站外资料时才联网；普通提问弱匹配时允许补充', () => {
    expect(shouldSearchWeb(request, { strongMatch: true })).toBe(false);
    expect(shouldSearchWeb({ ...request, question: '请查找最新官方资料' }, { strongMatch: true })).toBe(true);
    expect(shouldSearchWeb(request, { strongMatch: false })).toBe(false);
    expect(shouldSearchWeb({ ...request, mode: 'ASK' }, { strongMatch: false })).toBe(true);
    expect(shouldSearchWeb({ ...request, mode: 'ASK', question: '请核验这段资料是否正确' }, { strongMatch: true })).toBe(true);
  });

  it('划词解释只发送短选区与短邻近语境', () => {
    const selectedText = `选中开始${'解释对象'.repeat(1_500)}选中结束`;
    const explainRequest: AssistantRequest = {
      ...request,
      selectedText,
      page: { ...request.page, content: `${'前文。'.repeat(800)}${selectedText}${'后文。'.repeat(800)}` },
    };
    const plan = buildOptimizedPageContext(explainRequest);
    const messages = buildAssistantMessages(explainRequest, '站内上下文', [], plan);
    expect(plan.contextCharacterCount).toBeLessThanOrEqual(2_400);
    expect(plan.content).toContain('用户选中的内容');
    expect(messages[1].content).not.toContain(selectedText);
    expect(messages[1].content.length).toBeLessThan(10_000);
  });

  it('总结提示要求覆盖主要章节、易错细节与复习清单', () => {
    const messages = buildAssistantMessages({ ...request, mode: 'SUMMARY', selectedText: undefined }, '站内上下文', []);
    expect(messages[1].content).toContain('覆盖每个主要章节');
    expect(messages[1].content).toContain('容易忽略的信息');
    expect(messages[1].content).toContain('复习或验证清单');
    expect(messages[1].content).toContain('1,800–3,000');
    expect(messages[1].content).toContain('完整结束');
  });

  it('解释提示要求给出工程例子，并仅在确有帮助时使用 Mermaid 图', () => {
    const messages = buildAssistantMessages(request, '站内上下文', []);
    expect(messages[1].content).toContain('贴近前端工程的具体例子');
    expect(messages[1].content).toContain('Mermaid');
    expect(messages[1].content).toContain('不要为了装饰而作图');
  });

  it('追问只带入当前独立会话历史', () => {
    const messages = buildAssistantMessages({
      ...request,
      mode: 'ASK',
      question: '那取消请求时会发生什么？',
      selectedText: undefined,
      history: [
        { role: 'user', content: '解释事件循环。' },
        { role: 'assistant', content: '事件循环会协调宏任务与微任务。' },
      ],
    }, '站内上下文', []);
    expect(messages[1].content).toContain('当前独立会话历史开始');
    expect(messages[1].content).toContain('用户：解释事件循环。');
    expect(messages[1].content).toContain('Atlas AI：事件循环会协调宏任务与微任务。');
    expect(messages[1].content).toContain('那取消请求时会发生什么？');
    expect(messages[1].content).toContain('严格遵循用户明确指定的篇幅');
  });

  it('解释模式禁用深度推理、限制输出预算，并在站内强匹配时不发起联网搜索', async () => {
    const originalKey = config.DEEPSEEK_API_KEY;
    config.DEEPSEEK_API_KEY = 'assistant-test-key';
    const responseBody = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: '直接解释结果。' } }] })}`,
      '',
      'data: [DONE]',
      '',
    ].join('\n');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }));
    const events: Array<{ event: string; data: Record<string, unknown> }> = [];
    try {
      await runAssistant({
        ...request,
        page: { ...request.page, route: '/knowledge/JS-04', title: 'JS-04 异步、Promise 与事件循环' },
      }, (event, data) => events.push({ event, data }));
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
      expect(body.max_tokens).toBe(1_800);
      expect(body.thinking).toEqual({ type: 'disabled' });
      expect(body).not.toHaveProperty('reasoning_effort');
      expect(events.find((entry) => entry.event === 'sources')?.data.webSearchUsed).toBe(false);
      expect(events.some((entry) => entry.event === 'diagnostic' && entry.data.stage === 'FIRST_TOKEN')).toBe(true);
      expect(events.find((entry) => entry.event === 'done')?.data.contextCharacterCount).toBeTypeOf('number');
    } finally {
      fetchMock.mockRestore();
      config.DEEPSEEK_API_KEY = originalKey;
    }
  });

  it('联网查询只保留短技术问题，并移除邮箱、URL 与长号码', () => {
    const query = buildSafeSearchQuery({
      ...request,
      mode: 'ASK',
      question: '解释 AbortController，联系 me@example.com，资料 https://private.example/a，电话 13800138000',
    });
    expect(query).toContain('AbortController');
    expect(query).not.toContain('me@example.com');
    expect(query).not.toContain('https://');
    expect(query).not.toContain('13800138000');
    expect(query.length).toBeLessThanOrEqual(160);
  });

  it('划词核验使用选中文字作为检索主题，不把用户的操作指令当成主题', () => {
    const query = buildSafeSearchQuery({
      ...request,
      question: '请核验这段文字是否正确，如果错误请纠正',
      selectedText: 'Web Worker 可以直接访问并修改 DOM',
    });
    expect(query).toBe('site:developer.mozilla.org Web Worker 可以直接访问并修改 DOM');
    expect(query).not.toContain('请核验');
  });

  it('为可识别的 Web 平台主题提供一手官方入口，同时仍把它当作待核验资料', () => {
    expect(buildCuratedOfficialSources('site:developer.mozilla.org Web Worker DOM')).toEqual([
      expect.objectContaining({
        kind: 'WEB',
        title: 'MDN · Web Worker API',
        url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API',
      }),
    ]);
  });

  it('模型已判定选中文字错误但漏掉固定小节时，补齐可追溯的纠错摘要', () => {
    const appendix = buildCorrectionAppendix(
      { ...request, selectedText: 'Web Worker 可以直接修改 DOM' },
      '这段文字是错误的。Worker 不能直接修改 DOM [站内:S1] [网络:W1]。',
      [
        { id: 'S1', kind: 'SITE', title: '站内讲义', url: '/knowledge/CS-03', excerpt: '讲义' },
        { id: 'W1', kind: 'WEB', title: 'MDN', url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API', excerpt: '官方资料' },
        { id: 'W2', kind: 'WEB', title: '未引用', url: 'https://example.com/unused', excerpt: '未引用' },
      ],
    );
    expect(appendix).toContain('## 资料核验与纠错');
    expect(appendix).toContain('Web Worker 可以直接修改 DOM');
    expect(appendix).toContain('[站内:S1]、[网络:W1]');
    expect(appendix).not.toContain('[网络:W2]');
  });

  it('显式核验请求使用“判断：错误”等短句时也不会漏掉纠错小节', () => {
    const appendix = buildCorrectionAppendix(
      { ...request, question: '请核验这段文字是否正确' },
      '## 判断\n\n错误。正确结论如下。',
      [],
    );
    expect(appendix).toContain('## 资料核验与纠错');
  });

  it('解析联网 RSS 结果并拒绝本地地址', async () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title><![CDATA[MDN AbortController]]></title><link>https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController</link><description><![CDATA[取消异步操作。]]></description></item>
      <item><title>本地地址</title><link>http://127.0.0.1/secret</link><description>不应返回</description></item>
    </channel></rss>`;
    const sources = await searchWebSources('site:developer.mozilla.org AbortController', async () => new Response(xml, { status: 200 }));
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

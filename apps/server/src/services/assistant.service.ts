/** 助手流程编排；上下文、检索、模型通信和持久化各自独立。 */
import { type AssistantRequest, type EmitEvent, type AssistantSource } from './assistant/types.js';
import { isAiConfigured, config } from '../config/index.js';
import { retrieveInternalSources, buildOptimizedPageContext, buildSafeSearchQuery, shouldSearchWeb, buildAssistantMessages, buildCorrectionAppendix } from './assistant/context.js';
import { searchWebSources, reindexWebSources, buildCuratedOfficialSources } from './assistant/web-search.js';
import { streamChat, evaluateGap } from './assistant/model.js';
import { persistGapCandidate } from './assistant/storage.js';

export { type AssistantMode, type AssistantPageContext, type AssistantRequest, type AssistantSource, type AssistantGapCandidate, type AssistantContextPlan, type AssistantDiagnosticRecord } from './assistant/types.js';
export { MAX_ASSISTANT_PAGE_CHARS } from './assistant/constants.js';
export { buildSafeSearchQuery, retrieveInternalSources, buildOptimizedPageContext, shouldSearchWeb, buildCorrectionAppendix, buildAssistantMessages } from './assistant/context.js';
export { searchWebSources, buildCuratedOfficialSources } from './assistant/web-search.js';
export { recordAssistantDiagnostic, listAssistantDiagnostics, listAssistantGapCandidates, persistGapCandidate } from './assistant/storage.js';

export async function runAssistant(request: AssistantRequest, emit: EmitEvent, signal?: AbortSignal) {
  const startedAt = Date.now();
  if (!isAiConfigured()) {
    throw new Error('尚未配置 AI。请先在初始化配置中填写 API Key，助手会自动沿用同一配置。');
  }
  emit('progress', { message: '正在检索站内知识与中文讲义' });
  const internal = retrieveInternalSources(request);
  const contextPlan = buildOptimizedPageContext(request);
  emit('diagnostic', {
    stage: 'SITE_CONTEXT_READY',
    elapsedMs: Date.now() - startedAt,
    contextCharacterCount: contextPlan.contextCharacterCount,
    internalContextCharacterCount: internal.context.length,
    siteSourceCount: internal.sources.length,
  });
  const searchQuery = buildSafeSearchQuery(request);
  let liveWebSources: AssistantSource[] = [];
  let webSearchWarning = '';
  const webSearchUsed = Boolean(searchQuery && shouldSearchWeb(request, internal));
  if (webSearchUsed) {
    emit('progress', { message: '正在联网查找补充资料' });
    emit('diagnostic', { stage: 'WEB_SEARCH', elapsedMs: Date.now() - startedAt });
    try {
      liveWebSources = await searchWebSources(searchQuery, fetch, signal);
    } catch (error) {
      webSearchWarning = error instanceof Error && error.name === 'AbortError'
        ? '联网检索超时，本次仍会使用站内资料完成回答。'
        : '联网检索暂时不可用，本次仍会使用站内资料完成回答。';
    }
  }
  const sources = reindexWebSources([
    ...internal.sources,
    ...(webSearchUsed ? buildCuratedOfficialSources(searchQuery) : []),
    ...(webSearchUsed ? liveWebSources : []),
    ...(webSearchUsed ? internal.materialWebSources : []),
  ]);
  emit('sources', { sources, searchQuery: webSearchUsed ? searchQuery : '', webSearchWarning, webSearchUsed });
  emit('progress', { message: request.mode === 'EXPLAIN' ? '上下文已就绪，正在快速解释' : `已选取 ${contextPlan.contextCharacterCount.toLocaleString('zh-CN')} 字相关上下文，正在直接回答` });
  emit('diagnostic', {
    stage: 'MODEL_WAIT',
    elapsedMs: Date.now() - startedAt,
    contextCharacterCount: contextPlan.contextCharacterCount,
    siteSourceCount: sources.filter((source) => source.kind === 'SITE').length,
    webSourceCount: sources.filter((source) => source.kind === 'WEB').length,
    webSearchUsed,
  });

  const messages = buildAssistantMessages(request, internal.context, sources, contextPlan);
  const answer = await streamChat(messages, request.mode, emit, signal, startedAt);
  const correctionAppendix = buildCorrectionAppendix(request, answer, sources);
  if (correctionAppendix) emit('delta', { delta: correctionAppendix });
  emit('done', {
    provider: config.AI_PROVIDER,
    model: config.DEEPSEEK_MODEL,
    sourceCount: sources.length,
    pageCharacterCount: request.page.content.length,
    contextCharacterCount: contextPlan.contextCharacterCount,
    webSearchUsed,
    elapsedMs: Date.now() - startedAt,
  });

  if (!internal.strongMatch && request.mode !== 'SUMMARY' && isPotentialCurriculumGap(request) && !signal?.aborted) {
    void evaluateGap(request, contextPlan, internal.sources)
      .then((evaluation) => {
        if (evaluation.relevant && evaluation.reasonable && evaluation.title && evaluation.rationale && evaluation.suggestedScope) {
          persistGapCandidate(request, evaluation);
        }
      })
      .catch(() => { /* 后台候补审查失败不能影响已经完成的回答 */ });
  }
}

export function isPotentialCurriculumGap(request: AssistantRequest) {
  const subject = `${request.page.title} ${request.question || ''} ${(request.selectedText || '').slice(0, 1_000)}`;
  if (subject.trim().length < 4) return false;
  return /(?:前端|浏览器|javascript|typescript|react|vue|css|html|node|web|网络|工程|架构|测试|性能|安全|可访问|数据|算法|ai|人工智能|模型|llm|agent|智能体|提示词|推理|微任务|宏任务|异步|api)/iu.test(subject);
}

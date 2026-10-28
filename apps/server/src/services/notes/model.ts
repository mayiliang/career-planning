/** AI 笔记流、最终正文校验与明确标注的本地排版降级。 */
import { consumeSseData } from '../../ai/sse.js';
import { aiThinkingRequestOption, config } from '../../config/index.js';
import type { NotePointContext } from './types.js';
import { z } from 'zod';

const OrganizedNoteResponseSchema = z.object({
  organizedMarkdown: z.string().trim().min(1).max(200_000),
  review: z.object({
    corrections: z.array(z.string()).optional(),
    additions: z.array(z.string()).optional(),
    uncertainItems: z.array(z.string()).optional(),
    sourceGrounded: z.boolean().optional(),
  }).default({}),
});

export async function requestOrganizedNoteStream(
  point: NotePointContext,
  originalMd: string,
  onDelta: (delta: string) => void,
  onStatus: (message: string) => void,
  onThinking: (delta: string) => void,
  externalSignal?: AbortSignal,
  finalOnly = false,
) {
  if (externalSignal?.aborted) throw new DOMException('已停止本次整理', 'AbortError');
  const controller = new AbortController();
  const totalTimeoutMs = Math.max(config.DEEPSEEK_TIMEOUT_MS, 300_000);
  let abortReason: 'START_TIMEOUT' | 'IDLE_TIMEOUT' | 'TOTAL_TIMEOUT' | null = null;
  const startTimeout = setTimeout(() => { abortReason = 'START_TIMEOUT'; controller.abort(); }, 45_000);
  const totalTimeout = setTimeout(() => { abortReason = 'TOTAL_TIMEOUT'; controller.abort(); }, totalTimeoutMs);
  const abort = () => controller.abort();
  externalSignal?.addEventListener('abort', abort, { once: true });
  let idleTimer: ReturnType<typeof setInterval> | undefined;
  try {
    const response = await fetch(`${config.DEEPSEEK_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.DEEPSEEK_MODEL,
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
        stream: true,
        ...(finalOnly ? { thinking: { type: 'disabled' } } : aiThinkingRequestOption()),
        reasoning_effort: 'low',
        stream_options: { include_usage: true },
        messages: [
          { role: 'system', content: '你是严谨的中文前端学习笔记编辑。只能依据用户原笔记和给定学习资料核对；不得把不确定内容伪装成事实。原文永不被你覆盖。只返回 JSON，并且必须先输出 organizedMarkdown 字段，以便界面流式展示。如果模型支持独立思考通道，思考通道只写核对计划、证据和取舍，不要在思考通道撰写完整整理稿；完整整理稿必须出现在最终 content 的 organizedMarkdown 中。' },
          { role: 'user', content: `请整理下面知识点笔记。要求：使用规范 Markdown；结构清晰、中文表达、纠正有资料依据的错误、补齐资料明确覆盖的重要遗漏；任何无法由资料确认的内容放入 uncertainItems。\n\n知识点：${point.code} ${point.title}\n\n用户原笔记：\n${originalMd.slice(0, 12000)}\n\n学习资料：\n${point.studyMaterialMd?.slice(0, 12000) || ''}\n\n通过标准：\n${point.passCriteriaMd?.slice(0, 3000) || ''}\n\n严格按字段顺序返回：{"organizedMarkdown":"...","review":{"corrections":["..."],"additions":["..."],"uncertainItems":["..."],"sourceGrounded":true}}` },
        ],
      }),
    });
    clearTimeout(startTimeout);
    if (!response.ok) throw new Error(`AI 服务返回 ${response.status}`);
    if (!response.body) throw new Error('AI 服务没有返回可读取的流');
    onStatus('AI 已连接，正在分析笔记和对应学习资料');
    let content = '';
    let emittedLength = 0;
    let lastActivityAt = Date.now();
    let receivedFirstContent = false;
    idleTimer = setInterval(() => {
      if (Date.now() - lastActivityAt > 60_000) {
        abortReason = 'IDLE_TIMEOUT';
        controller.abort();
      }
    }, 5_000);
    await consumeSseData(response.body, (data) => {
      const packet = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string; reasoning_content?: string; reasoning?: string }; finish_reason?: string | null }> };
      const choice = packet.choices?.[0];
      const delta = choice?.delta;
      const thinkingDelta = delta?.reasoning_content ?? delta?.reasoning ?? '';
      const contentDelta = delta?.content ?? '';
      if (thinkingDelta) {
        onThinking(thinkingDelta);
        onStatus('AI 正在分析资料、核对事实与组织结构');
      }
      content += contentDelta;
      if (contentDelta && !receivedFirstContent) {
        receivedFirstContent = true;
        onStatus('AI 已开始输出，正在逐段整理 Markdown');
      }
      if (content.length > 200_000) throw new Error('AI 整理结果过长，已停止生成');
      const partial = extractPartialJsonString(content, 'organizedMarkdown');
      if (partial.value.length > emittedLength) {
        onDelta(partial.value.slice(emittedLength));
        emittedLength = partial.value.length;
      }
      if (choice?.finish_reason === 'length') throw new Error('AI 最终正文达到输出上限，内容不完整');
    }, { signal: controller.signal, onActivity: () => { lastActivityAt = Date.now(); } });
    if (!content.trim()) throw new Error('AI 没有返回整理结果');
    const parsed = OrganizedNoteResponseSchema.parse(JSON.parse(content.replace(/^```json\s*|\s*```$/g, '')));
    if (parsed.organizedMarkdown.length > emittedLength) onDelta(parsed.organizedMarkdown.slice(emittedLength));
    return { organizedMarkdown: parsed.organizedMarkdown, review: parsed.review, mode: 'AI' as const };
  } catch (reason) {
    if (externalSignal?.aborted) throw new DOMException('已停止本次整理', 'AbortError');
    if (reason instanceof z.ZodError) throw new Error('AI 整理结果字段不符合要求，无法作为已核验的候选稿保存。');
    if (abortReason === 'START_TIMEOUT') throw new Error('AI 在 45 秒内没有建立响应');
    if (abortReason === 'IDLE_TIMEOUT') throw new Error('AI 输出中断超过 60 秒');
    if (abortReason === 'TOTAL_TIMEOUT') throw new Error('AI 整理超过最长处理时间');
    if (reason instanceof Error && reason.name === 'AbortError') throw new Error('AI 请求被意外中止');
    throw reason;
  } finally {
    clearTimeout(startTimeout);
    clearTimeout(totalTimeout);
    if (idleTimer) clearInterval(idleTimer);
    externalSignal?.removeEventListener('abort', abort);
  }
}

export function isIncompleteAiFinalAnswer(reason: unknown) {
  if (reason instanceof SyntaxError) return true;
  return reason instanceof Error && /没有返回整理结果|缺少正文|达到输出上限|结果过长|JSON|Unexpected end/i.test(reason.message);
}

/** 从仍在生成的 JSON 字符串字段中安全提取已完整解码的部分。 */
export function extractPartialJsonString(source: string, field: string) {
  const marker = new RegExp(`"${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:\\s*"`).exec(source);
  if (!marker) return { value: '', complete: false };
  let value = '';
  const start = marker.index + marker[0].length;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]!;
    if (char === '"') return { value, complete: true };
    if (char !== '\\') { value += char; continue; }
    const escaped = source[index + 1];
    if (escaped == null) break;
    if (escaped === 'u') {
      const hex = source.slice(index + 2, index + 6);
      if (!/^[\da-fA-F]{4}$/.test(hex)) break;
      value += String.fromCharCode(Number.parseInt(hex, 16));
      index += 5;
      continue;
    }
    value += ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' } as Record<string, string>)[escaped] ?? escaped;
    index += 1;
  }
  return { value, complete: false };
}

export function localOrganizedDraft(point: NotePointContext, originalMd: string, reason = '当前未配置 AI，以上内容仅做结构化排版，尚未完成事实核验。') {
  return {
    organizedMarkdown: `# ${point.title}\n\n## 我的原始记录\n\n${originalMd.trim()}\n\n## 待核对与补充\n\n- ${reason}`,
    review: { corrections: [], additions: [], uncertainItems: [reason], sourceGrounded: false },
    mode: 'LOCAL_FALLBACK' as const,
  };
}


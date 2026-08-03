/**
 * DeepSeek Provider 实现
 * 
 * Phase 5 实现：调用 DeepSeek API 进行评分
 */
import type { AIProvider, AIProviderConfig, AIResponse, GradingRequest } from './provider.js';
import { SYSTEM_PROMPT_TEMPLATE, buildGradingUserMessage } from './provider.js';
import { AssessmentGradingOutputSchema, type AssessmentGradingOutput } from '@career-atlas/shared';

// ===== DeepSeek API 响应类型 =====

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: DeepSeekMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ===== DeepSeek Provider =====

export class DeepSeekProvider implements AIProvider {
  readonly name: string;
  readonly model: string;
  
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  
  constructor(config: AIProviderConfig) {
    this.name = config.name;
    this.model = config.model;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries;
  }
  
  async grade(
    request: GradingRequest,
    onProgress: (message: string, receivedChars?: number) => void = () => {},
    signal?: AbortSignal,
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE;
    const userMessage = buildGradingUserMessage(request);
    
    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];
    
    // 构建请求体
    const body = {
      model: this.model,
      messages,
      temperature: 0.1, // 低温度减少随机性
      response_format: { type: 'json_object' },
      max_tokens: 8000,
      // DeepSeek 特有参数
      thinking: { type: 'disabled' },
      reasoning_effort: 'low',
      stream: true,
      stream_options: { include_usage: true },
    };
    
    // 发起请求（带重试）
    let response = await this.requestWithRetry(body, onProgress, signal);
    
    const responseTime = Date.now() - startTime;
    
    // 解析响应
    const choice = response.choices[0];
    if (!choice) {
      return {
        rawContent: '',
        parsedOutput: null,
        parseSuccess: false,
        parseError: 'No choices in response',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        provider: this.name,
        model: this.model,
        responseTime,
      };
    }
    
    // 检查 finish_reason。长答案或逐题意见容易让 JSON 被截断，被截断时直接重判为更短 JSON。
    if (choice.finish_reason === 'length') {
      response = await this.requestWithRetry({
        ...body,
        max_tokens: 8000,
        messages: buildCompactRetryMessages(messages),
      }, onProgress, signal);
    }
    
    let rawContent = response.choices[0]?.message.content ?? '';
    let parsed = parseGradingOutput(rawContent);

    // JSON mode只保证语法正确，不保证业务 Schema 正确。失败时给模型一次结构修复机会。
    if (!parsed.parseSuccess) {
      const repairMessages: DeepSeekMessage[] = [
        ...messages,
        { role: 'assistant', content: rawContent },
        {
          role: 'user',
          content: `上一个 JSON 未通过结构校验：${parsed.parseError}\n请保留原评分结论，只修复字段结构。只返回完整 JSON 对象。`,
        },
      ];
      response = await this.requestWithRetry({ ...body, messages: repairMessages, thinking: { type: 'disabled' } }, onProgress, signal);
      rawContent = response.choices[0]?.message.content ?? '';
      parsed = parseGradingOutput(rawContent);
    }
    
    return {
      rawContent,
      parsedOutput: parsed.parsedOutput,
      parseSuccess: parsed.parseSuccess,
      parseError: parsed.parseError,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      provider: this.name,
      model: this.model,
      responseTime,
    };
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  private async requestWithRetry(
    body: unknown,
    onProgress: (message: string, receivedChars?: number) => void,
    signal?: AbortSignal,
  ): Promise<DeepSeekResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const abortFromCaller = () => controller.abort();
      signal?.addEventListener('abort', abortFromCaller, { once: true });
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          
          // 429 Rate Limited - 等待后重试
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000 * (attempt + 1);
            
            if (attempt < this.maxRetries) {
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }
          
          // 5xx - 指数退避重试
          if (response.status >= 500 && attempt < this.maxRetries) {
            const waitTime = 1000 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        if (!response.body) throw new Error('AI stream has no response body');
        return await this.readStreamingResponse(response, onProgress);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (signal?.aborted) throw lastError;
        
        // 超时或网络错误 - 重试
        if (attempt < this.maxRetries) {
          const waitTime = 1000 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', abortFromCaller);
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  private async readStreamingResponse(
    response: Response,
    onProgress: (message: string, receivedChars?: number) => void,
  ): Promise<DeepSeekResponse> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let finishReason = 'stop';
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const consume = (frame: string) => {
      const data = frame.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
      if (!data || data === '[DONE]') return;
      try {
        const chunk = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
          usage?: DeepSeekResponse['usage'];
        };
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          content += delta;
          onProgress('AI 正在逐题核对并生成结构化反馈', content.length);
        }
        if (chunk.choices?.[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason!;
        if (chunk.usage) usage = chunk.usage;
      } catch { /* 忽略供应商心跳帧 */ }
    };
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      for (const frame of frames) consume(frame);
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
    return {
      id: '', object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: this.model,
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: finishReason }], usage,
    };
  }
}

function buildCompactRetryMessages(messages: DeepSeekMessage[]): DeepSeekMessage[] {
  return [
    ...messages,
    {
      role: 'user',
      content: [
        '上一轮评分输出因为长度限制被截断。',
        '请重新完成同一份评分，只返回完整 JSON 对象。',
        '强制压缩输出：summary <= 80 字；findings 最多 5 项；weaknesses 最多 3 项；每题 correctParts/incorrectParts/missingParts 各最多 1 项；每题 referenceAnswer <= 120 字；nextAction <= 60 字。',
        '不要输出 Markdown、解释前言或代码围栏。',
      ].join('\n'),
    },
  ];
}

function parseGradingOutput(rawContent: string): {
  parsedOutput: AssessmentGradingOutput | null;
  parseSuccess: boolean;
  parseError?: string;
} {
  try {
    const json = JSON.parse(rawContent);
    const validated = AssessmentGradingOutputSchema.safeParse(json);
    if (validated.success) {
      return { parsedOutput: validated.data, parseSuccess: true };
    }
    const issues = validated.error.issues
      .slice(0, 8)
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ');
    return { parsedOutput: null, parseSuccess: false, parseError: `Schema validation failed: ${issues}` };
  } catch (error) {
    return {
      parsedOutput: null,
      parseSuccess: false,
      parseError: `JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

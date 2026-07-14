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
  
  async grade(request: GradingRequest): Promise<AIResponse> {
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
      max_tokens: 6000,
      // DeepSeek 特有参数
      thinking: { type: 'enabled' },
      reasoning_effort: 'high',
    };
    
    // 发起请求（带重试）
    let response = await this.requestWithRetry(body);
    
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
    
    // 检查 finish_reason
    if (choice.finish_reason === 'length') {
      return {
        rawContent: choice.message.content,
        parsedOutput: null,
        parseSuccess: false,
        parseError: 'Response truncated due to length limit',
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
    
    let rawContent = choice.message.content;
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
      response = await this.requestWithRetry({ ...body, messages: repairMessages, thinking: { type: 'disabled' } });
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
  
  private async requestWithRetry(body: unknown): Promise<DeepSeekResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
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
        
        return await response.json() as DeepSeekResponse;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // 超时或网络错误 - 重试
        if (attempt < this.maxRetries) {
          const waitTime = 1000 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }
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

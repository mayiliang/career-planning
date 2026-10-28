/** 服务端错误与浏览器传输错误共用的可识别错误类型。 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly requestId: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface AssistantErrorDiagnostic {
  incidentId: string;
  code: string;
  stage: string;
  elapsedMs: number;
  retryable: boolean;
}

export class AssistantStreamError extends Error {
  constructor(message: string, readonly diagnostic: AssistantErrorDiagnostic) {
    super(message);
    this.name = 'AssistantStreamError';
  }
}

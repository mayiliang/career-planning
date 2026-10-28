export interface NotePointContext {
  code: string;
  title: string;
  domainCode: string;
  summary: string | null;
  studyMaterialMd?: string;
  passCriteriaMd?: string;
}

export interface NoteSnapshot {
  code: string;
  id: string;
  originalMd: string;
  versionNo: number;
}

export class NoteConflictError extends Error {
  readonly statusCode = 409;
  readonly code = 'NOTE_CONFLICT';

  constructor(message = '笔记已更新，本次整理结果未保存，请基于最新原文重新整理。') {
    super(message);
    this.name = 'NoteConflictError';
  }
}

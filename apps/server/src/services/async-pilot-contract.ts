import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectRoot } from '../config/index.js';
import type { buildAsyncPilotContext } from './async-pilot-context.js';

export function legacyAsyncContract(code: string): string | null {
  if (!['JS-04', 'JS-05'].includes(code)) return null;
  const contracts = JSON.parse(readFileSync(resolve(projectRoot, 'docs/knowledge/assessment-contracts/async-v1.json'), 'utf8')) as Record<string, string>;
  return contracts[code] ?? null;
}
export type AsyncContractSnapshot = {
  assessmentSpecMd: string; passCriteriaMd: string; studyMaterialMd: string;
  materialContext: NonNullable<ReturnType<typeof buildAsyncPilotContext>>;
};
/** 旧挑战只看旧题源；不拿新合同、当前讲义补写历史证据。 */
export function asyncGradingSources(code: string, questions: Array<{ questionContent: string }>) {
  if (!['JS-04', 'JS-05'].includes(code)) return null;
  const parsed = questions.map(q => JSON.parse(q.questionContent) as { contractVersion?: string; contractSnapshot?: AsyncContractSnapshot });
  const snapshot = parsed.find(q => q.contractSnapshot)?.contractSnapshot;
  if (snapshot) {
    if (!snapshot.materialContext.complete) throw new Error('挑战保存的机制依据不足，不能进行语义评分。');
    return { rubric: snapshot.assessmentSpecMd, passCriteria: snapshot.passCriteriaMd,
      studyMaterial: `${snapshot.studyMaterialMd}\n\n创建挑战时保存的完整机制段落：\n${snapshot.materialContext.sections.map(s => `【${s.source}】\n${s.content}`).join('\n\n')}` };
  }
  if (parsed.some(q => q.contractVersion === 'async-v2')) throw new Error('新版挑战缺少创建时的合同快照，不能用当前内容替代。');
  const legacy = legacyAsyncContract(code)!;
  const field = (name: string) => legacy.split(`- ${name}：`)[1]?.split('\n')[0] ?? '';
  return { rubric: field('严格考核'), passCriteria: field('通过标准'), studyMaterial: `${field('学习资料')}\n历史 async-v1：仅使用已保存题目中的 sourceBasis；不加载更新后的讲义。旧题存在已记录的时间线歧义时应人工复核，不按 async-v2 重新解释。` };
}

// 研究采集器：实际服务边界截获，不访问模型。仅运行仓库内隔离测试库。
import { it, expect, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { executeImport } from '../../../../apps/server/src/services/import.service.js';
import { getKnowledgePointByCode } from '../../../../apps/server/src/services/knowledge.service.js';
import { validatePracticeAttempt } from '../../../../apps/server/src/services/practice.service.js';
import { PRACTICE_SECTION_HEADINGS } from '../../../../apps/server/src/services/learning-content.service.js';
import { createAssessmentSession } from '../../../../apps/server/src/services/assessment.service.js';
import { gradeAssessment } from '../../../../apps/server/src/services/grading.service.js';
import { FakeProvider } from '../../../../apps/server/src/ai/fake.js';
import { config } from '../../../../apps/server/src/config/index.js';
import { rawDb } from '../../../../apps/server/src/db/index.js';
import { buildRelationDefinitions, KNOWLEDGE_ROUTE_INDEX } from '../../../../apps/server/src/services/knowledge-relations.service.js';
import { extractLocalMaterialContext } from '../../../../apps/server/src/services/learning-material-context.service.js';
const codes = ['REACT-02','REACT-03','REACT-04','VUE-02','VUE-03','VUE-04','VUE-05'];
const save=(name:string,value:unknown)=>writeFileSync(resolve('docs/auto-coding/evidence/framework-foundation-route',name),JSON.stringify(value,null,2)+'\n');
it('捕获七点题源及代表性真实练习/评分输入',async()=>{
 await executeImport();
 const inventory=[];
 for(const code of codes){
  const point=(await getKnowledgePointByCode(code))!;
  const sections=extractLocalMaterialContext(point.studyMaterialMd);
  inventory.push({code,studyMaterialMd:point.studyMaterialMd,assessmentSpecMd:point.assessmentSpecMd,passCriteriaMd:point.passCriteriaMd,sections,prerequisites:buildRelationDefinitions().filter(r=>r.type==='PREREQUISITE'&&r.target===code)});
 }
 save('source-inventory.json',inventory);
 save('legacy-route-map.json',{baseline:'81a7fb6',runtime:[...KNOWLEDGE_ROUTE_INDEX].map(([code,position])=>({code,...position}))});
 const submission={submissionMd:[...new Set(Object.values(PRACTICE_SECTION_HEADINGS).flat())].map(h=>`# ${h}\n研究用结构占位，未执行学习任务，不代表语义正确。固定输入和预期与实际证据待人工核对。`).join('\n'),code:'const fixedInput=0; const expected=1; const actual=1; console.assert(actual===expected);',executionOutput:'fixedInput=0 expected=1 actual=1；研究占位，不构成语义验证',executionStatus:'SUCCESS' as const};
 for(const code of ['REACT-04','VUE-02','VUE-04']){
  const mock=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,init)=>{
   save(`${code}-practice-request.json`,{mode:'实际 fetch 请求体；模拟响应不证明语义正确',body:JSON.parse(String(init?.body))});
   return new Response('data: '+JSON.stringify({choices:[{delta:{content:JSON.stringify({passed:false,summary:'研究模拟响应',checks:[],nextAction:'人工核验'})}}]})+'\n\ndata: [DONE]\n\n');
  });
  config.DEEPSEEK_API_KEY='isolated-placeholder';
  try { await validatePracticeAttempt(code,'strict-practice',submission); expect(mock).toHaveBeenCalledTimes(1); } finally {config.DEEPSEEK_API_KEY='';mock.mockRestore();}
  rawDb.prepare("UPDATE knowledge_points SET learning_state='LEARNED' WHERE code=?").run(code);
  const created=await createAssessmentSession({knowledgePointCode:code,type:'FIRST',durationMinutes:30,masteryStage:1,challengeMode:'PRACTICE',challengeProfile:'AUTO'});
  rawDb.prepare("UPDATE assessment_sessions SET status='SUBMITTED' WHERE id=?").run(created.session.id);
  const grading=vi.spyOn(FakeProvider.prototype,'grade').mockImplementation(async request=>{save(`${code}-challenge-request.json`,{mode:'实际评分服务 Provider 边界；未调用模型',request});throw new Error('研究捕获结束');});
  try {await expect(gradeAssessment({sessionId:created.session.id,provider:'fake'})).rejects.toThrow('研究捕获结束');}finally{grading.mockRestore();}
 }
});

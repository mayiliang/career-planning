/** 学习知识点查询与显示字段；路线和状态模块共用同一投影。 */
import { rawDb } from '../../db/index.js';
import { KNOWLEDGE_ROUTE_INDEX } from '../knowledge-relations.service.js';

export type LearningState = 'NOT_STARTED' | 'LEARNING' | 'LEARNED' | 'DEFERRED';
export type ChallengeProfile = 'THEORY_ONLY' | 'EXAMPLE_DRIVEN' | 'CODING' | 'DEBUGGING' | 'TOOL_OPERATION' | 'DESIGN_CASE';

export type PointRow = {
  id: string;
  code: string;
  title: string;
  domainCode: string;
  domainTitle: string;
  learningState: LearningState;
  masteryLevel: number;
  currentFocus: number;
  learnedAt: string | null;
  deferReason: string | null;
  planWeek: number | null;
  studyMinutes: number;
  practiceMinutes: number;
  projectMinutes: number;
  assessmentMinutes: number;
  summary: string | null;
  assessmentSpecMd?: string;
};

export const pointSelect = `
  SELECT kp.id, kp.code, kp.title, kd.code AS domainCode, kd.title AS domainTitle,
    kp.learning_state AS learningState, kp.mastery_level AS masteryLevel,
    kp.current_focus AS currentFocus, kp.learned_at AS learnedAt,
    kp.defer_reason AS deferReason, kp.plan_week AS planWeek,
    kp.study_minutes AS studyMinutes, kp.practice_minutes AS practiceMinutes,
    kp.project_minutes AS projectMinutes, kp.assessment_minutes AS assessmentMinutes,
    kp.summary, kp.assessment_spec_md AS assessmentSpecMd
  FROM knowledge_points kp JOIN knowledge_domains kd ON kd.id = kp.domain_id`;

export function requirePoint(code: string): PointRow {
  const row = rawDb.prepare(`${pointSelect} WHERE kp.code = ? LIMIT 1`).get(code) as PointRow | undefined;
  if (!row) throw new Error(`知识点不存在：${code}`);
  return row;
}

export function enrichPoint(point: PointRow) {
  const profile = inferChallengeProfile(point.code, point.title, point.domainTitle, point.assessmentSpecMd);
  const route = KNOWLEDGE_ROUTE_INDEX.get(point.code);
  return {
    ...point,
    // 不回退到旧数据库周次，避免专项点重新混入求职优先核心路线。
    planWeek: route?.week ?? null,
    currentFocus: Boolean(point.currentFocus),
    masteryLevel: Math.max(0, Math.min(4, point.masteryLevel || 0)),
    estimatedMinutes: point.studyMinutes + point.practiceMinutes + (profile === 'THEORY_ONLY' ? 0 : point.projectMinutes),
    challengeProfile: profile,
    challengeProfileLabel: profileLabel(profile),
    practiceRecommended: !['THEORY_ONLY'].includes(profile),
    learningApproach: approachFor(profile),
  };
}

export function compareRouteOrder(left: Pick<PointRow, 'code'>, right: Pick<PointRow, 'code'>) {
  return (KNOWLEDGE_ROUTE_INDEX.get(left.code)?.order ?? Number.MAX_SAFE_INTEGER)
    - (KNOWLEDGE_ROUTE_INDEX.get(right.code)?.order ?? Number.MAX_SAFE_INTEGER)
    || left.code.localeCompare(right.code);
}

export function inferChallengeProfile(code: string, title: string, domainTitle: string, assessmentSpecMd?: string): ChallengeProfile {
  const explicit = assessmentSpecMd?.match(/(?:^|\n)\s*(?:[-*]\s*)?挑战类型\s*[：:]\s*(THEORY_ONLY|EXAMPLE_DRIVEN|CODING|DEBUGGING|TOOL_OPERATION|DESIGN_CASE)\s*[；;]?/);
  if (explicit?.[1]) return explicit[1] as ChallengeProfile;
  const value = `${code} ${title} ${domainTitle}`.toLowerCase();
  if (/伦理|法规|合规|隐私原则|概念边界|职业|影响力|判断|治理/.test(value)) return 'THEORY_ONLY';
  if (/git|docker|linux|ci\/cd|发布|部署|调试工具|mcp|openapi|工具链/.test(value)) return 'TOOL_OPERATION';
  if (/排错|调试|故障|监控|可观测|兼容|诊断/.test(value)) return 'DEBUGGING';
  if (/架构|设计系统|技术方案|权限模型|业务建模|安全模型|演进/.test(value)) return 'DESIGN_CASE';
  if (/\bjs-\d+|javascript|typescript|react|vue|css|html|node|算法|wasm|webgpu|组件|状态|hooks|数据层/.test(value)) return 'CODING';
  return 'EXAMPLE_DRIVEN';
}

function profileLabel(profile: ChallengeProfile) {
  return ({ THEORY_ONLY: '理解辨析型', EXAMPLE_DRIVEN: '示例驱动型', CODING: '编码验证型', DEBUGGING: '排错诊断型', TOOL_OPERATION: '工具操作型', DESIGN_CASE: '方案设计型' } as const)[profile];
}

function approachFor(profile: ChallengeProfile) {
  return ({
    THEORY_ONLY: '先建立概念、边界与反例；实战不是必选，案例辨析更合适。',
    EXAMPLE_DRIVEN: '先看最小示例，再回到文字解释机制，最后换一个例子复述。',
    CODING: '先理解机制，再运行最小代码、修改变量并观察结果。',
    DEBUGGING: '从可复现异常出发，形成“现象—假设—验证—修复”的证据链。',
    TOOL_OPERATION: '跟随一个真实工作流操作，保留命令、配置或产物作为证据。',
    DESIGN_CASE: '先读原则，再对一个具体场景做取舍并解释约束与代价。',
  } as const)[profile];
}

export function fieldDescription(domainTitle: string) {
  if (domainTitle.includes('AI')) return 'AI 原生应用与智能研发';
  if (domainTitle.includes('工程') || domainTitle.includes('部署')) return '前端工程化与交付';
  if (domainTitle.includes('React') || domainTitle.includes('Vue')) return '框架与应用开发';
  if (domainTitle.includes('架构')) return '架构与技术领导力';
  if (domainTitle.includes('体验') || domainTitle.includes('设计')) return '组件、设计系统与体验';
  return domainTitle;
}


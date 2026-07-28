/**
 * 知识点学习耗时估算。
 *
 * 所有数值都按 15 分钟取整，便于直接放入日历。默认值来自知识领域的实践强度，
 * Markdown 中的“预计耗时”可以覆盖自动估算。
 */
export interface KnowledgeEffort {
  studyMinutes: number;
  practiceMinutes: number;
  projectMinutes: number;
  assessmentMinutes: number;
  retestMinutes: number;
  estimatedTotalMinutes: number;
}

type EffortComponents = Omit<KnowledgeEffort, 'estimatedTotalMinutes'>;

const DEFAULT_EFFORT: EffortComponents = {
  studyMinutes: 105,
  practiceMinutes: 165,
  projectMinutes: 150,
  assessmentMinutes: 90,
  retestMinutes: 75,
};

const EFFORT_BY_PREFIX: Record<string, EffortComponents> = {
  JS: { studyMinutes: 90, practiceMinutes: 150, projectMinutes: 135, assessmentMinutes: 90, retestMinutes: 75 },
  WEB: { studyMinutes: 90, practiceMinutes: 150, projectMinutes: 135, assessmentMinutes: 90, retestMinutes: 75 },
  A11Y: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  BROWSER: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  NET: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 105, retestMinutes: 75 },
  SEC: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 150, assessmentMinutes: 105, retestMinutes: 90 },
  TS: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 135, assessmentMinutes: 90, retestMinutes: 75 },
  VUE: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  REACT: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  UMI: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  ANTD: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  BIZ: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 165, assessmentMinutes: 90, retestMinutes: 75 },
  ENG: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  TEST: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  OBS: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  PERF: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  H5: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  HYBRID: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  COMP: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 180, assessmentMinutes: 105, retestMinutes: 90 },
  DS: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 180, assessmentMinutes: 105, retestMinutes: 90 },
  PLATFORM: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 180, assessmentMinutes: 105, retestMinutes: 90 },
  NODE: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  API: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  MCP: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  AI: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  AIAPP: { studyMinutes: 135, practiceMinutes: 195, projectMinutes: 180, assessmentMinutes: 105, retestMinutes: 90 },
  AGENT: { studyMinutes: 135, practiceMinutes: 195, projectMinutes: 180, assessmentMinutes: 105, retestMinutes: 90 },
  WEBAI: { studyMinutes: 135, practiceMinutes: 195, projectMinutes: 180, assessmentMinutes: 105, retestMinutes: 90 },
  AIDEV: { studyMinutes: 135, practiceMinutes: 195, projectMinutes: 180, assessmentMinutes: 105, retestMinutes: 90 },
  LINUX: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 105, retestMinutes: 75 },
  DOCKER: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 180, assessmentMinutes: 105, retestMinutes: 90 },
  DEPLOY: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 180, assessmentMinutes: 105, retestMinutes: 90 },
  RENDER: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  EDGE: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  DATA: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  REALTIME: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  COLLAB: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  PWA: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  GQL: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  GRAPHICS: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  VIS: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  ANALYTICS: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  EXP: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  I18N: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  CONTENT: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  COMPAT: { studyMinutes: 105, practiceMinutes: 165, projectMinutes: 150, assessmentMinutes: 90, retestMinutes: 75 },
  IDENTITY: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  PRIVACY: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  AIPROD: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  AISAFE: { studyMinutes: 135, practiceMinutes: 195, projectMinutes: 180, assessmentMinutes: 105, retestMinutes: 90 },
  AIGOV: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  ARCH: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 180, assessmentMinutes: 105, retestMinutes: 90 },
  LEAD: { studyMinutes: 105, practiceMinutes: 150, projectMinutes: 210, assessmentMinutes: 105, retestMinutes: 90 },
  BACKEND: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 165, assessmentMinutes: 105, retestMinutes: 90 },
  CLOUD: { studyMinutes: 120, practiceMinutes: 180, projectMinutes: 180, assessmentMinutes: 105, retestMinutes: 90 },
  CAREER: { studyMinutes: 105, practiceMinutes: 150, projectMinutes: 210, assessmentMinutes: 105, retestMinutes: 90 },
};

function withTotal(effort: EffortComponents): KnowledgeEffort {
  return {
    ...effort,
    estimatedTotalMinutes: effort.studyMinutes + effort.practiceMinutes + effort.projectMinutes + effort.assessmentMinutes,
  };
}

/** 根据知识编号给出稳定、可解释的默认估算。 */
export function estimateKnowledgeEffort(code: string): KnowledgeEffort {
  const prefix = code.split('-')[0] ?? '';
  return withTotal(EFFORT_BY_PREFIX[prefix] ?? DEFAULT_EFFORT);
}

/**
 * 解析：资料 45 分钟；练习 90 分钟；项目 60 分钟；考核 45 分钟；复测 30 分钟
 */
export function parseKnowledgeEffort(value: string): KnowledgeEffort | null {
  const read = (labels: string[]) => {
    for (const label of labels) {
      const match = value.match(new RegExp(`${label}\\s*(\\d+)\\s*分钟`));
      if (match?.[1]) return Number(match[1]);
    }
    return null;
  };
  const effort: EffortComponents = {
    studyMinutes: read(['资料', '学习']) ?? 0,
    practiceMinutes: read(['练习', '实验']) ?? 0,
    projectMinutes: read(['项目', '产出']) ?? 0,
    assessmentMinutes: read(['考核', '首考']) ?? 0,
    retestMinutes: read(['复测']) ?? 0,
  };
  if (Object.values(effort).some((minutes) => !Number.isInteger(minutes) || minutes <= 0)) return null;
  return withTotal(effort);
}

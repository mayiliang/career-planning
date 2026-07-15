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
  studyMinutes: 45,
  practiceMinutes: 75,
  projectMinutes: 60,
  assessmentMinutes: 45,
  retestMinutes: 30,
};

const EFFORT_BY_PREFIX: Record<string, EffortComponents> = {
  JS: { studyMinutes: 45, practiceMinutes: 75, projectMinutes: 45, assessmentMinutes: 45, retestMinutes: 30 },
  WEB: { studyMinutes: 45, practiceMinutes: 60, projectMinutes: 45, assessmentMinutes: 45, retestMinutes: 30 },
  A11Y: { studyMinutes: 45, practiceMinutes: 75, projectMinutes: 60, assessmentMinutes: 45, retestMinutes: 30 },
  BROWSER: { studyMinutes: 45, practiceMinutes: 90, projectMinutes: 60, assessmentMinutes: 45, retestMinutes: 30 },
  NET: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 60, assessmentMinutes: 60, retestMinutes: 45 },
  SEC: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 60, assessmentMinutes: 60, retestMinutes: 45 },
  TS: { studyMinutes: 45, practiceMinutes: 90, projectMinutes: 60, assessmentMinutes: 45, retestMinutes: 30 },
  VUE: { studyMinutes: 45, practiceMinutes: 90, projectMinutes: 75, assessmentMinutes: 45, retestMinutes: 30 },
  REACT: { studyMinutes: 45, practiceMinutes: 90, projectMinutes: 75, assessmentMinutes: 45, retestMinutes: 30 },
  UMI: { studyMinutes: 45, practiceMinutes: 75, projectMinutes: 75, assessmentMinutes: 45, retestMinutes: 30 },
  ANTD: { studyMinutes: 45, practiceMinutes: 75, projectMinutes: 75, assessmentMinutes: 45, retestMinutes: 30 },
  BIZ: { studyMinutes: 45, practiceMinutes: 75, projectMinutes: 75, assessmentMinutes: 45, retestMinutes: 30 },
  ENG: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 75, assessmentMinutes: 60, retestMinutes: 45 },
  TEST: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 75, assessmentMinutes: 60, retestMinutes: 45 },
  OBS: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 75, assessmentMinutes: 60, retestMinutes: 45 },
  PERF: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 75, assessmentMinutes: 60, retestMinutes: 45 },
  H5: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 75, assessmentMinutes: 60, retestMinutes: 45 },
  HYBRID: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 75, assessmentMinutes: 60, retestMinutes: 45 },
  COMP: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 90, assessmentMinutes: 60, retestMinutes: 45 },
  DS: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 90, assessmentMinutes: 60, retestMinutes: 45 },
  PLATFORM: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 90, assessmentMinutes: 60, retestMinutes: 45 },
  NODE: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 75, assessmentMinutes: 60, retestMinutes: 45 },
  API: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 75, assessmentMinutes: 60, retestMinutes: 45 },
  MCP: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 75, assessmentMinutes: 60, retestMinutes: 45 },
  AI: { studyMinutes: 60, practiceMinutes: 90, projectMinutes: 75, assessmentMinutes: 60, retestMinutes: 45 },
  AIAPP: { studyMinutes: 75, practiceMinutes: 105, projectMinutes: 90, assessmentMinutes: 60, retestMinutes: 45 },
  AGENT: { studyMinutes: 75, practiceMinutes: 105, projectMinutes: 90, assessmentMinutes: 60, retestMinutes: 45 },
  WEBAI: { studyMinutes: 75, practiceMinutes: 105, projectMinutes: 90, assessmentMinutes: 60, retestMinutes: 45 },
  AIDEV: { studyMinutes: 75, practiceMinutes: 105, projectMinutes: 90, assessmentMinutes: 60, retestMinutes: 45 },
  CAREER: { studyMinutes: 45, practiceMinutes: 60, projectMinutes: 120, assessmentMinutes: 60, retestMinutes: 45 },
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

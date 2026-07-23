import { randomUUID } from 'crypto';
import { rawDb } from '../db/index.js';

export type RelationDefinition = {
  source: string;
  target: string;
  type: 'PREREQUISITE' | 'RELATED' | 'COMPARES_WITH' | 'APPLIED_WITH';
  description: string;
  weight: number;
};

/**
 * 每个领域的推荐学习顺序。相邻节点会形成持久化的前置关系，
 * 这份清单同时是计划编排和关系图谱的顺序来源。
 */
export const KNOWLEDGE_PATHS: string[][] = [
  ['JS-01', 'JS-02', 'JS-03', 'JS-04', 'JS-05', 'JS-06', 'WEB-01', 'WEB-02', 'WEB-03', 'A11Y-01', 'BROWSER-01', 'WEB-04', 'NET-01', 'SEC-01', 'SEC-02', 'SEC-03'],
  ['TS-01', 'TS-02', 'TS-03', 'TS-04', 'TS-05', 'TS-06', 'TS-07', 'TS-08', 'TS-09'],
  ['REACT-01', 'REACT-02', 'REACT-03', 'REACT-04', 'REACT-05', 'REACT-06', 'REACT-07', 'REACT-08', 'REACT-09'],
  ['UMI-01', 'UMI-02', 'UMI-03', 'UMI-04', 'ANTD-01', 'ANTD-02', 'ANTD-03', 'ANTD-04'],
  ['BIZ-01', 'BIZ-02', 'BIZ-03', 'BIZ-04', 'BIZ-05', 'BIZ-06', 'BIZ-07', 'BIZ-08'],
  ['ENG-01', 'ENG-02', 'ENG-07', 'ENG-03', 'ENG-04', 'ENG-05', 'TEST-01', 'TEST-02', 'TEST-03', 'ENG-06', 'ENG-08', 'OBS-01'],
  ['PERF-01', 'PERF-02', 'PERF-03', 'PERF-04', 'H5-01', 'H5-02', 'HYBRID-01', 'H5-03', 'PERF-05'],
  ['COMP-01', 'COMP-02', 'DS-01', 'COMP-03', 'PLATFORM-01', 'PLATFORM-02', 'PLATFORM-03'],
  ['NODE-01', 'NODE-02', 'NODE-03', 'API-01', 'API-02', 'MCP-01', 'MCP-02', 'AI-01'],
  ['CAREER-01', 'CAREER-02', 'CAREER-03', 'CAREER-04', 'CAREER-05', 'CAREER-06'],
  ['VUE-01', 'VUE-02', 'VUE-03', 'VUE-04', 'VUE-05', 'VUE-06', 'VUE-07', 'VUE-08', 'VUE-09', 'VUE-10', 'VUE-11'],
  ['AIAPP-01', 'AIAPP-02', 'AIAPP-03', 'AIAPP-04', 'AIAPP-05', 'AIAPP-06', 'AIAPP-07', 'AIAPP-08', 'AIAPP-09', 'AIAPP-10'],
  ['AGENT-01', 'AGENT-02', 'AGENT-03', 'AGENT-04', 'AGENT-05', 'AGENT-06', 'AGENT-07', 'AGENT-08', 'AGENT-09', 'AGENT-10'],
  ['WEBAI-01', 'WEBAI-02', 'WEBAI-03', 'WEBAI-04', 'WEBAI-05', 'WEBAI-06', 'WEBAI-07', 'WEBAI-08', 'WEBAI-09', 'WEBAI-10'],
  ['AIDEV-01', 'AIDEV-02', 'AIDEV-03', 'AIDEV-04', 'AIDEV-05', 'AIDEV-06', 'AIDEV-07', 'AIDEV-08', 'AIDEV-09', 'AIDEV-10'],
  ['LINUX-01', 'LINUX-02', 'LINUX-03', 'LINUX-04', 'DOCKER-01', 'DOCKER-02', 'DOCKER-03', 'DOCKER-04', 'DEPLOY-01', 'DEPLOY-02'],
];

/**
 * 23 周执行路线：前 18 个阶段保持知识依赖顺序，后 5 周用于求职、项目资产和综合闸门。
 * 日历层会把 153 个知识点的显式分钟数连续切成 23 × 7 个 540 分钟学习桶。
 */
const PLAN_ROUTE = [
  ...(KNOWLEDGE_PATHS[0] ?? []),
  ...(KNOWLEDGE_PATHS[1] ?? []),
  ...(KNOWLEDGE_PATHS[10] ?? []),
  ...(KNOWLEDGE_PATHS[2] ?? []),
  ...(KNOWLEDGE_PATHS[3] ?? []),
  ...(KNOWLEDGE_PATHS[4] ?? []),
  ...(KNOWLEDGE_PATHS[5] ?? []),
  ...(KNOWLEDGE_PATHS[15] ?? []),
  ...(KNOWLEDGE_PATHS[6] ?? []),
  ...(KNOWLEDGE_PATHS[7] ?? []),
  ...(KNOWLEDGE_PATHS[8] ?? []),
  ...(KNOWLEDGE_PATHS[11] ?? []),
  ...(KNOWLEDGE_PATHS[12] ?? []),
  ...(KNOWLEDGE_PATHS[13] ?? []),
  ...(KNOWLEDGE_PATHS[14] ?? []),
  ...(KNOWLEDGE_PATHS[9] ?? []),
];

const WEEK_END_CODES = [
  'NET-01', 'TS-08', 'VUE-10', 'REACT-09', 'BIZ-04',
  'ENG-05', 'OBS-01', 'DEPLOY-02', 'H5-03', 'PLATFORM-03',
  'AI-01', 'AIAPP-08', 'AGENT-06', 'WEBAI-04', 'AIDEV-01',
  'AIDEV-09', 'CAREER-04', 'CAREER-06',
] as const;

export const LEARNING_WEEK_PATHS: Record<number, string[]> = {};
let routeCursor = 0;
for (let week = 1; week <= WEEK_END_CODES.length; week++) {
  const endIndex = PLAN_ROUTE.indexOf(WEEK_END_CODES[week - 1]!, routeCursor);
  LEARNING_WEEK_PATHS[week] = PLAN_ROUTE.slice(routeCursor, endIndex + 1);
  routeCursor = endIndex + 1;
}
LEARNING_WEEK_PATHS[19] = ['TS-08', 'REACT-09', 'BIZ-08', 'DEPLOY-02', 'AIAPP-08', 'AGENT-10', 'AIDEV-03', 'CAREER-06'];
LEARNING_WEEK_PATHS[20] = ['JS-04', 'TS-08', 'VUE-10', 'BIZ-08', 'TEST-03', 'DEPLOY-02', 'AIAPP-08', 'AGENT-10', 'AIDEV-03', 'CAREER-06'];

let globalRouteOrder = 0;
export const KNOWLEDGE_ROUTE_INDEX = new Map(
  Object.entries(LEARNING_WEEK_PATHS)
    .filter(([week]) => Number(week) <= 18)
    .flatMap(([week, path]) => path.map((code) => [code, {
      week: Number(week),
      order: globalRouteOrder++,
    }] as const)),
);

const crossPrerequisites: Array<[string, string, string]> = [
  ['JS-01', 'TS-01', 'TypeScript 建立在 JavaScript 运行模型之上'],
  ['JS-03', 'REACT-01', '不可变更新与值语义是理解 React 渲染的基础'],
  ['JS-04', 'REACT-04', '异步和事件循环是理解 Effect 外部同步的基础'],
  ['TS-03', 'REACT-05', '泛型与约束支撑类型安全的自定义 Hook'],
  ['TS-06', 'REACT-02', '函数与组件 API 类型决定组合边界'],
  ['JS-03', 'VUE-02', '值、引用与不可变更新帮助理解 Vue 响应式边界'],
  ['WEB-02', 'WEB-03', '先掌握布局与层叠，再建立现代 CSS 架构'],
  ['BROWSER-01', 'WEB-04', '原生分层 UI 与导航增强依赖浏览器事件、渲染和历史模型'],
  ['NET-01', 'SEC-03', 'Passkey 的 challenge、origin 与服务端验证依赖网络安全基础'],
  ['TS-03', 'VUE-04', '泛型与索引访问支撑类型安全的组件契约'],
  ['NET-01', 'UMI-03', '请求层设计需要 HTTP、缓存与取消基础'],
  ['TS-08', 'BIZ-03', '权限模型需要状态与动作的类型约束'],
  ['UMI-04', 'BIZ-03', '页面、按钮和数据权限是权限建模的应用入口'],
  ['ANTD-01', 'BIZ-05', '复杂表单是业务状态一致性的主要载体'],
  ['BIZ-08', 'ENG-05', '可追踪验收标准决定质量门禁'],
  ['TEST-03', 'ENG-06', '发布与回滚需要关键路径自动化证据'],
  ['ENG-06', 'OBS-01', '发布闭环必须通过真实用户监控验证生产结果'],
  ['ENG-03', 'ENG-08', '供应链治理建立在可重复安装和依赖边界之上'],
  ['ENG-06', 'DEPLOY-01', '部署交付需要发布、回滚和生产环境意识'],
  ['NET-01', 'LINUX-02', '端口、DNS、HTTP 与缓存排障依赖网络基础'],
  ['SEC-01', 'LINUX-04', '服务器安全是前端安全边界的生产延伸'],
  ['LINUX-03', 'DOCKER-01', '可重复构建脚本是 Docker 镜像化的前置能力'],
  ['DOCKER-02', 'DEPLOY-01', 'Compose 网络、环境和卷是生产部署配置的基础'],
  ['DOCKER-04', 'DEPLOY-02', '镜像可信和扫描是 CI/CD 发布准入的一部分'],
  ['ENG-04', 'COMP-03', '组件版本治理依赖明确的构建产物与 exports'],
  ['NODE-03', 'MCP-01', 'MCP Server 首先是可维护的 Node 工具进程'],
  ['API-02', 'MCP-01', 'Tool Schema 与类型输出依赖规范化的接口模型'],
  ['AIAPP-04', 'AGENT-01', 'Agent Loop 通过工具调用把推理转成行动'],
  ['MCP-02', 'AGENT-02', 'Agent 使用 MCP 前必须理解工具契约与安全'],
  ['AIAPP-02', 'WEBAI-04', '本地推理同样需要流式与主线程并发控制'],
  ['AIAPP-06', 'WEBAI-06', '本地语义搜索是 RAG 检索链路的一种实现'],
  ['ENG-05', 'AIDEV-03', 'AI 代码验证必须建立在已有质量门禁上'],
  ['TEST-03', 'AIDEV-03', 'AI 生成变更需要关键路径 E2E 兜底'],
  ['SEC-01', 'AIAPP-07', 'Prompt Injection 是不可信输入安全边界的延伸'],
  ['AGENT-10', 'AIDEV-10', '团队 AI 治理建立在最小权限和审计之上'],
  ['WEB-01', 'VUE-11', 'SSR 应用仍必须保持语义、表单和可访问性基础'],
];

const relatedPairs: Array<[string, string, string]> = [
  ['REACT-05', 'VUE-06', '自定义 Hook 与 Composable 都解决组件逻辑复用'],
  ['REACT-06', 'VUE-08', 'Context 与 Pinia 都涉及跨组件状态边界'],
  ['REACT-07', 'VUE-10', '两个框架都必须以测量驱动性能优化'],
  ['REACT-08', 'AIAPP-10', '可恢复异步体验是 AI 产品信任设计的基础'],
  ['ANTD-04', 'H5-01', '移动组件设计需要适配和安全区基础'],
  ['BIZ-03', 'PLATFORM-03', '平台采用率依赖可配置且可治理的权限边界'],
  ['PERF-03', 'WEBAI-04', 'Worker 是控制主线程长任务的重要手段'],
  ['ANTD-01', 'PLATFORM-01', 'Schema 页面通常从表单配置化开始'],
  ['AIAPP-04', 'AGENT-02', 'Tool Calling 与 MCP Tool 共享结构化契约'],
  ['MCP-02', 'AGENT-08', '可发现工具依赖高质量描述和 Schema'],
  ['AIDEV-03', 'TEST-03', '验证金字塔与 E2E 关键路径互相补充'],
  ['AIDEV-09', 'DS-01', '设计稿到代码需要可计算的设计 Token'],
  ['DEPLOY-01', 'PERF-02', '静态资源缓存和 CDN 策略直接影响加载性能'],
  ['DOCKER-01', 'ENG-01', 'Dockerfile 构建同样需要理解模块产物和构建阶段'],
];

export function buildRelationDefinitions(): RelationDefinition[] {
  const definitions: RelationDefinition[] = [];
  for (const path of KNOWLEDGE_PATHS) {
    for (let index = 0; index < path.length - 1; index++) {
      const source = path[index];
      const target = path[index + 1];
      if (source && target) definitions.push({
        source,
        target,
        type: 'PREREQUISITE',
        description: `建议先掌握 ${source}，再学习 ${target}`,
        weight: 8,
      });
    }
  }
  for (const [source, target, description] of crossPrerequisites) {
    definitions.push({ source, target, type: 'PREREQUISITE', description, weight: 9 });
  }
  for (const [source, target, description] of relatedPairs) {
    definitions.push({ source, target, type: 'RELATED', description, weight: 6 });
    definitions.push({ source: target, target: source, type: 'RELATED', description, weight: 6 });
  }
  // 同一关系可能同时来自领域路径和跨领域语义清单，统一在源头去重。
  return [...new Map(definitions.map((relation) => [
    `${relation.source}:${relation.target}:${relation.type}`,
    relation,
  ])).values()];
}

/** 启动时幂等补齐关系，保留数据库中已有的人工关系。 */
export function syncKnowledgeRelations(): { total: number; inserted: number; skipped: number } {
  const points = rawDb.prepare('SELECT id, code FROM knowledge_points').all() as Array<{ id: string; code: string }>;
  const pointIds = new Map(points.map((point) => [point.code, point.id]));
  const definitions = buildRelationDefinitions();
  const definitionKeys = new Set(definitions.map((relation) => `${relation.source}:${relation.target}:${relation.type}`));
  // 领域路径重排时删除已失效的自动相邻关系；非自动描述的人工关系继续保留。
  const autoRows = rawDb.prepare(`
    SELECT edge.id, source.code AS source, target.code AS target, edge.type
    FROM knowledge_edges edge
    JOIN knowledge_points source ON source.id = edge.source_point_id
    JOIN knowledge_points target ON target.id = edge.target_point_id
    WHERE edge.description LIKE '建议先掌握 %'
  `).all() as Array<{ id: string; source: string; target: string; type: RelationDefinition['type'] }>;
  const remove = rawDb.prepare('DELETE FROM knowledge_edges WHERE id = ?');
  for (const row of autoRows) {
    if (!definitionKeys.has(`${row.source}:${row.target}:${row.type}`)) remove.run(row.id);
  }
  const existingRows = rawDb.prepare('SELECT source_point_id AS sourceId, target_point_id AS targetId, type FROM knowledge_edges').all() as Array<{ sourceId: string; targetId: string; type: string }>;
  const existing = new Set(existingRows.map((edge) => `${edge.sourceId}:${edge.targetId}:${edge.type}`));
  const insert = rawDb.prepare(`
    INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  let inserted = 0;
  rawDb.transaction(() => {
    for (const relation of definitions) {
      const sourceId = pointIds.get(relation.source);
      const targetId = pointIds.get(relation.target);
      if (!sourceId || !targetId) continue;
      const key = `${sourceId}:${targetId}:${relation.type}`;
      if (existing.has(key)) continue;
      insert.run(randomUUID(), sourceId, targetId, relation.type, relation.description, relation.weight, new Date().toISOString());
      existing.add(key);
      inserted++;
    }
  })();
  return { total: definitions.length, inserted, skipped: definitions.length - inserted };
}

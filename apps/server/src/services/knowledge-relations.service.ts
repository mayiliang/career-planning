import { randomUUID } from 'crypto';
import { resolvePointTaxonomy } from '@career-atlas/content-parser';
import { rawDb } from '../db/index.js';

export type RelationDefinition = {
  source: string;
  target: string;
  type: 'PREREQUISITE' | 'RELATED' | 'COMPARES_WITH' | 'APPLIED_WITH';
  description: string;
  weight: number;
};

/**
 * 每个领域的推荐阅读顺序，只用于路线编排和图谱展示。
 * 推荐顺序不等于硬前置；真正的前置关系只在 explicitPrerequisites 中声明。
 */
export const KNOWLEDGE_PATHS: string[][] = [
  ['JS-01', 'JS-02', 'JS-03', 'JS-07', 'CS-01', 'CS-02', 'CS-03', 'JS-04', 'JS-05', 'JS-06', 'WASM-01', 'WEB-01', 'WEB-02', 'WEB-03', 'A11Y-01', 'BROWSER-01', 'BROWSER-02', 'WEB-04', 'WEB-05', 'NET-01', 'DEBUG-01', 'SEC-01', 'SEC-02', 'SEC-04', 'SEC-03', 'SEC-05'],
  ['TS-01', 'TS-02', 'TS-03', 'TS-04', 'TS-05', 'TS-06', 'TS-07', 'TS-08', 'TS-09'],
  ['REACT-01', 'REACT-02', 'REACT-03', 'REACT-04', 'REACT-05', 'REACT-06', 'REACT-07', 'REACT-08', 'REACT-09', 'REACT-10'],
  ['UMI-01', 'UMI-02', 'UMI-03', 'UMI-04', 'ANTD-01', 'ANTD-02', 'ANTD-03', 'ANTD-04'],
  ['BIZ-01', 'BIZ-02', 'BIZ-03', 'BIZ-04', 'BIZ-05', 'BIZ-06', 'BIZ-07', 'BIZ-08'],
  ['GIT-01', 'GIT-02', 'GIT-03', 'ENG-01', 'ENG-02', 'ENG-07', 'ENG-03', 'ENG-04', 'ENG-05', 'TEST-01', 'TEST-02', 'TEST-03', 'TEST-04', 'ENG-06', 'ENG-08', 'OBS-01', 'DX-01'],
  ['PERF-01', 'PERF-02', 'PERF-03', 'PERF-04', 'H5-01', 'H5-02', 'HYBRID-01', 'H5-03', 'H5-04', 'MEDIA-01', 'MEDIA-02'],
  ['COMP-01', 'COMP-02', 'DS-01', 'UX-01', 'COMP-03', 'PLATFORM-01', 'PLATFORM-02', 'PLATFORM-03', 'EMBED-01', 'RUNTIME-01', 'RUNTIME-02', 'MOBILE-01'],
  ['NODE-01', 'NODE-02', 'NODE-04', 'NODE-03', 'API-01', 'API-02'],
  ['CAREER-01', 'CAREER-02', 'CAREER-04', 'CAREER-05', 'CAREER-06'],
  ['VUE-01', 'VUE-02', 'VUE-03', 'VUE-04', 'VUE-05', 'VUE-06', 'VUE-07', 'VUE-08', 'VUE-10', 'VUE-11', 'VUE-09'],
  ['AIAPP-01', 'AIAPP-02', 'AIAPP-03', 'AIAPP-04', 'AIAPP-05', 'AIUI-01', 'AIAPP-06', 'AIAPP-07', 'AIAPP-08', 'AIAPP-09', 'AIAPP-10', 'AIAPP-11', 'AIMEDIA-01', 'AIAPP-12', 'AIAPP-13'],
  ['MCP-01', 'AGENT-01', 'AGENT-03', 'AGENT-04', 'AGENT-05', 'AGENT-06', 'AGENT-07', 'AGENT-11', 'AGENT-08', 'AGENT-09', 'AGENT-10'],
  ['WEBAI-01', 'WEBAI-02', 'WEBAI-03', 'WEBAI-11', 'WEBAI-04', 'WEBAI-05', 'WEBAI-06', 'WEBAI-07', 'WEBAI-08', 'WEBAI-09', 'WEBAI-10', 'WEBAGENT-01'],
  ['AIDEV-01', 'AIDEV-02', 'AIDEV-03', 'AIDEV-04', 'AIDEV-06', 'AIDEV-07', 'AIDEV-08', 'AIDEV-09', 'AIDEV-10', 'AIDEV-11'],
  ['LINUX-01', 'LINUX-02', 'LINUX-03', 'LINUX-04', 'DOCKER-01', 'DOCKER-02', 'DOCKER-03', 'DOCKER-04', 'DEPLOY-01'],
  ['RENDER-01', 'RENDER-02', 'EDGE-01', 'DATA-01', 'DATA-02', 'REALTIME-01', 'COLLAB-01', 'PWA-01', 'LOCALFIRST-01', 'PWA-02', 'GQL-01'],
  ['GRAPHICS-01', 'GRAPHICS-02', 'VIS-01', 'ANALYTICS-01', 'EXP-01', 'EXP-02', 'I18N-01', 'I18N-02', 'SEO-01', 'CONTENT-01', 'EDITOR-01', 'COMPAT-01'],
  ['IDENTITY-01', 'IDENTITY-02', 'PRIVACY-01', 'PRIVACY-02', 'AIPROD-01', 'AIPROD-02', 'AISAFE-01', 'AISAFE-02', 'AIGOV-01'],
  ['ARCH-01', 'ARCH-02', 'ARCH-03', 'ARCH-04', 'ARCH-05', 'LEAD-01', 'BACKEND-01', 'BACKEND-02', 'BACKEND-03', 'CLOUD-01', 'SUSTAIN-01'],
];

/**
 * React 与 Vue 共用同一框架阶段并交错出现，避免按领域文件顺序把 Vue
 * 隐式放在 React 之后；VUE-09 仍是按项目需要选择的服务器状态库专项。
 */
export const FRAMEWORK_ROUTE_CANDIDATES = [
  'REACT-01', 'VUE-01', 'VUE-02',
  'REACT-02', 'VUE-03', 'VUE-04', 'REACT-03',
  'REACT-04', 'VUE-05', 'REACT-05', 'VUE-06',
  'REACT-06', 'VUE-08',
  'REACT-08', 'REACT-10', 'VUE-07',
  'REACT-07', 'VUE-10',
  'REACT-09', 'VUE-11',
  'VUE-09',
] as const;

/**
 * 求职优先路线只把会阻塞框架理解的底座放在 React/Vue 之前。
 * B01～B03 保留已经验证过的 JavaScript、复杂度、异步、模块与 TypeScript 主线；
 * 再补语义化 Web 基础，避免先学完整个平台/安全体系才接触框架。
 */
const JOB_FIRST_FOUNDATION_CANDIDATES = [
  'JS-01', 'JS-02', 'JS-03', 'JS-07',
  'CS-01', 'CS-02', 'CS-03', 'JS-04',
  'JS-05', 'JS-06',
  'TS-01', 'TS-02', 'TS-03',
  'WEB-01',
] as const;

/**
 * 框架之后优先形成投递和面试可展示的工程证据：版本协作、构建、测试、
 * 故障表达与代码评审。它们仍是知识点，不生成泛化的“面试周”占位任务。
 */
const JOB_INTERVIEW_EVIDENCE_CANDIDATES = [
  'GIT-01', 'GIT-02', 'GIT-03', 'DEBUG-01',
  'ENG-01', 'ENG-02', 'ENG-03', 'ENG-05',
  'TEST-01', 'TEST-02', 'TEST-03',
  'CAREER-01', 'CAREER-02', 'CAREER-04', 'CAREER-05',
] as const;

const EARLY_ROUTE_CODES = new Set<string>([
  ...JOB_FIRST_FOUNDATION_CANDIDATES,
  ...FRAMEWORK_ROUTE_CANDIDATES,
  ...JOB_INTERVIEW_EVIDENCE_CANDIDATES,
]);

/**
 * 完整候选顺序用于知识图谱和分支编排；默认核心路线只纳入全员必修，
 * 加上同等优先的 React、Vue 与 Agent/MCP 主修轨，避免把其他专项误标成必修。
 */
const COMPLETE_ROUTE_CANDIDATES = [
  ...JOB_FIRST_FOUNDATION_CANDIDATES,
  ...FRAMEWORK_ROUTE_CANDIDATES,
  ...JOB_INTERVIEW_EVIDENCE_CANDIDATES,
  ...(KNOWLEDGE_PATHS[0] ?? []).filter((code) => !EARLY_ROUTE_CODES.has(code)),
  ...(KNOWLEDGE_PATHS[1] ?? []).filter((code) => !EARLY_ROUTE_CODES.has(code)),
  'IDENTITY-01', 'IDENTITY-02', 'PRIVACY-01', 'PRIVACY-02',
  'NODE-01', 'NODE-02', 'NODE-04', 'NODE-03', 'API-01',
  'ENG-04',
  'AIDEV-01', 'AIDEV-02', 'AIDEV-03',
  'BIZ-01', 'BIZ-02', 'BIZ-03',
  ...(KNOWLEDGE_PATHS[3] ?? []),
  'BIZ-04', 'BIZ-05', 'BIZ-06', 'BIZ-07', 'BIZ-08', 'TEST-04',
  ...(KNOWLEDGE_PATHS[16] ?? []),
  ...(KNOWLEDGE_PATHS[7] ?? []).filter((code) => code !== 'MOBILE-01'),
  'EDITOR-01',
  'ENG-08', 'ENG-07',
  ...(KNOWLEDGE_PATHS[15] ?? []).filter((code) => code !== 'DEPLOY-01'),
  'ENG-06', 'DEPLOY-01', 'OBS-01', 'DX-01',
  ...(KNOWLEDGE_PATHS[6] ?? []),
  'MOBILE-01',
  'BACKEND-01', 'BACKEND-02', 'BACKEND-03', 'CLOUD-01',
  'API-02', 'MCP-01',
  'AIPROD-01', 'AIPROD-02', 'AISAFE-01', 'AISAFE-02', 'AIGOV-01',
  ...(KNOWLEDGE_PATHS[11] ?? []),
  ...(KNOWLEDGE_PATHS[12] ?? []).filter((code) => code !== 'MCP-01'),
  ...(KNOWLEDGE_PATHS[13] ?? []),
  'AIDEV-04', 'AIDEV-06', 'AIDEV-07', 'AIDEV-08', 'AIDEV-09', 'AIDEV-10', 'AIDEV-11',
  ...(KNOWLEDGE_PATHS[17] ?? []).filter((code) => code !== 'EDITOR-01'),
  'ARCH-01', 'ARCH-02', 'ARCH-03', 'ARCH-04', 'ARCH-05', 'LEAD-01', 'SUSTAIN-01',
  ...(KNOWLEDGE_PATHS[9] ?? []).filter((code) => !EARLY_ROUTE_CODES.has(code)),
];

const DOMAIN_CODE_BY_POINT = new Map(
  KNOWLEDGE_PATHS.flatMap((path, index) => path.map((code) => [code, String(index + 1).padStart(2, '0')] as const)),
);
export const DEFAULT_TRACK_IDS = new Set(['react', 'vue', 'agent-mcp']);
const PLAN_ROUTE = COMPLETE_ROUTE_CANDIDATES.filter((code) => {
  const domainCode = DOMAIN_CODE_BY_POINT.get(code);
  if (!domainCode) throw new Error(`默认路线包含未知知识点：${code}`);
  const taxonomy = resolvePointTaxonomy(code, domainCode);
  return taxonomy.requirementLevel === 'REQUIRED'
    || (taxonomy.requirementLevel === 'TRACK_REQUIRED'
      && taxonomy.trackIds.some((trackId) => DEFAULT_TRACK_IDS.has(trackId)));
});

/**
 * 默认主干压缩为 35 个连续学习批次。批次只表达顺序与一组可连续推进的
 * 知识点，不承诺固定周历；旧 API/数据库仍沿用 planWeek 字段以避免迁移。
 */
export const CORE_ROUTE_BATCH_COUNT = 35;
export const CONTENT_PLAN_WEEK_COUNT = CORE_ROUTE_BATCH_COUNT;
export const LEARNING_WEEK_PATHS: Record<number, string[]> = {};
for (let week = 1; week <= CONTENT_PLAN_WEEK_COUNT; week++) {
  const start = Math.floor(((week - 1) * PLAN_ROUTE.length) / CONTENT_PLAN_WEEK_COUNT);
  const end = Math.floor((week * PLAN_ROUTE.length) / CONTENT_PLAN_WEEK_COUNT);
  LEARNING_WEEK_PATHS[week] = PLAN_ROUTE.slice(start, end);
}
let globalRouteOrder = 0;
/** 所有推荐入口共用的唯一顺序；每个知识点只出现一次。 */
export const RECOMMENDED_KNOWLEDGE_ROUTE = Object.entries(LEARNING_WEEK_PATHS)
  .filter(([week]) => Number(week) <= CONTENT_PLAN_WEEK_COUNT)
  .flatMap(([, path]) => path);
export const KNOWLEDGE_ROUTE_INDEX = new Map(
  Object.entries(LEARNING_WEEK_PATHS)
    .filter(([week]) => Number(week) <= CONTENT_PLAN_WEEK_COUNT)
    .flatMap(([week, path]) => path.map((code) => [code, {
      week: Number(week),
      order: globalRouteOrder++,
    }] as const)),
);

const explicitPrerequisites: Array<[string, string, string]> = [
  ['GIT-01', 'GIT-02', '分支集成和冲突恢复建立在对象、引用与暂存区模型之上'],
  ['GIT-02', 'GIT-03', '协作治理需要先掌握分支集成、历史改写与冲突边界'],
  ['GIT-03', 'ENG-06', '从 PR 到发布的流水线依赖稳定的分支与提交治理'],
  ['JS-01', 'TS-01', 'TypeScript 建立在 JavaScript 运行模型之上'],
  ['JS-03', 'JS-07', '迭代协议和元编程需要先理解 JavaScript 的值、对象与身份语义'],
  ['CS-01', 'CS-02', '数据结构与算法选型需要先能分析规模、复杂度和工程成本'],
  ['CS-02', 'CS-03', '前端大数据处理建立在常用结构、算法模式和正确性之上'],
  ['CS-01', 'REACT-07', '前端性能优化需要识别算法复杂度和数据结构成本'],
  ['CS-03', 'VIS-01', '大规模可视化需要先理解聚合、索引、Worker 和内存边界'],
  ['JS-04', 'JS-05', 'Promise 与异步流程建立在事件循环和任务调度之上'],
  ['JS-06', 'ENG-01', '模块图、Tree-shaking 和 Chunk 拆分依赖 ESM 与模块边界'],
  ['TS-01', 'TS-02', '基本类型和收窄是对象类型建模的前置'],
  ['TS-02', 'TS-03', '泛型需要先理解结构类型与联合收窄'],
  ['JS-03', 'REACT-01', '不可变更新与值语义是理解 React 渲染的基础'],
  ['REACT-01', 'REACT-02', '组件与渲染模型是状态更新的前置'],
  ['REACT-02', 'REACT-10', '数据路由与导航状态建立在组件状态、渲染和事件模型之上'],
  ['REACT-02', 'REACT-05', 'Hook 规则建立在组件状态与渲染模型之上'],
  ['REACT-04', 'REACT-05', '抽取自定义 Hook 前需掌握 Effect、外部同步与清理边界'],
  ['JS-04', 'REACT-04', '异步和事件循环支撑 Effect 外部同步与取消'],
  ['TS-03', 'REACT-05', '泛型与约束支撑类型安全的自定义 Hook'],
  ['REACT-03', 'REACT-06', '跨组件状态边界需要先掌握状态归属、派生与提升原则'],
  ['JS-07', 'VUE-02', 'Vue 响应式代理建立在对象身份、Proxy 与 Reflect 语义之上'],
  ['VUE-02', 'VUE-05', '副作用监听、失效清理与异步恢复建立在 Vue 响应式依赖追踪之上'],
  ['VUE-05', 'VUE-06', '抽取 Composable 前需掌握组件副作用、停用/卸载与资源清理边界'],
  ['VUE-02', 'VUE-08', 'Pinia 的 state、getter 与订阅传播建立在 Vue 响应式语义之上'],
  ['VUE-07', 'VUE-11', 'Nuxt 路由与全栈导航恢复需要先掌握 Vue Router 的匹配、参数和守卫边界'],
  ['WEB-01', 'A11Y-01', '可访问名称、表单和焦点顺序首先依赖语义 HTML'],
  ['WEB-02', 'WEB-03', '先掌握布局与层叠，再建立现代 CSS 架构'],
  ['BROWSER-01', 'WEB-04', '原生分层 UI 与导航增强依赖浏览器事件、渲染和历史模型'],
  ['BROWSER-01', 'BROWSER-02', '页面生命周期、观察器和多标签协同需要先理解 DOM、事件与浏览器存储'],
  ['WEB-01', 'WEB-05', '跨框架原生组件仍以 HTML 语义和元素生命周期为基础'],
  ['BROWSER-01', 'WEB-05', 'Custom Elements 与 Shadow DOM 依赖浏览器 DOM、事件和生命周期'],
  ['NET-01', 'SEC-01', 'Web 攻击与防护依赖源、Cookie、请求和缓存语义'],
  ['SEC-01', 'SEC-02', '安全响应头与供应链治理建立在输入输出和浏览器信任边界上'],
  ['SEC-02', 'SEC-04', '跨源隔离和嵌入权限需要先理解响应头策略与违规报告'],
  ['BROWSER-01', 'SEC-04', '浏览上下文、iframe、Worker 与进程隔离依赖浏览器生命周期基础'],
  ['NET-01', 'SEC-03', 'Passkey 的 challenge、origin 与服务端验证依赖网络安全基础'],
  ['SEC-01', 'SEC-05', '客户端密码学必须先建立脚本环境、输入输出与信任边界'],
  ['BROWSER-02', 'PERF-03', '长任务、帧归因与现场观察依赖浏览器调度和观察器生命周期'],
  ['DEBUG-01', 'PERF-03', '性能长任务优化前需要能够建立可重复的诊断证据'],
  ['DEBUG-01', 'OBS-01', '生产可观测性应延续系统化假设、关联和复现方法'],
  ['NET-01', 'UMI-03', '请求层设计需要 HTTP、缓存与取消基础'],
  ['BIZ-03', 'UMI-04', '先建立通用权限模型，再实现框架页面和按钮权限'],
  ['TEST-03', 'ENG-06', '发布与回滚需要关键路径自动化证据'],
  ['API-01', 'API-02', '代码生成需要先把 OpenAPI 文档解析并规范化为稳定接口模型'],
  ['BIZ-04', 'TEST-04', '消费者驱动契约建立在 DTO、防腐层和业务兼容边界之上'],
  ['TEST-04', 'ENG-06', '跨服务发布需要 API 契约兼容的自动化证据'],
  ['ENG-06', 'OBS-01', '发布闭环必须通过真实用户监控验证生产结果'],
  ['ENG-06', 'DX-01', '平台自助发布与 Golden Path 建立在可重复流水线和制品晋级之上'],
  ['OBS-01', 'DX-01', '平台产品必须能以真实任务、失败和交付数据验证开发者体验'],
  ['ENG-03', 'ENG-08', '供应链治理建立在可重复安装和依赖边界之上'],
  ['ENG-02', 'ENG-07', '迁移 Vite 8 前需理解开发与生产构建差异'],
  ['ENG-05', 'AIDEV-01', 'AI 研发规格必须落入现有质量门禁'],
  ['NET-01', 'LINUX-02', '端口、DNS、HTTP 与缓存排障依赖网络基础'],
  ['SEC-01', 'LINUX-04', '服务器安全是前端安全边界的生产延伸'],
  ['DOCKER-01', 'DOCKER-02', '多容器编排需要先掌握镜像、构建上下文与容器生命周期'],
  ['DOCKER-01', 'DOCKER-03', '容器网络、卷和资源排错需要先掌握镜像与容器生命周期'],
  ['DOCKER-01', 'DOCKER-04', '镜像安全与可信准入建立在可重复镜像构建之上'],
  ['ENG-04', 'COMP-03', '组件版本治理依赖明确的构建产物与 exports'],
  ['NET-01', 'NODE-04', '生产 HTTP 服务需要先掌握请求、缓存、连接、超时和代理语义'],
  ['NODE-01', 'NODE-04', 'BFF 的并发与过载控制建立在 Node 事件循环和非阻塞 I/O 之上'],
  ['NODE-02', 'NODE-04', '流式 HTTP 响应、背压和资源清理依赖 Stream 与错误处理基础'],
  ['TS-07', 'NODE-04', 'BFF 的输入输出边界需要运行时 Schema 与静态类型对齐'],
  ['NODE-04', 'EDGE-01', '边缘 BFF 的资源约束与降级需要先掌握常规 Node 服务工程'],
  ['IDENTITY-01', 'IDENTITY-02', '理解浏览器会话边界后再接入 OAuth/OIDC'],
  ['NET-01', 'RENDER-01', '渲染策略依赖 HTTP、缓存与导航基础'],
  ['RENDER-01', 'RENDER-02', '流式 SSR 与 Server Components 需要先理解 CSR、SSR、SSG 和水合取舍'],
  ['NET-01', 'DATA-01', 'Server State 缓存建立在请求与缓存语义之上'],
  ['DATA-01', 'DATA-02', '先掌握查询缓存，再处理乐观写入和冲突'],
  ['NET-01', 'REALTIME-01', '实时协议需要 HTTP 与连接生命周期基础'],
  ['REALTIME-01', 'COLLAB-01', '协作一致性建立在可靠消息与重连基础上'],
  ['PERF-03', 'MEDIA-01', '专业播放管线需要先掌握主线程、渲染帧与性能取证'],
  ['PERF-03', 'MEDIA-02', '实时采集与音频处理需要先掌握主线程、渲染帧与性能取证'],
  ['REALTIME-01', 'MEDIA-02', '实时音视频需要先掌握连接、顺序、背压与重连语义'],
  ['BROWSER-01', 'PWA-01', 'Service Worker 生命周期和 Fetch 拦截需要浏览器事件、请求与安全上下文基础'],
  ['BROWSER-02', 'PWA-02', '安装、推送和后台事件需要先掌握页面生命周期与后台限制'],
  ['PWA-01', 'PWA-02', '安装与推送能力建立在 Service Worker 生命周期和离线更新之上'],
  ['DATA-02', 'LOCALFIRST-01', '本地优先同步需要先掌握离线突变、幂等与冲突呈现'],
  ['WEBAI-05', 'WEBAI-09', '离线 AI 作业需要先建立模型资产缓存、校验、配额与淘汰策略'],
  ['AIAPP-01', 'AIAPP-02', '流式 AI 界面建立在模型请求、上下文窗口和基础响应语义之上'],
  ['AIAPP-01', 'AIAPP-03', '结构化输出必须先理解模型输出不确定性和上下文边界'],
  ['TS-07', 'AIAPP-03', '结构化输出的运行时校验依赖静态类型与 Schema 对齐'],
  ['AIAPP-03', 'AIAPP-04', '工具调用的参数和结果契约建立在结构化输出校验之上'],
  ['AIAPP-04', 'AGENT-01', 'Agent Loop 通过工具调用把推理转成行动'],
  ['MCP-01', 'AGENT-03', 'MCP 传输演进建立在 Host、Client、Server 与核心能力语义之上'],
  ['MCP-01', 'AGENT-04', 'Client 兼容层必须先理解能力协商和协议版本'],
  ['MCP-01', 'AGENT-08', 'Agent 工具可发现性建立在 MCP Tool、Resource 与 Prompt 契约上'],
  ['MCP-01', 'AGENT-10', 'MCP OAuth、安全评审和审计必须先掌握协议能力与传输边界'],
  ['AGENT-01', 'AGENT-05', 'Human-in-the-loop 插入 Agent Loop 前要明确动作、状态和副作用边界'],
  ['AGENT-03', 'AGENT-05', '暂停与批准流程需要可恢复传输和稳定会话身份'],
  ['AGENT-04', 'AGENT-05', '批准界面必须基于真实协商到的客户端与服务端能力'],
  ['AGENT-01', 'AGENT-06', '长任务规划与状态机需要先掌握 Agent Loop、终止和工具结果回流'],
  ['AGENT-03', 'AGENT-06', '可恢复任务需要理解传输断线、会话迁移和续传边界'],
  ['AGENT-04', 'AGENT-06', '兼容降级会改变任务可用能力，必须纳入状态机'],
  ['AGENT-01', 'AGENT-07', '多 Agent 协作建立在单 Agent 循环、工具调用与终止语义之上'],
  ['REALTIME-01', 'AIAPP-11', '实时多模态需要先掌握连接、重连、顺序和背压'],
  ['AIAPP-01', 'AIAPP-12', '会话状态和上下文组装建立在模型消息与上下文窗口语义之上'],
  ['AIAPP-02', 'AIAPP-12', '持久化会话必须理解流式消息、取消、重试和增量恢复'],
  ['IDENTITY-01', 'AIAPP-12', '多租户会话持久化依赖可靠的浏览器身份边界'],
  ['PRIVACY-01', 'AIAPP-12', '会话留存、导出和删除必须先明确隐私生命周期'],
  ['AIAPP-06', 'AIAPP-13', '长期记忆检索、来源和置信治理建立在 RAG 检索可信度之上'],
  ['AIAPP-12', 'AIAPP-13', '长期记忆需要先区分会话状态、上下文摘要和持久化消息'],
  ['IDENTITY-01', 'AIAPP-13', '长期记忆的主体、租户和访问控制依赖身份边界'],
  ['PRIVACY-01', 'AIAPP-13', '长期记忆写入、留存、推断和遗忘必须先明确隐私生命周期'],
  ['BIZ-06', 'AIMEDIA-01', '媒体制品工作流需要显式状态机、审批和异常恢复'],
  ['ENG-05', 'AIDEV-03', 'AI 代码验证必须建立在已有质量门禁上'],
  ['TEST-03', 'AIDEV-03', 'AI 生成变更需要关键路径 E2E 兜底'],
  ['DEBUG-01', 'AIDEV-11', 'Agent 浏览器调试必须继承可复现、假设和证据驱动方法'],
  ['AIDEV-03', 'AIDEV-11', 'Agent 运行时修改必须落入分层验证与防伪通过门禁'],
  ['PERF-03', 'AIDEV-11', '浏览器 Agent 的性能诊断依赖 trace、帧和长任务归因能力'],
  ['SEC-01', 'AIAPP-07', 'Prompt Injection 是不可信输入安全边界的延伸'],
  ['PRIVACY-01', 'AIPROD-01', 'AI 产品选型必须先明确数据目的和隐私边界'],
  ['AIPROD-01', 'AIAPP-01', '先验证 AI 任务价值，再进入模型应用实现'],
  ['SEC-01', 'AISAFE-01', 'AI 输出安全建立在通用不可信输入输出边界上'],
  ['AISAFE-01', 'AISAFE-02', '掌握防护链后再进行系统化红队'],
  ['IDENTITY-02', 'AGENT-10', 'MCP OAuth 安全需要先掌握标准 OAuth/OIDC'],
  ['AGENT-07', 'AGENT-11', '跨组织 Agent 协作建立在多 Agent 状态、隔离和失败传播基础之上'],
  ['IDENTITY-02', 'AGENT-11', 'A2A 跨组织身份与委派依赖 OAuth/OIDC 和联合身份基础'],
  ['AGENT-10', 'AIDEV-10', '团队 AI 治理建立在最小权限和审计之上'],
  ['AIGOV-01', 'AIDEV-10', '团队 AI 研发规范需要模型与数据治理基础'],
  ['WEB-01', 'VUE-11', 'SSR 应用仍必须保持语义、表单和可访问性基础'],
  ['A11Y-01', 'UX-01', '可用性设计必须以可访问的语义、键盘和反馈为底线'],
  ['UX-01', 'AIAPP-10', 'AI 信任与接管体验建立在完整任务流和状态反馈之上'],
  ['SEC-01', 'RUNTIME-01', '高权限容器和扩展开发需要先建立通用 Web 信任边界'],
  ['ENG-04', 'EMBED-01', '嵌入式 SDK 的 exports、产物格式和版本兼容依赖发布边界基础'],
  ['WEB-05', 'EMBED-01', 'Web Component 与第三方宿主接入需要原生组件和事件互操作基础'],
  ['SEC-04', 'EMBED-01', 'iframe、postMessage 与权限策略需要先理解跨源隔离边界'],
  ['SEC-01', 'RUNTIME-02', '桌面系统能力桥接必须建立在通用 Web 信任边界上'],
  ['NODE-01', 'RUNTIME-02', 'Electron 主进程与工具链需要 Node 运行时基础'],
  ['H5-01', 'MOBILE-01', '跨平台移动应用需要先理解移动视口、安全区和设备适配'],
  ['SEC-01', 'MOBILE-01', '移动权限、深链和安全存储需要通用前端安全基础'],
  ['WEB-01', 'WEBAGENT-01', 'Agent 可操作页面仍依赖语义 HTML 和可访问人工路径'],
  ['TS-07', 'WEBAGENT-01', 'WebMCP 工具输入输出必须有运行时可验证的 Schema 契约'],
  ['SEC-04', 'WEBAGENT-01', 'WebMCP 的来源隔离和 Permissions Policy 依赖跨源安全基础'],
  ['AIAPP-04', 'WEBAGENT-01', '页面结构化工具建立在 Tool Calling、副作用和确认模型上'],
  ['ANALYTICS-01', 'EXP-02', 'A/B 实验结论依赖稳定事件和指标口径'],
  ['EXP-01', 'EXP-02', '实验分流依赖可治理且稳定的 Feature Flag'],
  ['I18N-01', 'I18N-02', '先建立 locale 与文本方向，再处理时间数字格式'],
  ['WEB-01', 'SEO-01', '抓取和索引依赖可解析的语义内容与链接'],
  ['RENDER-01', 'SEO-01', 'JavaScript SEO 需要先理解 CSR、SSR、SSG 与缓存取舍'],
  ['BROWSER-01', 'EDITOR-01', '复杂编辑器的输入、选择区和焦点行为依赖浏览器事件与渲染基础'],
  ['WEB-01', 'EDITOR-01', '结构化编辑器仍需要语义、表单、键盘和可访问性基础'],
  ['ARCH-01', 'ARCH-02', '架构评审需要明确质量属性与约束'],
  ['ARCH-02', 'ARCH-03', '渐进迁移需要可追溯决策和退出条件'],
  ['ARCH-03', 'ARCH-05', '跨框架迁移需要先掌握垂直切片、兼容层、遥测和回滚'],
  ['ARCH-04', 'ARCH-05', '框架生命周期决策需要依赖支持矩阵、弃用窗口和债务治理'],
  ['BACKEND-01', 'BACKEND-02', '异步任务状态设计依赖数据一致性基础'],
  ['DOCKER-02', 'CLOUD-01', '编排平台学习需要容器网络与配置基础'],
  ['JS-06', 'WASM-01', 'WebAssembly 加载、导入和构建集成依赖模块与宿主边界'],
  ['CS-03', 'WASM-01', 'Wasm 内存与并发工程需要先掌握二进制数据、Worker 和复杂度成本'],
  ['WASM-01', 'WEBAI-03', 'AI 推理优化建立在通用 Wasm 执行、ABI、内存和调试能力之上'],
  ['WEBAI-11', 'WEBAI-08', '端云路由应在掌握 WebNN、WebGPU 与 Wasm 本地后端后决策'],
  ['PERF-01', 'SUSTAIN-01', '可持续性优化需要先建立真实性能预算和测量基线'],
  ['DEPLOY-01', 'SUSTAIN-01', '端到端能效与碳感知边界需要理解部署、CDN 与运行环境'],
  ['MEDIA-02', 'AIAPP-11', '实时语音 Agent 建立在媒体采集、轨道生命周期与网络降级之上'],
];

const relatedPairs: Array<[string, string, string]> = [
  ['GIT-02', 'DEBUG-01', '提交二分是生产诊断的一种工具，但系统化排错不以高级 Git 历史操作为前置'],
  ['TS-08', 'BIZ-03', '类型状态机可加强权限模型，但权限与授权边界可以独立建立'],
  ['ENG-06', 'DEPLOY-01', '发布流水线与部署工程紧密协作，但任一能力都不应成为另一能力的单向硬前置'],
  ['REACT-08', 'RENDER-02', 'Suspense 可承接流式渲染，但服务端流式边界不只属于 React'],
  ['PWA-01', 'WEBAI-09', 'Service Worker 可增强离线 AI 作业恢复，但不是通用离线任务编排的必要条件'],
  ['AIAPP-02', 'WEBAI-04', '本地推理可复用流式 UI 的调度经验，但本地推理并不要求先实现流式对话'],
  ['AIAPP-02', 'AIAPP-11', '实时语音与文本流共享取消和增量呈现，但两者可独立学习'],
  ['AIGOV-01', 'AIMEDIA-01', '生成媒体需要治理约束，但媒体工作流实现不以组织级治理能力为学习前置'],
  ['AIAPP-06', 'WEBAI-06', '本地语义搜索可实现 RAG 检索的一部分，但通用本地向量检索可独立学习'],
  ['MCP-01', 'AIAPP-05', 'MCP Apps 是 Generative UI 的一种宿主实现，而通用 Generative UI 不依赖 MCP'],
  ['AIAPP-05', 'AIUI-01', '通用 Generative UI 与 Agent UI 协议实现共享版本化消息和安全宿主问题'],
  ['AGENT-11', 'AGENT-10', 'A2A 扩展了 Agent 安全攻击面，但不是通用 Agent 安全治理的必修前置'],
  ['DX-01', 'LEAD-01', '平台工程能放大跨团队技术治理，但不是技术领导力的通用必修前置'],
  ['CS-03', 'DATA-01', '大数据处理方法可帮助高流量 Server State 优化，但不是缓存键与失效的硬前置'],
  ['TS-06', 'REACT-02', '函数方差有助于设计类型安全组件 API，但 React 组合不以高级类型为硬前置'],
  ['TS-03', 'VUE-04', '泛型有助于组件契约，但 Vue 组件组合可先从运行时数据流学习'],
  ['AIAPP-02', 'AIMEDIA-01', '文本流式状态机可借鉴到异步媒体进度，但媒体任务以业务状态机为主要前置'],
  ['AIAPP-09', 'SUSTAIN-01', '成本和缓存数据可作为能效治理输入，但可持续性不只由调用账本决定'],
  ['H5-04', 'AIMEDIA-01', '生成式媒体工作台可复用大文件直传与恢复能力'],
  ['ANTD-01', 'BIZ-05', 'Ant Design 表单可承载业务状态一致性练习，但通用业务建模不依赖特定组件库'],
  ['GIT-03', 'ENG-05', '协作工作流与提交门禁互相校准，但任一都可独立学习'],
  ['JS-03', 'CS-01', '值、引用和集合行为有助于复杂度分析，但不是算法分析的硬前置'],
  ['WEB-05', 'COMP-01', '原生组件与通用组件 API 共享封装和互操作设计问题'],
  ['DOCKER-04', 'ENG-06', '镜像可信证据可作为发布准入输入，但发布流水线不以容器为前提'],
  ['LINUX-03', 'DOCKER-01', 'Shell 自动化常用于镜像构建，但 Docker 基础不要求先精通 Shell'],
  ['DOCKER-02', 'DEPLOY-01', 'Compose 与生产部署共享配置和网络问题，但部署不局限于 Compose'],
  ['NODE-03', 'MCP-01', 'Node 工具工程可承载 MCP Server，但 MCP 协议不依赖特定语言'],
  ['API-02', 'MCP-01', '代码生成与 MCP Tool 都使用 Schema，但协议语义彼此独立'],
  ['API-01', 'TEST-04', 'OpenAPI 解析可深化契约测试，但消费/提供方测试不要求先实现规范解析器'],
  ['PWA-01', 'LOCALFIRST-01', '离线生命周期与本地优先同步共享恢复、配额和迁移问题'],
  ['LOCALFIRST-01', 'COLLAB-01', '本地优先与多人协作共享冲突模型，但并非彼此硬前置'],
  ['WEB-05', 'RUNTIME-01', 'Web Components 可作为跨运行时互操作手段之一'],
  ['HYBRID-01', 'MOBILE-01', 'Hybrid 容器与跨平台原生方案共享 Bridge 和生命周期问题'],
  ['WEB-01', 'GRAPHICS-01', '图形界面仍需语义替代与可访问人工路径'],
  ['WASM-01', 'GRAPHICS-02', 'Wasm 可参与高性能图形计算，但 WebGPU 不依赖 Wasm'],
  ['WEBAI-03', 'WEBAI-11', 'Wasm 与 WebNN 是需要按能力和数据搬运比较的本地推理后端'],
  ['GIT-03', 'CAREER-05', '提交与 PR 质量直接影响代码评审和跨团队沟通'],
  ['GIT-02', 'ARCH-03', '提交图中的安全历史演进与渐进迁移共享可回退原则'],
  ['REACT-05', 'VUE-06', '自定义 Hook 与 Composable 都解决组件逻辑复用'],
  ['REACT-06', 'VUE-08', 'Context 与 Pinia 都涉及跨组件状态边界'],
  ['REACT-07', 'VUE-10', '两个框架都必须以测量驱动性能优化'],
  ['REACT-01', 'VUE-02', 'React state snapshot 与 Vue 依赖追踪是两种不同的更新心智模型'],
  ['REACT-02', 'VUE-04', 'React 组合与 Vue 类型化 props/emits/slots 都要求显式组件合同和所有权'],
  ['REACT-04', 'VUE-05', 'Effect 与 watch 都需要处理依赖、失效清理和迟到异步结果'],
  ['REACT-08', 'VUE-05', '两个框架都需要区分 pending 协调、错误捕获和可恢复重试边界'],
  ['REACT-10', 'VUE-07', 'React Router 与 Vue Router 都以 URL、导航、数据和服务端授权边界为核心'],
  ['REACT-09', 'VUE-11', 'React 与 Nuxt 的演进能力都需要版本锁定、安全公告、灰度和稳定回退'],
  ['REACT-08', 'AIAPP-10', '可恢复异步体验是 AI 产品信任设计的基础'],
  ['ANTD-04', 'H5-01', '移动组件设计需要适配和安全区基础'],
  ['BIZ-03', 'PLATFORM-03', '平台采用率依赖可配置且可治理的权限边界'],
  ['PERF-03', 'WEBAI-04', 'Worker 是控制主线程长任务的重要手段'],
  ['ANTD-01', 'PLATFORM-01', 'Schema 页面通常从表单配置化开始'],
  ['EMBED-01', 'PLATFORM-02', '第三方嵌入与微前端都要处理隔离、通信和独立发布，但信任与宿主控制权不同'],
  ['AIAPP-04', 'MCP-01', 'Tool Calling 与 MCP Tool 共享结构化契约和副作用边界'],
  ['AIDEV-09', 'DS-01', '设计稿到代码需要可计算的设计 Token'],
  ['DEPLOY-01', 'PERF-02', '静态资源缓存和 CDN 策略直接影响加载性能'],
  ['DOCKER-01', 'ENG-01', 'Dockerfile 构建同样需要理解模块产物和构建阶段'],
  ['RENDER-01', 'VUE-11', 'Nuxt 与 React 服务端渲染共享通用渲染权衡'],
  ['DATA-01', 'VUE-09', '不同框架的数据请求层共享 Server State 原理'],
  ['REALTIME-01', 'AIAPP-02', '流式 AI UI 与实时传输共享断线恢复问题'],
  ['NODE-04', 'AIAPP-02', 'AI 流式接口的取消、背压、超时与可观测性需要生产 BFF 承接'],
  ['MEDIA-01', 'AIAPP-11', '专业播放管线可用于语音输出质量，但不是采集与打断的硬前置'],
  ['MEDIA-02', 'WEBAI-07', '多模态模型输入可复用媒体采集、轨道生命周期和隐私降级机制'],
  ['MEDIA-01', 'AIMEDIA-01', '生成式媒体制品复用专业媒体格式、播放质量与无障碍边界'],
  ['DX-01', 'PLATFORM-03', '开发者平台与物料平台共享产品化、自助服务、采用和退出治理'],
  ['AIAPP-05', 'WEBAGENT-01', 'MCP Apps 与 WebMCP 都连接 Agent 和 UI，但发现位置、宿主和信任边界不同'],
  ['AIUI-01', 'AGENT-07', 'Agent UI 事件与状态互操作需要对齐多 Agent 协作的上下文隔离'],
  ['SEC-05', 'SEC-03', 'Web Crypto 与 WebAuthn 共享公钥原语，但密钥用途和信任模型不同'],
  ['WEBAI-11', 'WEBAI-02', 'WebNN 图 API 与 WebGPU 通用计算是互补的本地推理后端'],
  ['PWA-02', 'MOBILE-01', '可安装 Web 应用与原生移动应用共享通知、深链和生命周期问题'],
  ['LOCALFIRST-01', 'WEBAI-09', '本地模型、索引和用户数据共享浏览器存储配额、迁移与恢复问题'],
  ['RUNTIME-02', 'MOBILE-01', '桌面桥接与移动原生桥都需要最小能力、版本和发布治理'],
  ['SEO-01', 'CONTENT-01', '公共可发现性依赖稳定内容模型、发布和索引链路'],
  ['CONTENT-01', 'EDITOR-01', '内容模型与复杂编辑器共享 AST、版本、净化和发布边界'],
  ['EDITOR-01', 'AIUI-01', 'AI 创作界面的流式候选、取消和人工接管需要稳定编辑事务与选择区'],
  ['ANALYTICS-01', 'OBS-01', '产品指标与技术可观测性共享数据质量治理'],
  ['PRIVACY-01', 'AIAPP-06', 'RAG 数据进入模型前必须明确目的与留存边界'],
  ['ARCH-03', 'ENG-07', '构建工具升级是渐进迁移方法的具体应用'],
  ['BIZ-08', 'ENG-05', '可追踪验收标准与质量门禁需要互相校准'],
  ['API-01', 'GQL-01', 'OpenAPI 与 GraphQL 都需要稳定的接口 Schema 契约'],
];

export function buildRelationDefinitions(): RelationDefinition[] {
  const definitions: RelationDefinition[] = [];
  for (const [source, target, description] of explicitPrerequisites) {
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
  // 一旦一组能力被降级为 RELATED，就清理历史库中同方向或反方向的旧硬前置，避免双重语义。
  const relatedKeys = new Set(relatedPairs.flatMap(([source, target]) => [
    `${source}:${target}`,
    `${target}:${source}`,
  ]));
  const prerequisiteRows = rawDb.prepare(`
    SELECT edge.id, source.code AS source, target.code AS target
    FROM knowledge_edges edge
    JOIN knowledge_points source ON source.id = edge.source_point_id
    JOIN knowledge_points target ON target.id = edge.target_point_id
    WHERE edge.type = 'PREREQUISITE'
  `).all() as Array<{ id: string; source: string; target: string }>;
  const remove = rawDb.prepare('DELETE FROM knowledge_edges WHERE id = ?');
  for (const row of prerequisiteRows) {
    if (relatedKeys.has(`${row.source}:${row.target}`)) remove.run(row.id);
  }
  // 领域路径重排时删除已失效的自动相邻关系；非自动描述的人工关系继续保留。
  const autoRows = rawDb.prepare(`
    SELECT edge.id, source.code AS source, target.code AS target, edge.type
    FROM knowledge_edges edge
    JOIN knowledge_points source ON source.id = edge.source_point_id
    JOIN knowledge_points target ON target.id = edge.target_point_id
    WHERE edge.description LIKE '建议先掌握 %'
  `).all() as Array<{ id: string; source: string; target: string; type: RelationDefinition['type'] }>;
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

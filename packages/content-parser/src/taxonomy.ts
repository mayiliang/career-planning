export const CAPABILITY_LAYERS = ['CORE', 'APPLICATION', 'SPECIALTY', 'LEADERSHIP'] as const;
export type CapabilityLayer = typeof CAPABILITY_LAYERS[number];

export const REQUIREMENT_LEVELS = ['REQUIRED', 'TRACK_REQUIRED', 'ELECTIVE'] as const;
export type RequirementLevel = typeof REQUIREMENT_LEVELS[number];

export const MATURITY_LEVELS = ['STABLE', 'EVOLVING', 'EXPERIMENTAL'] as const;
export type MaturityLevel = typeof MATURITY_LEVELS[number];

/** AI 与该能力的关系，和能力层级、成熟度彼此独立。 */
export const AI_RELATIONS = ['NONE', 'AI_ASSISTED', 'AI_NATIVE', 'AGENTIC'] as const;
export type AiRelation = typeof AI_RELATIONS[number];

/** 主适用范围，用于列表筛选和兼容现有数据。 */
export const PORTABILITY_LEVELS = [
  'PORTABLE',
  'FRAMEWORK_SPECIFIC',
  'VENDOR_SPECIFIC',
  'PLATFORM_SPECIFIC',
  'JURISDICTION_SPECIFIC',
] as const;
export type PortabilityLevel = typeof PORTABILITY_LEVELS[number];

/** 可多选的约束范围；解决单个知识点同时受框架、厂商、平台或辖区约束的问题。 */
export const APPLICABILITY_TAGS = [
  'FRAMEWORK_SPECIFIC',
  'VENDOR_SPECIFIC',
  'PLATFORM_SPECIFIC',
  'JURISDICTION_SPECIFIC',
] as const;
export type ApplicabilityTag = typeof APPLICABILITY_TAGS[number];

export const TRACK_IDS = [
  'react',
  'vue',
  'umi-antd',
  'agent-mcp',
] as const;
export type TrackId = typeof TRACK_IDS[number];

/** 跨领域主题标签；与可执行的学习路线严格分离。 */
export const TOPIC_TAGS = [
  'component-platform',
  'api-engineering',
  'tooling',
  'platform-engineering',
  'realtime-ai',
  'ai-tooling',
  'engineering-leadership',
  'web-platform',
  'accessibility',
  'security-privacy',
  'performance-mobile',
  'media',
  'runtime-cross-platform',
  'node-bff',
  'data-realtime',
  'browser-ai',
  'graphics-viz',
  'growth-content-i18n',
  'deployment',
  'visual-testing',
] as const;
export type TopicTag = typeof TOPIC_TAGS[number];

export interface KnowledgeTaxonomy {
  capabilityLayer: CapabilityLayer;
  requirementLevel: RequirementLevel;
  maturity: MaturityLevel;
  aiRelation: AiRelation;
  portability: PortabilityLevel;
  applicabilityTags: ApplicabilityTag[];
  topicTags: TopicTag[];
  trackIds: TrackId[];
  verifiedAt: string;
  fallbackStrategy: string;
}

export const TAXONOMY_VERIFIED_AT = '2026-08-04';

const MATURITY_FALLBACKS: Record<MaturityLevel, string> = {
  STABLE: '按 Baseline、目标浏览器和运行环境做能力检测与渐进增强。',
  EVOLVING: '固定规范或依赖版本，维护兼容矩阵，并保留上一稳定实现或服务端替代路径。',
  EXPERIMENTAL: '必须使用能力检测和显式开关；不可用时降级到稳定 Web API、云端能力或人工流程。',
};

const PORTABILITY_FALLBACKS: Record<PortabilityLevel, string> = {
  PORTABLE: '核心设计保持实现无关，避免把短期工具细节写入领域契约。',
  FRAMEWORK_SPECIFIC: '隔离框架适配层，保留框架无关的业务、数据与测试契约。',
  VENDOR_SPECIFIC: '隔离厂商适配层，保留标准协议、替代供应商或人工流程回退。',
  PLATFORM_SPECIFIC: '使用运行时能力检测与平台适配层，保留浏览器或服务端等替代路径。',
  JURISDICTION_SPECIFIC: '按用户、数据和部署所适用的地区配置控制，并设置法务复核与停止发布门禁。',
};

export const DOMAIN_TAXONOMY: Record<string, KnowledgeTaxonomy> = {
  '01': taxonomy('CORE', 'REQUIRED', 'STABLE'),
  '02': taxonomy('CORE', 'REQUIRED', 'STABLE'),
  '03': taxonomy('APPLICATION', 'TRACK_REQUIRED', 'STABLE', 'NONE', 'FRAMEWORK_SPECIFIC', ['react'], ['FRAMEWORK_SPECIFIC']),
  '04': taxonomy('SPECIALTY', 'TRACK_REQUIRED', 'STABLE', 'NONE', 'FRAMEWORK_SPECIFIC', ['umi-antd'], ['FRAMEWORK_SPECIFIC']),
  '05': taxonomy('APPLICATION', 'REQUIRED', 'STABLE'),
  '06': taxonomy('CORE', 'REQUIRED', 'STABLE'),
  '07': taxonomy('APPLICATION', 'REQUIRED', 'STABLE'),
  '08': taxonomy('SPECIALTY', 'ELECTIVE', 'STABLE'),
  '09': taxonomy('APPLICATION', 'REQUIRED', 'STABLE'),
  '10': taxonomy('LEADERSHIP', 'REQUIRED', 'STABLE'),
  '11': taxonomy('APPLICATION', 'TRACK_REQUIRED', 'STABLE', 'NONE', 'FRAMEWORK_SPECIFIC', ['vue'], ['FRAMEWORK_SPECIFIC']),
  '12': taxonomy('APPLICATION', 'REQUIRED', 'EVOLVING', 'AI_NATIVE'),
  '13': taxonomy('SPECIALTY', 'TRACK_REQUIRED', 'EVOLVING', 'AGENTIC', 'PORTABLE', ['agent-mcp']),
  '14': taxonomy('SPECIALTY', 'ELECTIVE', 'EXPERIMENTAL', 'AI_NATIVE'),
  '15': taxonomy('APPLICATION', 'REQUIRED', 'EVOLVING', 'AI_ASSISTED'),
  '16': taxonomy('APPLICATION', 'REQUIRED', 'STABLE'),
  '17': taxonomy('APPLICATION', 'REQUIRED', 'STABLE'),
  '18': taxonomy('SPECIALTY', 'ELECTIVE', 'STABLE'),
  '19': taxonomy('CORE', 'REQUIRED', 'STABLE'),
  '20': taxonomy('LEADERSHIP', 'REQUIRED', 'STABLE'),
};

const POINT_OVERRIDES: Record<string, Partial<KnowledgeTaxonomy>> = {
  'WASM-01': scope('SPECIALTY', 'ELECTIVE', 'EVOLVING', 'PLATFORM_SPECIFIC', ['web-platform'], ['PLATFORM_SPECIFIC']),
  'WEB-03': { maturity: 'EVOLVING' },
  'A11Y-01': { topicTags: ['accessibility'] },
  'BROWSER-02': { maturity: 'EVOLVING' },
  'WEB-04': { maturity: 'EVOLVING' },
  'SEC-01': { topicTags: ['security-privacy'] },
  'SEC-02': { topicTags: ['security-privacy'] },
  'SEC-03': { topicTags: ['security-privacy'] },
  'SEC-04': { topicTags: ['security-privacy'] },
  'SEC-05': { topicTags: ['security-privacy'] },
  'TS-08': { capabilityLayer: 'APPLICATION' },
  'REACT-09': { maturity: 'EVOLVING' },

  'ENG-04': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', topicTags: ['component-platform'] },
  'ENG-07': scope('SPECIALTY', 'ELECTIVE', 'EVOLVING', 'PORTABLE', ['tooling'], []),
  'TEST-02': { capabilityLayer: 'APPLICATION', requirementLevel: 'TRACK_REQUIRED', portability: 'FRAMEWORK_SPECIFIC', applicabilityTags: ['FRAMEWORK_SPECIFIC'], trackIds: ['react'] },
  'TEST-03': { topicTags: ['visual-testing'] },
  'OBS-01': { maturity: 'EVOLVING' },
  'DX-01': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', topicTags: ['platform-engineering'] },

  'ANTD-04': { requirementLevel: 'ELECTIVE', portability: 'FRAMEWORK_SPECIFIC', applicabilityTags: ['FRAMEWORK_SPECIFIC', 'PLATFORM_SPECIFIC'], topicTags: ['performance-mobile'], trackIds: ['umi-antd'] },
  'H5-03': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', topicTags: ['performance-mobile'] },
  'H5-04': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', topicTags: ['node-bff'] },
  'MEDIA-01': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', maturity: 'EVOLVING', topicTags: ['media'] },
  'MEDIA-02': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', maturity: 'EVOLVING', topicTags: ['media'] },
  'HYBRID-01': scope('SPECIALTY', 'ELECTIVE', 'STABLE', 'VENDOR_SPECIFIC', ['runtime-cross-platform'], ['VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC']),

  'COMP-01': { capabilityLayer: 'CORE', requirementLevel: 'REQUIRED' },
  'COMP-02': { capabilityLayer: 'CORE', requirementLevel: 'REQUIRED' },
  'UX-01': { capabilityLayer: 'CORE', requirementLevel: 'REQUIRED' },
  'RUNTIME-01': scope('SPECIALTY', 'ELECTIVE', 'STABLE', 'PLATFORM_SPECIFIC', ['runtime-cross-platform'], ['PLATFORM_SPECIFIC']),
  'RUNTIME-02': scope('SPECIALTY', 'ELECTIVE', 'STABLE', 'PLATFORM_SPECIFIC', ['runtime-cross-platform'], ['PLATFORM_SPECIFIC']),
  'MOBILE-01': scope('SPECIALTY', 'ELECTIVE', 'STABLE', 'PLATFORM_SPECIFIC', ['runtime-cross-platform'], ['PLATFORM_SPECIFIC']),

  'NODE-01': scope('APPLICATION', 'REQUIRED', 'STABLE', 'PLATFORM_SPECIFIC', ['node-bff'], ['PLATFORM_SPECIFIC']),
  'NODE-02': scope('APPLICATION', 'REQUIRED', 'STABLE', 'PLATFORM_SPECIFIC', ['node-bff'], ['PLATFORM_SPECIFIC']),
  'NODE-03': scope('SPECIALTY', 'ELECTIVE', 'STABLE', 'PLATFORM_SPECIFIC', ['tooling'], ['PLATFORM_SPECIFIC']),
  'NODE-04': scope('APPLICATION', 'REQUIRED', 'STABLE', 'PLATFORM_SPECIFIC', ['node-bff'], ['PLATFORM_SPECIFIC']),
  'API-01': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', topicTags: ['api-engineering'] },
  'API-02': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', topicTags: ['api-engineering'] },
  'CAREER-01': { capabilityLayer: 'APPLICATION' },
  'CAREER-02': { capabilityLayer: 'APPLICATION' },
  'CAREER-04': { capabilityLayer: 'APPLICATION' },
  'CAREER-05': { topicTags: ['engineering-leadership'] },
  'CAREER-06': { requirementLevel: 'ELECTIVE', topicTags: ['engineering-leadership'] },

  'VUE-09': { requirementLevel: 'ELECTIVE', trackIds: ['vue'] },
  'VUE-11': { requirementLevel: 'ELECTIVE', trackIds: ['vue'] },

  'AIAPP-05': { aiRelation: 'AI_NATIVE' },
  'AIAPP-11': { requirementLevel: 'ELECTIVE', aiRelation: 'AI_NATIVE', topicTags: ['realtime-ai'] },
  'AIMEDIA-01': { requirementLevel: 'ELECTIVE', aiRelation: 'AI_NATIVE', topicTags: ['media'] },
  'AIUI-01': { capabilityLayer: 'SPECIALTY', requirementLevel: 'TRACK_REQUIRED', maturity: 'EVOLVING', aiRelation: 'AGENTIC', trackIds: ['agent-mcp'] },

  'MCP-01': { capabilityLayer: 'SPECIALTY', requirementLevel: 'TRACK_REQUIRED', maturity: 'EVOLVING', aiRelation: 'AGENTIC', trackIds: ['agent-mcp'] },
  'AGENT-11': { requirementLevel: 'ELECTIVE', maturity: 'EVOLVING', aiRelation: 'AGENTIC' },

  'WEBAI-01': { maturity: 'EVOLVING', aiRelation: 'AI_NATIVE', portability: 'VENDOR_SPECIFIC', applicabilityTags: ['VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC'], topicTags: ['browser-ai'] },
  'WEBAI-02': { capabilityLayer: 'SPECIALTY', maturity: 'EVOLVING', aiRelation: 'AI_NATIVE', topicTags: ['browser-ai'] },
  'WEBAI-03': { capabilityLayer: 'SPECIALTY', maturity: 'EVOLVING', aiRelation: 'AI_NATIVE', topicTags: ['browser-ai'] },
  'WEBAI-04': { maturity: 'EVOLVING', aiRelation: 'AI_NATIVE', topicTags: ['browser-ai'] },
  'WEBAI-05': { maturity: 'EVOLVING', aiRelation: 'AI_NATIVE', topicTags: ['browser-ai'] },
  'WEBAI-06': { maturity: 'EVOLVING', aiRelation: 'AI_NATIVE', topicTags: ['browser-ai'] },
  'WEBAI-07': { maturity: 'EVOLVING', aiRelation: 'AI_NATIVE', topicTags: ['browser-ai'] },
  'WEBAI-08': { maturity: 'EVOLVING', aiRelation: 'AI_NATIVE', topicTags: ['browser-ai'] },
  'WEBAI-09': { maturity: 'EVOLVING', aiRelation: 'AI_NATIVE', topicTags: ['browser-ai'] },
  'WEBAI-10': { maturity: 'STABLE', aiRelation: 'AI_NATIVE', topicTags: ['browser-ai'] },
  'WEBAI-11': { maturity: 'EXPERIMENTAL', aiRelation: 'AI_NATIVE', topicTags: ['browser-ai'] },
  'WEBAGENT-01': { requirementLevel: 'ELECTIVE', maturity: 'EXPERIMENTAL', aiRelation: 'AGENTIC', topicTags: ['browser-ai'], trackIds: ['agent-mcp'] },

  'AIDEV-06': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', aiRelation: 'AI_ASSISTED', topicTags: ['ai-tooling'] },
  'AIDEV-08': { requirementLevel: 'ELECTIVE', aiRelation: 'AI_ASSISTED', topicTags: ['engineering-leadership'] },
  'AIDEV-09': { requirementLevel: 'ELECTIVE', maturity: 'EVOLVING', aiRelation: 'AI_ASSISTED' },
  'AIDEV-10': { topicTags: ['engineering-leadership'] },
  'AIDEV-11': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', aiRelation: 'AI_ASSISTED', topicTags: ['ai-tooling'] },

  'DOCKER-03': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', topicTags: ['deployment'] },
  'DOCKER-04': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', topicTags: ['deployment'] },
  'EDGE-01': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', maturity: 'EVOLVING', portability: 'PLATFORM_SPECIFIC', applicabilityTags: ['PLATFORM_SPECIFIC'], topicTags: ['deployment'] },
  'COLLAB-01': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', maturity: 'EVOLVING', topicTags: ['data-realtime'] },
  'PWA-01': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE' },
  'PWA-02': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', maturity: 'EVOLVING' },
  'LOCALFIRST-01': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', topicTags: ['data-realtime'] },
  'GQL-01': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', topicTags: ['data-realtime'] },

  'GRAPHICS-01': { topicTags: ['graphics-viz'] },
  'GRAPHICS-02': { maturity: 'EVOLVING', topicTags: ['graphics-viz'] },
  'I18N-01': { topicTags: ['growth-content-i18n'] },
  'I18N-02': { maturity: 'EVOLVING', topicTags: ['growth-content-i18n'] },
  'SEO-01': { topicTags: ['growth-content-i18n'] },
  'CONTENT-01': { topicTags: ['growth-content-i18n'] },
  'EDITOR-01': { topicTags: ['growth-content-i18n'] },
  'COMPAT-01': { capabilityLayer: 'CORE', requirementLevel: 'REQUIRED' },

  'IDENTITY-01': { maturity: 'EVOLVING', topicTags: ['security-privacy'] },
  'IDENTITY-02': { maturity: 'EVOLVING', topicTags: ['security-privacy'] },
  'PRIVACY-01': { topicTags: ['security-privacy'] },
  'PRIVACY-02': { portability: 'JURISDICTION_SPECIFIC', applicabilityTags: ['JURISDICTION_SPECIFIC'], topicTags: ['security-privacy'] },
  'AIPROD-01': { capabilityLayer: 'APPLICATION', maturity: 'EVOLVING', aiRelation: 'AI_NATIVE' },
  'AIPROD-02': { capabilityLayer: 'APPLICATION', maturity: 'EVOLVING', aiRelation: 'AI_NATIVE' },
  'AISAFE-01': { capabilityLayer: 'SPECIALTY', maturity: 'EVOLVING', aiRelation: 'AI_NATIVE', topicTags: ['security-privacy'] },
  'AISAFE-02': { capabilityLayer: 'SPECIALTY', maturity: 'EVOLVING', aiRelation: 'AI_NATIVE', topicTags: ['security-privacy'] },
  'AIGOV-01': { capabilityLayer: 'LEADERSHIP', maturity: 'EVOLVING', aiRelation: 'AI_NATIVE', portability: 'JURISDICTION_SPECIFIC', applicabilityTags: ['JURISDICTION_SPECIFIC'], topicTags: ['security-privacy', 'engineering-leadership'] },

  'BACKEND-01': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE' },
  'BACKEND-02': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE' },
  'BACKEND-03': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE' },
  'CLOUD-01': { capabilityLayer: 'SPECIALTY', requirementLevel: 'ELECTIVE', maturity: 'EVOLVING', topicTags: ['deployment'] },
  'SUSTAIN-01': { requirementLevel: 'ELECTIVE', maturity: 'EVOLVING', topicTags: ['engineering-leadership'] },
};

export function resolvePointTaxonomy(code: string, domainCode: string): KnowledgeTaxonomy {
  const base = DOMAIN_TAXONOMY[domainCode];
  if (!base) throw new Error(`未知知识领域：${domainCode}`);
  const override = POINT_OVERRIDES[code];
  const merged = { ...base, ...override };
  const trackIds = [...(override?.trackIds ?? base.trackIds)];
  const topicTags = [...(override?.topicTags ?? base.topicTags)];
  const applicabilityTags = [...(override?.applicabilityTags ?? base.applicabilityTags)];
  if (merged.requirementLevel === 'TRACK_REQUIRED' && trackIds.length === 0) {
    throw new Error(`赛道必修知识点缺少 trackIds：${code}`);
  }
  return {
    ...merged,
    trackIds,
    topicTags,
    applicabilityTags,
    fallbackStrategy: override?.fallbackStrategy
      ?? buildFallbackStrategy(merged.maturity, merged.portability),
  };
}

function taxonomy(
  capabilityLayer: CapabilityLayer,
  requirementLevel: RequirementLevel,
  maturity: MaturityLevel,
  aiRelation: AiRelation = 'NONE',
  portability: PortabilityLevel = 'PORTABLE',
  trackIds: TrackId[] = [],
  applicabilityTags: ApplicabilityTag[] = [],
  topicTags: TopicTag[] = [],
): KnowledgeTaxonomy {
  return {
    capabilityLayer,
    requirementLevel,
    maturity,
    aiRelation,
    portability,
    applicabilityTags,
    topicTags,
    trackIds,
    verifiedAt: TAXONOMY_VERIFIED_AT,
    fallbackStrategy: buildFallbackStrategy(maturity, portability),
  };
}

function scope(
  capabilityLayer: CapabilityLayer,
  requirementLevel: RequirementLevel,
  maturity: MaturityLevel,
  portability: PortabilityLevel,
  topicTags: TopicTag[],
  applicabilityTags: ApplicabilityTag[],
  trackIds: TrackId[] = [],
): Partial<KnowledgeTaxonomy> {
  return { capabilityLayer, requirementLevel, maturity, portability, topicTags, applicabilityTags, trackIds };
}

function buildFallbackStrategy(maturity: MaturityLevel, portability: PortabilityLevel): string {
  return `${MATURITY_FALLBACKS[maturity]}${PORTABILITY_FALLBACKS[portability]}`;
}

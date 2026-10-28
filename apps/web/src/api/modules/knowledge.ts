/** 知识点、学习资料与关系图谱：运行时响应校验与业务接口。 */
import { z } from 'zod';
import { request } from '../http';

const KnowledgePointListItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  secondaryTopic: z.string(),
  topicOrder: z.number().int().nonnegative(),
  difficulty: z.enum(['intermediate', 'senior', 'advanced']),
  capabilityLayer: z.enum(['CORE', 'APPLICATION', 'SPECIALTY', 'LEADERSHIP']),
  requirementLevel: z.enum(['REQUIRED', 'TRACK_REQUIRED', 'ELECTIVE']),
  maturity: z.enum(['STABLE', 'EVOLVING', 'EXPERIMENTAL']),
  aiRelation: z.enum(['NONE', 'AI_ASSISTED', 'AI_NATIVE', 'AGENTIC']),
  portability: z.enum(['PORTABLE', 'FRAMEWORK_SPECIFIC', 'VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC', 'JURISDICTION_SPECIFIC']),
  applicabilityTags: z.array(z.enum(['FRAMEWORK_SPECIFIC', 'VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC', 'JURISDICTION_SPECIFIC'])),
  topicTags: z.array(z.string()),
  trackIds: z.array(z.enum(['react', 'vue', 'umi-antd', 'agent-mcp'])),
  verifiedAt: z.string(),
  fallbackStrategy: z.string(),
  planWeek: z.number().nullable(),
  status: z.enum(['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING']),
  learningState: z.enum(['NOT_STARTED', 'LEARNING', 'LEARNED', 'DEFERRED']),
  masteryLevel: z.number().int().min(0).max(4),
  learnedAt: z.string().nullable(),
  deferredAt: z.string().nullable(),
  deferReason: z.string().nullable(),
  currentFocus: z.boolean(),
  domainId: z.string(),
  domainCode: z.string(),
  domainTitle: z.string(),
  selfMasteredAt: z.string().nullable(),
  firstPassedAt: z.string().nullable(),
  masteredAt: z.string().nullable(),
  routeOrder: z.number(),
  studyMinutes: z.number(),
  practiceMinutes: z.number(),
  projectMinutes: z.number(),
  assessmentMinutes: z.number(),
  retestMinutes: z.number(),
  estimatedTotalMinutes: z.number(),
  challengeProfile: z.enum(['THEORY_ONLY', 'EXAMPLE_DRIVEN', 'CODING', 'DEBUGGING', 'TOOL_OPERATION', 'DESIGN_CASE']),
});

const KnowledgeRecommendationSchema = z.object({
  action: z.enum(['LEARN', 'CONTINUE', 'ASSESS', 'RETEST', 'RELEARN', 'COMPLETE']),
  readiness: z.enum(['READY', 'BLOCKED', 'COMPLETE']),
  reason: z.string(),
  point: KnowledgePointListItemSchema.nullable(),
  blockers: z.array(z.object({
    code: z.string(),
    title: z.string(),
    status: z.enum(['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING']),
  })),
  prerequisiteProgress: z.object({ mastered: z.number(), total: z.number() }),
  routePosition: z.object({ week: z.number(), index: z.number(), total: z.number() }).nullable(),
});

const KnowledgePointDetailSchema = KnowledgePointListItemSchema.extend({
  summary: z.string().nullable(),
  studyMaterialMd: z.string(),
  assessmentSpecMd: z.string(),
  passCriteriaMd: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  estimatedCoreMinutes: z.number(),
  learningActivities: z.array(z.object({
    id: z.string(),
    type: z.enum(['READING', 'GUIDED_PRACTICE', 'APPLICATION', 'CASE_STUDY']),
    label: z.string(), minutes: z.number(), optional: z.boolean(), task: z.string(),
    input: z.string(), outputRequirements: z.array(z.string()), completionCriteria: z.array(z.string()),
    failureFixture: z.string().nullable(),
    verificationChecklist: z.array(z.string()),
    vetoItems: z.array(z.string()),
    deliveryMode: z.enum(['READ_ONLY', 'WORKSPACE']), workspaceMode: z.enum(['TEXT', 'CODE']).nullable(),
    language: z.enum(['javascript', 'typescript']).nullable(), starterCode: z.string().nullable(), submissionTemplate: z.string().nullable(),
    materialReferences: z.array(z.object({ title: z.string(), url: z.string().nullable(), locator: z.string(), focus: z.string() })),
  })),
});

const KnowledgeMaterialSchema = z.object({
  guide: z.string(),
  anchor: z.string(),
  title: z.string(),
  markdown: z.string(),
});

const MaterialReadingProgressSchema = z.object({
  guide: z.string(),
  anchor: z.string(),
  progressPercent: z.number(),
  completed: z.boolean(),
  completedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

const KnowledgeListResponseSchema = z.object({
  items: z.array(KnowledgePointListItemSchema),
  total: z.number(),
});

const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['domain', 'knowledge']),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    code: z.string(),
    title: z.string(),
    status: z.string().optional(),
    domainCode: z.string().optional(),
    domainTitle: z.string().optional(),
    difficulty: z.string().optional(),
    capabilityLayer: z.string().optional(),
    requirementLevel: z.string().optional(),
    maturity: z.string().optional(),
    aiRelation: z.string().optional(),
    portability: z.string().optional(),
    applicabilityTags: z.array(z.string()).optional(),
    topicTags: z.array(z.string()).optional(),
    trackIds: z.array(z.string()).optional(),
    secondaryTopic: z.string().optional(),
    topicOrder: z.number().optional(),
    selfMastered: z.boolean().optional(),
    strictPassed: z.boolean().optional(),
    pointCount: z.number().optional(),
    masteredCount: z.number().optional(),
  }),
});

const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
  animated: z.boolean().optional(),
  data: z.object({
    edgeType: z.string(),
    weight: z.number(),
  }),
});

const GraphDataSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

const DomainStatsSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  orderIndex: z.number(),
  capabilityLayer: z.string(),
  requirementLevel: z.string(),
  maturity: z.string(),
  aiRelation: z.string(),
  portability: z.string(),
  applicabilityTags: z.array(z.string()),
  topicTags: z.array(z.string()),
  trackIds: z.array(z.string()),
  verifiedAt: z.string(),
  pointCount: z.number(),
  masteredCount: z.number(),
  learningCount: z.number(),
  notStartedCount: z.number(),
});

const RelationPointSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  status: z.string(),
  domainCode: z.string(),
  domainTitle: z.string(),
  description: z.string().nullable(),
  weight: z.number(),
});

const KnowledgeRelationsSchema = z.object({
  prerequisites: z.array(RelationPointSchema),
  dependents: z.array(RelationPointSchema),
  related: z.array(RelationPointSchema),
  appliedWith: z.array(RelationPointSchema),
});

const KnowledgeTreeSchema = z.object({
  title: z.string(),
  totalPoints: z.number(),
  groups: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    domains: z.array(z.object({
      id: z.string(),
      code: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      points: z.array(z.object({
        id: z.string(),
        code: z.string(),
        title: z.string(),
        status: z.string(),
      })),
    })),
  })),
});

export const knowledgeApi = {
  async getKnowledgePoints(params?: {
    domainId?: string;
    status?: string;
    capabilityLayer?: 'CORE' | 'APPLICATION' | 'SPECIALTY' | 'LEADERSHIP';
    requirementLevel?: 'REQUIRED' | 'TRACK_REQUIRED' | 'ELECTIVE';
    maturity?: 'STABLE' | 'EVOLVING' | 'EXPERIMENTAL';
    aiRelation?: 'NONE' | 'AI_ASSISTED' | 'AI_NATIVE' | 'AGENTIC';
    portability?: 'PORTABLE' | 'FRAMEWORK_SPECIFIC' | 'VENDOR_SPECIFIC' | 'PLATFORM_SPECIFIC' | 'JURISDICTION_SPECIFIC';
    secondaryTopic?: string;
    trackId?: 'react' | 'vue' | 'umi-antd' | 'agent-mcp';
    topicTag?: string;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.domainId) query.set('domainId', params.domainId);
    if (params?.status) query.set('status', params.status);
    if (params?.capabilityLayer) query.set('capabilityLayer', params.capabilityLayer);
    if (params?.requirementLevel) query.set('requirementLevel', params.requirementLevel);
    if (params?.maturity) query.set('maturity', params.maturity);
    if (params?.aiRelation) query.set('aiRelation', params.aiRelation);
    if (params?.portability) query.set('portability', params.portability);
    if (params?.secondaryTopic) query.set('secondaryTopic', params.secondaryTopic);
    if (params?.trackId) query.set('trackId', params.trackId);
    if (params?.topicTag) query.set('topicTag', params.topicTag);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString();
    const path = queryString ? `/knowledge/points?${queryString}` : '/knowledge/points';

    return request(path, KnowledgeListResponseSchema);
  },

  async getKnowledgeRecommendation() {
    return request('/knowledge/recommendation', KnowledgeRecommendationSchema);
  },

  async getKnowledgePoint(code: string, signal?: AbortSignal) {
    return request(`/knowledge/points/${encodeURIComponent(code)}`, KnowledgePointDetailSchema, { signal });
  },

  async getKnowledgeMaterial(guide: string, anchor: string, signal?: AbortSignal) {
    return request(
      `/knowledge/materials/${encodeURIComponent(guide)}/${encodeURIComponent(anchor)}`,
      KnowledgeMaterialSchema,
      { signal },
    );
  },

  async getMaterialReadingProgress(signal?: AbortSignal) {
    return request('/knowledge/material-progress', z.array(MaterialReadingProgressSchema), { signal });
  },

  async updateMaterialReadingProgress(guide: string, anchor: string, progressPercent: number) {
    return request(
      `/knowledge/materials/${encodeURIComponent(guide)}/${encodeURIComponent(anchor)}/progress`,
      MaterialReadingProgressSchema,
      { method: 'PATCH', body: JSON.stringify({ progressPercent }) },
    );
  },

  async updateKnowledgePointSummary(code: string, summary: string) {
    return request(`/knowledge/points/${code}`, z.object({ updatedAt: z.string() }), {
      method: 'PATCH',
      body: JSON.stringify({ summary }),
    });
  },

  async selfMasterKnowledgePoint(code: string, summary: string) {
    return request(`/knowledge/points/${code}/self-master`, z.object({
      previousStatus: z.string(),
      newStatus: z.string(),
      selfMasteredAt: z.string(),
    }), {
      method: 'POST',
      body: JSON.stringify({ summary }),
    });
  },

  async getDomainStats() {
    return request('/knowledge/domains', z.array(DomainStatsSchema));
  },

  async getGraphData(params?: {
    domainCode?: string;
    collapsedDomains?: string[];
  }) {
    const query = new URLSearchParams();
    if (params?.domainCode) query.set('domainCode', params.domainCode);
    if (params?.collapsedDomains) query.set('collapsedDomains', params.collapsedDomains.join(','));

    const queryString = query.toString();
    const path = queryString ? `/knowledge/graph?${queryString}` : '/knowledge/graph';

    return request(path, GraphDataSchema);
  },

  async getKnowledgeTree() {
    return request('/knowledge/tree', KnowledgeTreeSchema);
  },

  async getKnowledgeRelations(pointId: string) {
    return request(`/knowledge/points/${pointId}/relations`, KnowledgeRelationsSchema);
  },
};

export type KnowledgePointListItem = z.infer<typeof KnowledgePointListItemSchema>;

export type KnowledgeRecommendation = z.infer<typeof KnowledgeRecommendationSchema>;

export type KnowledgePointDetail = z.infer<typeof KnowledgePointDetailSchema>;

export type LearningActivity = KnowledgePointDetail['learningActivities'][number];

export type GraphNode = z.infer<typeof GraphNodeSchema>;

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export type GraphData = z.infer<typeof GraphDataSchema>;

export type DomainStats = z.infer<typeof DomainStatsSchema>;

export type KnowledgeRelations = z.infer<typeof KnowledgeRelationsSchema>;

export type RelationPoint = z.infer<typeof RelationPointSchema>;

export type KnowledgeTree = z.infer<typeof KnowledgeTreeSchema>;

/**
 * 知识图谱服务
 * 
 * Phase 4 实现：
 * - 获取领域列表和统计
 * - 获取图谱节点和边
 * - 支持领域折叠和状态同步
 */
import { db, rawDb } from '../db/index.js';
import { knowledgeDomains, knowledgePoints, knowledgeEdges } from '../db/schema.js';
import { inArray } from 'drizzle-orm';

// 图谱节点类型（Vue Flow 格式）
export interface GraphNode {
  id: string;
  type: 'domain' | 'knowledge';
  position: { x: number; y: number };
  data: {
    code: string;
    title: string;
    status?: string;
    domainCode?: string;
    domainTitle?: string;
    difficulty?: string;
    selfMastered?: boolean;
    strictPassed?: boolean;
    pointCount?: number;
    masteredCount?: number;
  };
}

// 图谱边类型（Vue Flow 格式）
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated?: boolean;
  data: {
    edgeType: string;
    weight: number;
  };
}

// 图谱数据结构
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// 领域统计
export interface DomainStats {
  id: string;
  code: string;
  title: string;
  orderIndex: number;
  pointCount: number;
  masteredCount: number;
  learningCount: number;
  notStartedCount: number;
}

const domainLearningPath: Array<[string, string]> = [
  ['01', '02'], ['01', '07'], ['02', '03'], ['02', '11'], ['03', '04'],
  ['04', '05'], ['05', '06'], ['06', '08'], ['06', '09'], ['09', '12'],
  ['12', '13'], ['14', '12'], ['13', '15'], ['08', '10'], ['15', '10'],
];

function gridPosition(index: number, columns: number, xGap: number, yGap: number, offsetX = 0, offsetY = 0) {
  return {
    x: offsetX + (index % columns) * xGap,
    y: offsetY + Math.floor(index / columns) * yGap,
  };
}

/**
 * 获取所有领域及其统计
 */
export async function getDomainStats(): Promise<DomainStats[]> {
  // 查询所有领域
  const domains = await db.select()
    .from(knowledgeDomains)
    .orderBy(knowledgeDomains.orderIndex);
  
  if (domains.length === 0) {
    return [];
  }
  
  // 按领域分组统计知识点
  const domainIds = domains.map(d => d.id);
  
  const points = await db.select({
    domainId: knowledgePoints.domainId,
    status: knowledgePoints.status,
  })
    .from(knowledgePoints)
    .where(inArray(knowledgePoints.domainId, domainIds));
  
  // 统计每个领域的知识点数量
  const statsMap = new Map<string, {
    pointCount: number;
    masteredCount: number;
    learningCount: number;
    notStartedCount: number;
  }>();
  
  for (const point of points) {
    const stats = statsMap.get(point.domainId) || {
      pointCount: 0,
      masteredCount: 0,
      learningCount: 0,
      notStartedCount: 0,
    };
    
    stats.pointCount++;
    
    if (point.status === 'MASTERED') {
      stats.masteredCount++;
    } else if (['LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST'].includes(point.status)) {
      stats.learningCount++;
    } else {
      stats.notStartedCount++;
    }
    
    statsMap.set(point.domainId, stats);
  }
  
  // 组装结果
  return domains.map(domain => {
    const stats = statsMap.get(domain.id) || {
      pointCount: 0,
      masteredCount: 0,
      learningCount: 0,
      notStartedCount: 0,
    };
    
    return {
      id: domain.id,
      code: domain.code,
      title: domain.title,
      orderIndex: domain.orderIndex,
      ...stats,
    };
  });
}

/**
 * 获取图谱数据
 * 
 * @param options 筛选选项
 * - domainCode: 指定领域代码，展开该领域节点
 * - collapsedDomains: 折叠的领域 ID 列表
 */
export async function getGraphData(options?: {
  domainCode?: string;
  collapsedDomains?: string[];
}): Promise<GraphData> {
  // 获取所有领域和知识点
  const domains = await db.select()
    .from(knowledgeDomains)
    .orderBy(knowledgeDomains.orderIndex);
  
  const points = await db.select({
    id: knowledgePoints.id,
    code: knowledgePoints.code,
    title: knowledgePoints.title,
    domainId: knowledgePoints.domainId,
    status: knowledgePoints.status,
    difficulty: knowledgePoints.difficulty,
    selfMasteredAt: knowledgePoints.selfMasteredAt,
    firstPassedAt: knowledgePoints.firstPassedAt,
    masteredAt: knowledgePoints.masteredAt,
  })
    .from(knowledgePoints)
    .orderBy(knowledgePoints.code);
  
  // 构建领域 ID 到领域信息的映射
  const domainMap = new Map(domains.map(d => [d.id, d]));
  
  // 构建知识点按领域分组的映射
  const pointsByDomain = new Map<string, typeof points>();
  for (const point of points) {
    const list = pointsByDomain.get(point.domainId) || [];
    list.push(point);
    pointsByDomain.set(point.domainId, list);
  }
  
  const expandDomainCode = options?.domainCode;
  const collapsedDomains = new Set(options?.collapsedDomains || []);
  const nodes: GraphNode[] = [];

  if (!expandDomainCode) {
    const visibleDomains = domains.filter((domain) => !collapsedDomains.has(domain.id));
    visibleDomains.forEach((domain, index) => {
      const domainPoints = pointsByDomain.get(domain.id) || [];
      nodes.push({
        id: `domain-${domain.code}`,
        type: 'domain',
        position: gridPosition(index, 3, 340, 180),
        data: {
          code: domain.code,
          title: domain.title,
          pointCount: domainPoints.length,
          masteredCount: domainPoints.filter((point) => point.status === 'MASTERED').length,
        },
      });
    });
  } else {
    const domain = domains.find((item) => item.code === expandDomainCode);
    if (domain && !collapsedDomains.has(domain.id)) {
      const domainPoints = pointsByDomain.get(domain.id) || [];
      const rows = Math.max(1, Math.ceil(domainPoints.length / 3));
      nodes.push({
        id: `domain-${domain.code}`,
        type: 'domain',
        position: { x: 0, y: Math.max(0, ((rows - 1) * 170) / 2) },
        data: {
          code: domain.code,
          title: domain.title,
          pointCount: domainPoints.length,
          masteredCount: domainPoints.filter((point) => point.status === 'MASTERED').length,
        },
      });

      domainPoints.forEach((point, index) => {
        const domainInfo = domainMap.get(point.domainId);
        nodes.push({
          id: point.id,
          type: 'knowledge',
          position: gridPosition(index, 3, 260, 170, 330),
          data: {
            code: point.code,
            title: point.title,
            status: point.status,
            domainCode: domainInfo?.code,
            domainTitle: domainInfo?.title,
            difficulty: point.difficulty,
            selfMastered: !!point.selfMasteredAt,
            strictPassed: !!point.firstPassedAt,
          },
        });
      });
    }
  }

  const visibleIds = new Set(nodes.map((node) => node.id));
  const storedEdges = await db.select().from(knowledgeEdges);
  const graphEdges: GraphEdge[] = storedEdges
    .filter((edge) => visibleIds.has(edge.sourcePointId) && visibleIds.has(edge.targetPointId))
    .map((edge) => ({
      id: edge.id,
      source: edge.sourcePointId,
      target: edge.targetPointId,
      type: 'smoothstep',
      animated: edge.type === 'PREREQUISITE',
      data: { edgeType: edge.type, weight: edge.weight },
    }));

  if (!expandDomainCode) {
    for (const [source, target] of domainLearningPath) {
      const sourceId = `domain-${source}`;
      const targetId = `domain-${target}`;
      if (visibleIds.has(sourceId) && visibleIds.has(targetId)) {
        graphEdges.push({
          id: `domain-path-${source}-${target}`,
          source: sourceId,
          target: targetId,
          type: 'smoothstep',
          data: { edgeType: 'DOMAIN_PATH', weight: 1 },
        });
      }
    }
  } else {
    const domain = domains.find((item) => item.code === expandDomainCode);
    const domainPoints = domain ? pointsByDomain.get(domain.id) || [] : [];
    const domainNodeId = `domain-${expandDomainCode}`;
    for (const point of domainPoints) {
      if (visibleIds.has(point.id)) {
        graphEdges.push({
          id: `contains-${expandDomainCode}-${point.id}`,
          source: domainNodeId,
          target: point.id,
          type: 'smoothstep',
          data: { edgeType: 'CONTAINS', weight: 0.25 },
        });
      }
    }
    // 真实前置边存在时直接使用；仅为空库保留顺序降级，避免双重连线。
    if (!graphEdges.some((edge) => edge.data.edgeType === 'PREREQUISITE')) {
      for (let index = 0; index < domainPoints.length - 1; index++) {
        const source = domainPoints[index];
        const target = domainPoints[index + 1];
        if (source && target && visibleIds.has(source.id) && visibleIds.has(target.id)) {
          graphEdges.push({
            id: `learning-path-${source.id}-${target.id}`,
            source: source.id,
            target: target.id,
            type: 'smoothstep',
            data: { edgeType: 'LEARNING_PATH', weight: 0.75 },
          });
        }
      }
    }
  }
  
  return { nodes, edges: graphEdges };
}

/**
 * 获取知识点的关系
 */
export async function getKnowledgeRelations(pointId: string): Promise<{
  prerequisites: RelationPoint[];
  dependents: RelationPoint[];
  related: RelationPoint[];
  appliedWith: RelationPoint[];
}> {
  const selectRelations = (direction: 'incoming' | 'outgoing', type: string) => {
    const joinColumn = direction === 'incoming' ? 'source_point_id' : 'target_point_id';
    const filterColumn = direction === 'incoming' ? 'target_point_id' : 'source_point_id';
    return rawDb.prepare(`
      SELECT point.id, point.code, point.title, point.status,
             domain.code AS domainCode, domain.title AS domainTitle,
             edge.description, edge.weight
      FROM knowledge_edges edge
      JOIN knowledge_points point ON point.id = edge.${joinColumn}
      JOIN knowledge_domains domain ON domain.id = point.domain_id
      WHERE edge.${filterColumn} = ? AND edge.type = ?
      ORDER BY edge.weight DESC, point.code ASC
    `).all(pointId, type) as RelationPoint[];
  };
  return {
    prerequisites: selectRelations('incoming', 'PREREQUISITE'),
    dependents: selectRelations('outgoing', 'PREREQUISITE'),
    related: selectRelations('outgoing', 'RELATED'),
    appliedWith: selectRelations('outgoing', 'APPLIED_WITH'),
  };
}

interface RelationPoint {
  id: string;
  code: string;
  title: string;
  status: string;
  domainCode: string;
  domainTitle: string;
  description: string | null;
  weight: number;
}

export async function getKnowledgeTree() {
  const domains = await db.select().from(knowledgeDomains).orderBy(knowledgeDomains.orderIndex);
  const points = await db.select({
    id: knowledgePoints.id,
    code: knowledgePoints.code,
    title: knowledgePoints.title,
    domainId: knowledgePoints.domainId,
    status: knowledgePoints.status,
  }).from(knowledgePoints).orderBy(knowledgePoints.code);

  const groupDefinitions = [
    { id: 'foundation', title: 'Web 基础内核', description: '语言、类型、浏览器、网络与性能', domainCodes: ['01', '02', '07'] },
    { id: 'application', title: '框架与应用开发', description: 'React、Vue、中后台与复杂业务', domainCodes: ['03', '04', '05', '11'] },
    { id: 'engineering', title: '工程与平台能力', description: '质量、组件系统、平台化与交付', domainCodes: ['06', '08'] },
    { id: 'ai', title: 'AI 原生研发', description: '模型应用、Agent、MCP、本地推理与 AI 工程', domainCodes: ['09', '12', '13', '14', '15'] },
    { id: 'impact', title: '项目与职业影响力', description: '方案表达、项目证据与职业校准', domainCodes: ['10'] },
  ];

  return {
    title: 'AI 时代高级前端能力体系',
    totalPoints: points.length,
    groups: groupDefinitions.map((group) => ({
      id: group.id,
      title: group.title,
      description: group.description,
      domains: domains
        .filter((domain) => group.domainCodes.includes(domain.code))
        .map((domain) => ({
          id: domain.id,
          code: domain.code,
          title: domain.title,
          description: domain.description,
          points: points.filter((point) => point.domainId === domain.id),
        })),
    })),
  };
}

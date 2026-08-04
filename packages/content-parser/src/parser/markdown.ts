/**
 * Markdown 知识解析器
 */
import type { ParsedDomain, ParsedKnowledgePoint } from '../types/index.js';
import { estimateKnowledgeEffort, parseKnowledgeEffort } from '../effort.js';
import { DOMAIN_TAXONOMY, resolvePointTaxonomy } from '../taxonomy.js';

// 正则表达式
const DOMAIN_TITLE_REGEX = /^#\s+(\d{2})\s+(.+)$/m;
// 前缀允许包含数字，例如 H5-01；编号仍必须以大写字母开头。
const KNOWLEDGE_CODE_REGEX = /^##\s+([A-Z][A-Z0-9]*-[0-9]+)\s+(.+)$/;
const SECONDARY_TOPIC_REGEX = /^###\s+(.+)$/;

// 状态勾选
const SELF_MASTERED_REGEX = /^-\s+\[([ x])\]\s+自评已掌握/;
const STRICT_PASSED_REGEX = /^-\s+\[([ x])\]\s+已通过严格考核/;

// 字段标识
const STUDY_MATERIAL_REGEX = /^-\s+学习资料：(.+)$/;
const ASSESSMENT_SPEC_REGEX = /^-\s+严格考核：(.+)$/;
const PASS_CRITERIA_REGEX = /^-\s+通过标准：(.+)$/;
const EFFORT_REGEX = /^-\s+预计耗时：(.+)$/;

// 领域综合考核标识（停止解析）
const DOMAIN_COMPREHENSIVE_REGEX = /^##\s+领域综合考核/;

/**
 * 解析单个知识文件
 */
export function parseKnowledgeMarkdown(content: string, _filePath: string): ParsedDomain {
  const domainMatch = content.match(DOMAIN_TITLE_REGEX);
  const domainCode = domainMatch?.[1] ?? '00';
  const domainTitle = domainMatch?.[2] ?? '未知领域';
  
  const domainDescription = extractDomainDescription(content);
  const points = extractKnowledgePoints(content);
  
  return {
    code: domainCode,
    title: domainTitle,
    description: domainDescription,
    ...DOMAIN_TAXONOMY[domainCode]!,
    points,
  };
}

/**
 * 提取领域描述
 */
function extractDomainDescription(content: string): string | undefined {
  const lines = content.split(/\r?\n/);
  const descriptionLines: string[] = [];
  let foundTitle = false;
  
  for (const line of lines) {
    if (line.startsWith('# ') && !foundTitle) {
      foundTitle = true;
      continue;
    }
    
    if (foundTitle) {
      if (line.startsWith('## ')) break;
      if (line.trim()) {
        descriptionLines.push(line.trim());
      } else if (descriptionLines.length > 0) {
        break;
      }
    }
  }
  
  return descriptionLines.length > 0 ? descriptionLines.join(' ') : undefined;
}

/**
 * 提取知识点列表
 */
function extractKnowledgePoints(content: string): ParsedKnowledgePoint[] {
  const lines = content.split(/\r?\n/);
  const points: ParsedKnowledgePoint[] = [];
  
  let currentPoint: Partial<ParsedKnowledgePoint> | null = null;
  let currentField: 'studyMaterial' | 'assessmentSpec' | 'passCriteria' | null = null;
  let currentTopic = '';
  let currentTopicOrder = -1;
  let currentTopicHasPoint = false;
  const seenTopics = new Set<string>();
  let stopped = false;
  
  for (let i = 0; i < lines.length && !stopped; i++) {
    const line = lines[i] ?? '';
    
    // 领域综合考核，停止解析
    if (DOMAIN_COMPREHENSIVE_REGEX.test(line)) {
      if (currentPoint && currentPoint.code) {
        points.push(finalizePoint(currentPoint, extractDomainCode(content)));
      }
      if (currentTopic && !currentTopicHasPoint) {
        throw new Error(`二级主题“${currentTopic}”没有知识点`);
      }
      stopped = true;
      break;
    }
    
    // 二级主题是领域与知识点之间的真实层级，不只是展示用标题。
    const topicMatch = line.match(SECONDARY_TOPIC_REGEX);
    if (topicMatch) {
      if (currentPoint?.code) {
        points.push(finalizePoint(currentPoint, extractDomainCode(content)));
        currentPoint = null;
      }
      if (currentTopic && !currentTopicHasPoint) {
        throw new Error(`二级主题“${currentTopic}”没有知识点`);
      }
      const nextTopic = topicMatch[1]?.trim() ?? '';
      if (!nextTopic) throw new Error('二级主题标题不能为空');
      if (seenTopics.has(nextTopic)) throw new Error(`二级主题标题重复：${nextTopic}`);
      seenTopics.add(nextTopic);
      currentTopic = nextTopic;
      currentTopicOrder += 1;
      currentTopicHasPoint = false;
      currentField = null;
      continue;
    }

    // 新知识点
    const codeMatch = line.match(KNOWLEDGE_CODE_REGEX);
    if (codeMatch) {
      if (currentPoint && currentPoint.code) {
        points.push(finalizePoint(currentPoint, extractDomainCode(content)));
      }
      
      if (!currentTopic) {
        throw new Error(`知识点 ${codeMatch[1] ?? ''} 未归入任何二级主题（Markdown ###）`);
      }
      currentPoint = {
        code: codeMatch[1] ?? '',
        title: codeMatch[2] ?? '',
        secondaryTopic: currentTopic,
        topicOrder: currentTopicOrder,
      };
      currentTopicHasPoint = true;
      currentField = null;
      continue;
    }
    
    if (!currentPoint) continue;
    
    // 状态勾选
    const selfMatch = line.match(SELF_MASTERED_REGEX);
    if (selfMatch) {
      currentPoint.selfMastered = selfMatch[1] === 'x';
      currentField = null;
      continue;
    }
    
    const strictMatch = line.match(STRICT_PASSED_REGEX);
    if (strictMatch) {
      currentPoint.strictPassed = strictMatch[1] === 'x';
      currentField = null;
      continue;
    }
    
    // 字段开始
    const studyMatch = line.match(STUDY_MATERIAL_REGEX);
    if (studyMatch) {
      currentPoint.studyMaterial = studyMatch[1] ?? '';
      currentField = 'studyMaterial';
      continue;
    }
    
    const assessmentMatch = line.match(ASSESSMENT_SPEC_REGEX);
    if (assessmentMatch) {
      currentPoint.assessmentSpec = assessmentMatch[1] ?? '';
      currentField = 'assessmentSpec';
      continue;
    }
    
    const passMatch = line.match(PASS_CRITERIA_REGEX);
    if (passMatch) {
      currentPoint.passCriteria = passMatch[1] ?? '';
      currentField = 'passCriteria';
      continue;
    }

    const effortMatch = line.match(EFFORT_REGEX);
    if (effortMatch) {
      const effort = parseKnowledgeEffort(effortMatch[1] ?? '');
      if (effort) Object.assign(currentPoint, effort);
      currentField = null;
      continue;
    }
    
    // 多行内容追加
    if (currentField && line.trim()) {
      const fieldMap = {
        studyMaterial: 'studyMaterial',
        assessmentSpec: 'assessmentSpec',
        passCriteria: 'passCriteria',
      } as const;
      
      const field = fieldMap[currentField];
      if (field && currentPoint[field]) {
        currentPoint[field] = currentPoint[field] + '\n' + line.trim();
      }
    } else if (currentField && !line.trim()) {
      currentField = null;
    }
  }
  
  // 最后一个知识点
  if (!stopped && currentPoint && currentPoint.code) {
    points.push(finalizePoint(currentPoint, extractDomainCode(content)));
  }
  if (!stopped && currentTopic && !currentTopicHasPoint) {
    throw new Error(`二级主题“${currentTopic}”没有知识点`);
  }
  
  return points;
}

/**
 * 完成知识点对象
 */
function finalizePoint(point: Partial<ParsedKnowledgePoint>, domainCode: string): ParsedKnowledgePoint {
  const effort = point.studyMinutes && point.practiceMinutes && point.projectMinutes
    && point.assessmentMinutes && point.retestMinutes && point.estimatedTotalMinutes
    ? {
        studyMinutes: point.studyMinutes,
        practiceMinutes: point.practiceMinutes,
        projectMinutes: point.projectMinutes,
        assessmentMinutes: point.assessmentMinutes,
        retestMinutes: point.retestMinutes,
        estimatedTotalMinutes: point.estimatedTotalMinutes,
      }
    : estimateKnowledgeEffort(point.code || '');
  return {
    code: point.code || '',
    title: point.title || '',
    secondaryTopic: point.secondaryTopic || '',
    topicOrder: point.topicOrder ?? 0,
    difficulty: 'intermediate',
    ...resolvePointTaxonomy(point.code || '', domainCode),
    studyMaterial: point.studyMaterial || '',
    assessmentSpec: point.assessmentSpec || '',
    passCriteria: point.passCriteria || '',
    ...effort,
    selfMastered: point.selfMastered || false,
    strictPassed: point.strictPassed || false,
  };
}

function extractDomainCode(content: string): string {
  return content.match(DOMAIN_TITLE_REGEX)?.[1] ?? '00';
}

/**
 * 批量解析所有知识文件
 */
export function parseAllKnowledgeFiles(files: Map<string, string>): ParsedDomain[] {
  const domains: ParsedDomain[] = [];
  
  for (const [path, content] of files) {
    const domain = parseKnowledgeMarkdown(content, path);
    domains.push(domain);
  }
  
  domains.sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10));
  
  return domains;
}

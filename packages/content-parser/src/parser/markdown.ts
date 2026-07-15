/**
 * Markdown 知识解析器
 */
import type { ParsedDomain, ParsedKnowledgePoint } from '../types/index.js';
import { estimateKnowledgeEffort, parseKnowledgeEffort } from '../effort.js';

// 正则表达式
const DOMAIN_TITLE_REGEX = /^#\s+(\d{2})\s+(.+)$/m;
// 前缀允许包含数字，例如 H5-01；编号仍必须以大写字母开头。
const KNOWLEDGE_CODE_REGEX = /^##\s+([A-Z][A-Z0-9]*-[0-9]+)\s+(.+)$/;

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
    points,
  };
}

/**
 * 提取领域描述
 */
function extractDomainDescription(content: string): string | undefined {
  const lines = content.split('\n');
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
  const lines = content.split('\n');
  const points: ParsedKnowledgePoint[] = [];
  
  let currentPoint: Partial<ParsedKnowledgePoint> | null = null;
  let currentField: 'studyMaterial' | 'assessmentSpec' | 'passCriteria' | null = null;
  let stopped = false;
  
  for (let i = 0; i < lines.length && !stopped; i++) {
    const line = lines[i] ?? '';
    
    // 领域综合考核，停止解析
    if (DOMAIN_COMPREHENSIVE_REGEX.test(line)) {
      if (currentPoint && currentPoint.code) {
        points.push(finalizePoint(currentPoint));
      }
      stopped = true;
      break;
    }
    
    // 新知识点
    const codeMatch = line.match(KNOWLEDGE_CODE_REGEX);
    if (codeMatch) {
      if (currentPoint && currentPoint.code) {
        points.push(finalizePoint(currentPoint));
      }
      
      currentPoint = {
        code: codeMatch[1] ?? '',
        title: codeMatch[2] ?? '',
      };
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
    points.push(finalizePoint(currentPoint));
  }
  
  return points;
}

/**
 * 完成知识点对象
 */
function finalizePoint(point: Partial<ParsedKnowledgePoint>): ParsedKnowledgePoint {
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
    difficulty: 'intermediate',
    studyMaterial: point.studyMaterial || '',
    assessmentSpec: point.assessmentSpec || '',
    passCriteria: point.passCriteria || '',
    ...effort,
    selfMastered: point.selfMastered || false,
    strictPassed: point.strictPassed || false,
  };
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

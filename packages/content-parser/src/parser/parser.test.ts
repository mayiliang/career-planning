/**
 * 解析器测试
 */
import { describe, it, expect } from 'vitest';
import { parseKnowledgeMarkdown } from './markdown.js';

describe('Markdown Parser', () => {
  it('应该能解析知识点', () => {
    const content = `# 01 JavaScript、HTML/CSS、浏览器、网络与安全

所有"通过"均需满足统一考核规则。

### JavaScript 语言模型

## JS-01 执行上下文、作用域与闭包

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 闭包](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Closures)。
- 严格考核：闭卷画出 3 段嵌套函数的作用域链。
- 通过标准：输出全对。

### Web 标准与可访问性

## WEB-01 HTML 语义、表单与可访问性基础

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN HTML](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content)。
- 严格考核：把一段全是 div 的表单改成语义结构。
- 通过标准：表单标签正确。

## 领域综合考核

任务：独立实现一个无框架的可访问数据看板。
`;

    const result = parseKnowledgeMarkdown(content, 'docs/knowledge/knowledge-base/01-javascript-browser.md');
    
    expect(result.code).toBe('01');
    expect(result.title).toBe('JavaScript、HTML/CSS、浏览器、网络与安全');
    expect(result.points).toHaveLength(2);
    
    expect(result.points[0].code).toBe('JS-01');
    expect(result.points[0].title).toBe('执行上下文、作用域与闭包');
    expect(result.points[0].secondaryTopic).toBe('JavaScript 语言模型');
    expect(result.points[0].studyMaterial).toContain('MDN 闭包');
    
    expect(result.points[1].code).toBe('WEB-01');
    expect(result.points[1].title).toBe('HTML 语义、表单与可访问性基础');
  });
  
  it('应该能解析领域描述', () => {
    const content = `# 01 测试领域

这是领域描述。

### 示例主题

## JS-01 测试知识点

- 学习资料：测试资料。
- 严格考核：测试考核。
- 通过标准：测试标准。`;

    const result = parseKnowledgeMarkdown(content, 'docs/knowledge/knowledge-base/01-test.md');
    
    expect(result.description).toBe('这是领域描述。');
  });

  it('应该解析包含数字的知识点前缀', () => {
    const content = `# 07 Web 性能、H5 与 Hybrid

### 移动 Web

## H5-01 viewport 与响应式

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：MDN。
- 严格考核：完成移动端页面。
- 通过标准：通过所有检查。`;

    const result = parseKnowledgeMarkdown(content, '07-performance-h5.md');

    expect(result.points).toHaveLength(1);
    expect(result.points[0]?.code).toBe('H5-01');
  });

  it('应该拒绝未归类、空主题和重复二级主题', () => {
    expect(() => parseKnowledgeMarkdown('# 01 示例\n\n## JS-01 未归类', 'ungrouped.md'))
      .toThrow('未归入任何二级主题');
    expect(() => parseKnowledgeMarkdown('# 01 示例\n\n### 空主题\n\n## 领域综合考核', 'empty-topic.md'))
      .toThrow('没有知识点');
    expect(() => parseKnowledgeMarkdown('# 01 示例\n\n### 重复\n\n## JS-01 一\n\n### 重复\n\n## JS-02 二', 'duplicate-topic.md'))
      .toThrow('二级主题标题重复');
  });
});

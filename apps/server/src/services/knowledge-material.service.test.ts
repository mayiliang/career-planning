import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { projectRoot } from '../config/index.js';
import {
  getKnowledgeMaterial,
  KnowledgeMaterialError,
  validateKnowledgeMaterialPath,
} from './knowledge-material.service.js';

describe('站内中文学习资料', () => {
  it('按知识点锚点只返回对应讲义章节', async () => {
    const material = await getKnowledgeMaterial('js-07-iteration-metaprogramming-resources.md', 'js-07');
    expect(material.title).toMatch(/JS-07/i);
    expect(material.markdown).toContain('JS-07');
    expect(material.markdown).not.toContain('## JS-03');
  });

  it('B01 四份主讲义独立成篇，并在正文头部按需列出前置资料', async () => {
    const guides = [
      ['js-01-execution-context-scope-closure.md', 'js-01'],
      ['js-02-prototype-object-model-this.md', 'js-02'],
      ['js-03-types-equality-copy-immutability.md', 'js-03'],
      ['js-07-iteration-metaprogramming-resources.md', 'js-07'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(4_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐/);
    }
  });

  it('B02 四份主讲义独立成篇，并围绕知识本身而不是固定题目组织', async () => {
    const guides = [
      ['cs-01-complexity-scale-engineering-cost.md', 'cs-01'],
      ['cs-02-data-structures-algorithms-correctness.md', 'cs-02'],
      ['cs-03-large-data-workers-incremental-memory.md', 'cs-03'],
      ['js-04-async-promise-browser-event-loop.md', 'js-04'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(4_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
    }
  });

  it('B01、B02 主讲义与原子前置短文的站内链接可以逐一打开', async () => {
    const guideFiles = [
      'js-01-execution-context-scope-closure.md',
      'js-02-prototype-object-model-this.md',
      'js-03-types-equality-copy-immutability.md',
      'js-07-iteration-metaprogramming-resources.md',
      'javascript-variables-and-bindings.md',
      'javascript-functions-and-callbacks.md',
      'javascript-objects-properties-methods.md',
      'javascript-scheduled-callbacks.md',
      'javascript-strict-mode.md',
      'javascript-exceptions-and-finally.md',
      'javascript-promises-and-cancellation.md',
      'javascript-property-descriptors.md',
      'cs-01-complexity-scale-engineering-cost.md',
      'cs-02-data-structures-algorithms-correctness.md',
      'cs-03-large-data-workers-incremental-memory.md',
      'js-04-async-promise-browser-event-loop.md',
      'algorithm-input-size-and-growth.md',
      'javascript-collections-keys-membership.md',
      'browser-main-thread-messages-memory.md',
    ];
    const references = new Set<string>();

    for (const guideFile of guideFiles) {
      const markdown = await readFile(resolve(projectRoot, 'docs', 'knowledge', 'chinese-guides', guideFile), 'utf8');
      for (const match of markdown.matchAll(/\.\.\/chinese-guides\/([a-z0-9][a-z0-9.-]*\.md)#([\p{L}\p{N}_-]+)/giu)) {
        references.add(`${match[1]}#${match[2]}`);
      }
    }

    expect(references.size).toBeGreaterThan(10);
    for (const reference of references) {
      const [guide, anchor] = reference.split('#');
      await expect(getKnowledgeMaterial(guide ?? '', anchor ?? ''), reference).resolves.toMatchObject({
        guide,
        anchor: anchor?.toLocaleLowerCase('en-US'),
      });
    }
  });

  it('不会把下一知识点的独立 HTML 锚点带进当前讲义', async () => {
    const material = await getKnowledgeMaterial('content-audit-18-20.md', 'graphics-01');
    expect(material.markdown).toContain('坐标、DPR 与命中链');
    expect(material.markdown).not.toContain('graphics-02');
  });

  it('拒绝目录穿越和不存在的章节', async () => {
    expect(() => validateKnowledgeMaterialPath('../README.md', 'js-07')).toThrow(KnowledgeMaterialError);
    await expect(getKnowledgeMaterial('core-and-ecosystem-topics.md', 'missing-99'))
      .rejects.toMatchObject({ code: 'MATERIAL_NOT_FOUND' });
  });

  it('可按独立锚点读取初学者前置知识与中英术语讲义', async () => {
    const material = await getKnowledgeMaterial('beginner-prerequisites-and-glossary.md', 'primer-00');
    expect(material.title).toContain('初学者前置知识与术语讲义');
    expect(material.markdown).toContain('运行时（Runtime）');
    expect(material.markdown).toContain('模型上下文协议（Model Context Protocol, MCP）');
    expect(material.markdown).toContain('不单独作为掌握挑战题源');
  });

  it('知识库列出的每一个站内讲义链接都能由系统读取', async () => {
    const knowledgeBase = resolve(projectRoot, 'docs', 'knowledge', 'knowledge-base');
    const files = (await readdir(knowledgeBase)).filter((file) => /^\d{2}-.+\.md$/.test(file));
    const references = new Set<string>();
    for (const file of files) {
      const markdown = await readFile(resolve(knowledgeBase, file), 'utf8');
      for (const match of markdown.matchAll(/\.\.\/chinese-guides\/([a-z0-9][a-z0-9.-]*\.md)#([\p{L}\p{N}_-]+)/giu)) {
        references.add(`${match[1]}#${match[2]}`);
      }
    }

    expect(references.size).toBeGreaterThan(0);
    for (const reference of references) {
      const [guide, anchor] = reference.split('#');
      await expect(getKnowledgeMaterial(guide ?? '', anchor ?? ''), reference).resolves.toMatchObject({
        guide,
        anchor: anchor?.toLocaleLowerCase('en-US'),
      });
    }
  });
});

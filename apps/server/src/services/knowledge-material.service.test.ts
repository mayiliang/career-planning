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
    const material = await getKnowledgeMaterial('core-and-ecosystem-topics.md', 'js-07');
    expect(material.title).toMatch(/JS-07/i);
    expect(material.markdown).toContain('JS-07');
    expect(material.markdown).not.toContain('## CS-01');
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

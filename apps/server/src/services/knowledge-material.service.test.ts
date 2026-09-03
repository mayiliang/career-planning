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
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
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
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
    }
  });

  it('B03 四份主讲义独立成篇，并从机制逐层推进到工程边界', async () => {
    const guides = [
      ['js-05-promise-errors-async-control-flow.md', 'js-05'],
      ['js-06-es-modules-module-boundaries.md', 'js-06'],
      ['ts-01-type-system-structural-strict-mode.md', 'ts-01'],
      ['ts-02-unions-narrowing-never-exhaustiveness.md', 'ts-02'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
    }
  });

  it('B04～B08 二十二份主讲义逐份达到完整教学深度，并保持独立前置入口', async () => {
    const guides = [
      ['ts-03-generics-constraints-keyof-indexed-access.md', 'ts-03'],
      ['web-01-html-semantics-forms-accessibility.md', 'web-01'],
      ['react-01-render-purity-state-snapshot.md', 'react-01'],
      ['vue-01-vite-sfc-project-structure.md', 'vue-01'],
      ['vue-02-ref-reactive-computed-boundaries.md', 'vue-02'],
      ['react-02-component-boundaries-data-flow-composition.md', 'react-02'],
      ['vue-03-template-directives-events-forms.md', 'vue-03'],
      ['vue-04-typed-components-slots-model-teleport.md', 'vue-04'],
      ['react-03-state-model-derived-controlled.md', 'react-03'],
      ['react-04-effects-external-sync-cleanup.md', 'react-04'],
      ['vue-05-lifecycle-effects-async-recovery.md', 'vue-05'],
      ['react-05-hooks-rules-custom-hooks.md', 'react-05'],
      ['vue-06-composables-injection-reuse.md', 'vue-06'],
      ['react-06-reducer-context-state-domains.md', 'react-06'],
      ['vue-08-pinia-state-layers.md', 'vue-08'],
      ['react-08-error-boundaries-suspense-recovery.md', 'react-08'],
      ['react-10-router-data-framework-modes.md', 'react-10'],
      ['vue-07-router-navigation-boundaries.md', 'vue-07'],
      ['react-07-performance-memo-large-lists.md', 'react-07'],
      ['vue-10-testing-performance-production-build.md', 'vue-10'],
      ['react-09-compiler-rsc-security-upgrades.md', 'react-09'],
      ['vue-11-nuxt-rendering-data-performance.md', 'vue-11'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(material.title, `${guide} 标题没有对应知识点`).toMatch(new RegExp(anchor, 'i'));
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
      expect(material.markdown, `${guide} 缺少失败或边界说明`).toMatch(/边界|失败|风险|反例|不能|不可/);
      expect(material.markdown, `${guide} 缺少验证方法`).toMatch(/验证|测试|证据|检查|断言|核验/);
    }
  });

  it('B09～B12 十七份主讲义逐份达到完整教学深度，并保持独立前置入口', async () => {
    const guides = [
      ['git-01-object-index-references-recovery.md', 'git-01'],
      ['git-02-branches-merge-rebase-conflicts.md', 'git-02'],
      ['git-03-commits-remotes-pr-worktrees-collaboration.md', 'git-03'],
      ['debug-01-systematic-debugging-evidence-causality.md', 'debug-01'],
      ['eng-01-module-graph-build-output-source-maps.md', 'eng-01'],
      ['eng-02-dev-production-environments-assets-cache.md', 'eng-02'],
      ['eng-03-dependencies-lockfile-workspaces-peer.md', 'eng-03'],
      ['eng-05-quality-gates-lint-types-tests-ci.md', 'eng-05'],
      ['test-01-test-design-oracles-properties-mutation.md', 'test-01'],
      ['test-02-component-testing-user-behavior-accessibility.md', 'test-02'],
      ['test-03-e2e-visual-regression-isolation-flakiness.md', 'test-03'],
      ['career-01-project-evidence-causal-storytelling.md', 'career-01'],
      ['career-02-architecture-diagrams-boundaries-adrs.md', 'career-02'],
      ['career-04-incident-response-postmortem-learning.md', 'career-04'],
      ['career-05-code-review-risk-communication.md', 'career-05'],
      ['web-02-layout-cascade-responsive-logical-properties.md', 'web-02'],
      ['web-03-modern-css-architecture-container-progressive.md', 'web-03'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(material.title, `${guide} 标题没有对应知识点`).toMatch(new RegExp(anchor, 'i'));
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
      expect(material.markdown, `${guide} 缺少失败或边界说明`).toMatch(/边界|失败|风险|反例|不能|不可/);
      expect(material.markdown, `${guide} 缺少验证方法`).toMatch(/验证|测试|证据|检查|断言|核验/);
    }
  });

  it('B13～B16 十七份主讲义逐份达到完整教学深度，并保持独立前置入口', async () => {
    const guides = [
      ['a11y-01-wcag-testing-governance.md', 'a11y-01'],
      ['browser-01-render-events-storage.md', 'browser-01'],
      ['browser-02-observers-scheduling-lifecycle-coordination.md', 'browser-02'],
      ['web-04-native-layered-ui-view-transitions.md', 'web-04'],
      ['web-05-web-components-shadow-dom-interoperability.md', 'web-05'],
      ['net-01-browser-network-fetch-reliability.md', 'net-01'],
      ['sec-01-xss-csrf-trust-boundaries.md', 'sec-01'],
      ['sec-02-csp-trusted-types-reporting.md', 'sec-02'],
      ['sec-04-cross-origin-isolation-embedding-permissions.md', 'sec-04'],
      ['sec-03-webauthn-passkeys-authentication.md', 'sec-03'],
      ['sec-05-web-crypto-key-lifecycle.md', 'sec-05'],
      ['ts-04-mapped-utility-template-literal-types.md', 'ts-04'],
      ['ts-05-conditional-infer-distribution.md', 'ts-05'],
      ['ts-06-functions-overloads-variance-component-apis.md', 'ts-06'],
      ['ts-07-runtime-contracts-validation-error-models.md', 'ts-07'],
      ['ts-08-domain-state-permission-modeling.md', 'ts-08'],
      ['ts-09-version-migration-module-governance.md', 'ts-09'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(material.title, `${guide} 标题没有对应知识点`).toMatch(new RegExp(anchor, 'i'));
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
      expect(material.markdown, `${guide} 缺少失败或边界说明`).toMatch(/边界|失败|风险|反例|不能|不可/);
      expect(material.markdown, `${guide} 缺少验证方法`).toMatch(/验证|测试|证据|检查|断言|核验/);
    }
  });

  it('B17 四份主讲义逐份达到完整教学深度，并保持独立前置入口', async () => {
    const guides = [
      ['identity-01-session-cookie-token-browser-boundaries.md', 'identity-01'],
      ['identity-02-oauth-oidc-pkce-security.md', 'identity-02'],
      ['privacy-01-data-minimization-consent-retention-rights.md', 'privacy-01'],
      ['privacy-02-cross-region-classification-engineering-controls.md', 'privacy-02'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(material.title, `${guide} 标题没有对应知识点`).toMatch(new RegExp(anchor, 'i'));
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
      expect(material.markdown, `${guide} 缺少失败或边界说明`).toMatch(/边界|失败|风险|反例|不能|不可/);
      expect(material.markdown, `${guide} 缺少验证方法`).toMatch(/验证|测试|证据|检查|断言|核验/);
    }
  });

  it('B18～B19 八份主讲义逐份达到完整教学深度，并保持递归直接前置', async () => {
    const guides = [
      ['node-01-runtime-event-loop-nonblocking-io.md', 'node-01'],
      ['node-02-files-streams-buffers-errors.md', 'node-02'],
      ['node-04-http-bff-production-engineering.md', 'node-04'],
      ['aidev-01-specification-controlled-agent-loop.md', 'aidev-01'],
      ['aidev-02-context-engineering-repository-instructions.md', 'aidev-02'],
      ['aidev-03-ai-generated-code-verification.md', 'aidev-03'],
      ['biz-01-domain-objects-relations-ubiquitous-language.md', 'biz-01'],
      ['biz-02-state-machines-business-invariants.md', 'biz-02'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(material.title, `${guide} 标题没有对应知识点`).toMatch(new RegExp(anchor, 'i'));
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
      expect(material.markdown, `${guide} 缺少失败或边界说明`).toMatch(/边界|失败|风险|反例|不能|不可/);
      expect(material.markdown, `${guide} 缺少验证方法`).toMatch(/验证|测试|证据|检查|断言|核验/);
    }
  });

  it('B20～B24 二十二份主讲义逐份达到完整教学深度，并保持递归直接前置', async () => {
    const guides = [
      ['biz-03-rbac-abac-data-permissions.md', 'biz-03'],
      ['biz-04-api-contract-dto-frontend-model.md', 'biz-04'],
      ['biz-05-form-table-detail-state-consistency.md', 'biz-05'],
      ['biz-06-async-jobs-import-export-progress.md', 'biz-06'],
      ['biz-07-errors-idempotency-eventual-consistency.md', 'biz-07'],
      ['biz-08-requirement-acceptance-traceability.md', 'biz-08'],
      ['test-04-api-contract-consumer-driven-testing.md', 'test-04'],
      ['render-01-spa-ssr-ssg-isr-hybrid-decisions.md', 'render-01'],
      ['render-02-streaming-ssr-hydration-islands.md', 'render-02'],
      ['data-01-server-state-cache-keys-invalidation-deduplication.md', 'data-01'],
      ['data-02-optimistic-updates-conflicts-offline-mutations.md', 'data-02'],
      ['realtime-01-sse-websocket-webtransport-reliability.md', 'realtime-01'],
      ['comp-01-component-responsibility-api-composition.md', 'comp-01'],
      ['comp-02-controlled-uncontrolled-state-imperative.md', 'comp-02'],
      ['ux-01-interaction-states-usability-validation.md', 'ux-01'],
      ['eng-08-software-supply-chain-sbom-provenance.md', 'eng-08'],
      ['linux-01-filesystem-permissions-safe-commands.md', 'linux-01'],
      ['linux-02-process-port-log-network-diagnostics.md', 'linux-02'],
      ['linux-03-shell-environment-automation.md', 'linux-03'],
      ['linux-04-server-security-ssh-users-firewall.md', 'linux-04'],
      ['docker-01-images-containers-dockerfile-cache.md', 'docker-01'],
      ['docker-02-compose-network-volumes-environments.md', 'docker-02'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(material.title, `${guide} 标题没有对应知识点`).toMatch(new RegExp(anchor, 'i'));
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
      expect(material.markdown, `${guide} 缺少失败或边界说明`).toMatch(/边界|失败|风险|反例|不能|不可/);
      expect(material.markdown, `${guide} 缺少验证方法`).toMatch(/验证|测试|证据|检查|断言|核验/);
    }
  });

  it('B25～B27 十二份主讲义逐份达到完整教学深度，并保持递归直接前置', async () => {
    const guides = [
      ['eng-06-ci-cd-artifact-promotion-release-rollback.md', 'eng-06'],
      ['deploy-01-nginx-static-assets-reverse-proxy-https-cdn.md', 'deploy-01'],
      ['obs-01-frontend-observability-slo-alerting-privacy.md', 'obs-01'],
      ['perf-01-core-web-vitals-performance-budgets.md', 'perf-01'],
      ['perf-02-network-resource-loading-cache-optimization.md', 'perf-02'],
      ['perf-03-main-thread-rendering-long-tasks-inp.md', 'perf-03'],
      ['perf-04-memory-listeners-resource-leaks.md', 'perf-04'],
      ['h5-01-viewport-responsive-safe-area-orientation.md', 'h5-01'],
      ['h5-02-scroll-soft-keyboard-pointer-gestures.md', 'h5-02'],
      ['mcp-01-server-tools-resources-prompts-schema.md', 'mcp-01'],
      ['aiprod-01-ai-task-model-selection-value-validation.md', 'aiprod-01'],
      ['aiprod-02-high-risk-automation-human-in-the-loop.md', 'aiprod-02'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(material.title, `${guide} 标题没有对应知识点`).toMatch(new RegExp(anchor, 'i'));
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
      expect(material.markdown, `${guide} 缺少失败或边界说明`).toMatch(/边界|失败|风险|反例|不能|不可/);
      expect(material.markdown, `${guide} 缺少验证方法`).toMatch(/验证|测试|证据|检查|断言|核验/);
    }
  });

  it('B28 五份主讲义逐份达到完整教学深度，并保持递归直接前置', async () => {
    const guides = [
      ['aisafe-01-output-validation-content-safety-guardrails.md', 'aisafe-01'],
      ['aisafe-02-threat-modeling-red-teaming-abuse-defense.md', 'aisafe-02'],
      ['aigov-01-data-model-change-audit-accountability.md', 'aigov-01'],
      ['aiapp-01-model-interface-instructions-context-boundaries.md', 'aiapp-01'],
      ['aiapp-02-streaming-sse-incremental-rendering.md', 'aiapp-02'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(material.title, `${guide} 标题没有对应知识点`).toMatch(new RegExp(anchor, 'i'));
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
      expect(material.markdown, `${guide} 缺少失败或边界说明`).toMatch(/边界|失败|风险|反例|不能|不可/);
      expect(material.markdown, `${guide} 缺少验证方法`).toMatch(/验证|测试|证据|检查|断言|核验/);
    }
  });

  it('B29～B32 十七份主讲义逐份达到完整教学深度，并保持递归直接前置', async () => {
    const guides = [
      ['aiapp-03-structured-output-schema-validation.md', 'aiapp-03'],
      ['aiapp-04-tool-calling-execution-result-ui.md', 'aiapp-04'],
      ['aiapp-05-generative-ui-view-model-host-safety.md', 'aiapp-05'],
      ['aiui-01-agent-ui-protocol-interoperability.md', 'aiui-01'],
      ['aiapp-06-rag-citations-source-trust.md', 'aiapp-06'],
      ['aiapp-07-prompt-injection-untrusted-content.md', 'aiapp-07'],
      ['aiapp-08-evaluation-observability-release-gates.md', 'aiapp-08'],
      ['aiapp-09-cost-quota-cache-reliability.md', 'aiapp-09'],
      ['aiapp-10-ai-interaction-trust-recovery.md', 'aiapp-10'],
      ['aiapp-12-conversation-state-context-compression-privacy.md', 'aiapp-12'],
      ['aiapp-13-long-term-memory-personalization-forgetting.md', 'aiapp-13'],
      ['agent-01-loop-planning-stopping-recovery.md', 'agent-01'],
      ['agent-03-mcp-transport-stateless-state-versioning.md', 'agent-03'],
      ['agent-04-mcp-client-discovery-compatibility.md', 'agent-04'],
      ['agent-05-human-in-the-loop-risk-approval.md', 'agent-05'],
      ['agent-06-tasks-long-running-recovery-idempotency.md', 'agent-06'],
      ['agent-07-multi-agent-coordination-context-isolation.md', 'agent-07'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(material.title, `${guide} 标题没有对应知识点`).toMatch(new RegExp(anchor, 'i'));
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
      expect(material.markdown, `${guide} 缺少失败或边界说明`).toMatch(/边界|失败|风险|反例|不能|不可/);
      expect(material.markdown, `${guide} 缺少验证方法`).toMatch(/验证|测试|证据|检查|断言|核验/);
    }
  });

  it('B33～B35 十三份主讲义逐份达到完整教学深度，并保持递归直接前置', async () => {
    const guides = [
      ['agent-08-tool-contract-schema-discoverability.md', 'agent-08'],
      ['agent-09-observability-read-only-replay.md', 'agent-09'],
      ['agent-10-identity-authorization-runtime-isolation.md', 'agent-10'],
      ['aidev-04-ai-code-review-risk-evidence.md', 'aidev-04'],
      ['aidev-07-dependency-source-security.md', 'aidev-07'],
      ['aidev-10-ai-tool-data-team-governance.md', 'aidev-10'],
      ['compat-01-baseline-progressive-enhancement-device-testing.md', 'compat-01'],
      ['arch-01-quality-attributes-constraints-tradeoffs.md', 'arch-01'],
      ['arch-02-technical-proposal-adr-review.md', 'arch-02'],
      ['arch-03-progressive-migration-strangler-compatibility.md', 'arch-03'],
      ['arch-04-technical-debt-prioritization-governance.md', 'arch-04'],
      ['arch-05-framework-selection-lifecycle-migration.md', 'arch-05'],
      ['lead-01-technical-roadmap-delegation-influence.md', 'lead-01'],
    ] as const;

    for (const [guide, anchor] of guides) {
      const material = await getKnowledgeMaterial(guide, anchor);
      const prerequisiteIndex = material.markdown.indexOf('### 学习前先确认');
      expect(material.title, `${guide} 标题没有对应知识点`).toMatch(new RegExp(anchor, 'i'));
      expect(prerequisiteIndex, `${guide} 缺少讲义头部的前置入口`).toBeGreaterThan(0);
      expect(prerequisiteIndex, `${guide} 的前置入口离讲义头部过远`).toBeLessThan(900);
      expect(material.markdown.replace(/\s/g, '').length, `${guide} 仍像压缩提纲`).toBeGreaterThan(5_000);
      expect(material.markdown, `${guide} 不应按站内题目组织`).not.toMatch(/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/);
      expect(material.markdown, `${guide} 缺少失败或边界说明`).toMatch(/边界|失败|风险|反例|不能|不可/);
      expect(material.markdown, `${guide} 缺少验证方法`).toMatch(/验证|测试|证据|检查|断言|核验/);
    }
  });

  it('B01～B35 主讲义与原子前置短文的站内链接可以逐一打开', async () => {
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
      'js-05-promise-errors-async-control-flow.md',
      'js-06-es-modules-module-boundaries.md',
      'ts-01-type-system-structural-strict-mode.md',
      'ts-02-unions-narrowing-never-exhaustiveness.md',
      'ts-03-generics-constraints-keyof-indexed-access.md',
      'web-01-html-semantics-forms-accessibility.md',
      'react-01-render-purity-state-snapshot.md',
      'vue-01-vite-sfc-project-structure.md',
      'vue-02-ref-reactive-computed-boundaries.md',
      'react-02-component-boundaries-data-flow-composition.md',
      'vue-03-template-directives-events-forms.md',
      'vue-04-typed-components-slots-model-teleport.md',
      'react-03-state-model-derived-controlled.md',
      'react-04-effects-external-sync-cleanup.md',
      'vue-05-lifecycle-effects-async-recovery.md',
      'react-05-hooks-rules-custom-hooks.md',
      'vue-06-composables-injection-reuse.md',
      'react-06-reducer-context-state-domains.md',
      'vue-08-pinia-state-layers.md',
      'react-08-error-boundaries-suspense-recovery.md',
      'react-10-router-data-framework-modes.md',
      'vue-07-router-navigation-boundaries.md',
      'react-07-performance-memo-large-lists.md',
      'vue-10-testing-performance-production-build.md',
      'react-09-compiler-rsc-security-upgrades.md',
      'vue-11-nuxt-rendering-data-performance.md',
      'git-01-object-index-references-recovery.md',
      'git-02-branches-merge-rebase-conflicts.md',
      'git-03-commits-remotes-pr-worktrees-collaboration.md',
      'debug-01-systematic-debugging-evidence-causality.md',
      'eng-01-module-graph-build-output-source-maps.md',
      'eng-02-dev-production-environments-assets-cache.md',
      'eng-03-dependencies-lockfile-workspaces-peer.md',
      'eng-05-quality-gates-lint-types-tests-ci.md',
      'test-01-test-design-oracles-properties-mutation.md',
      'test-02-component-testing-user-behavior-accessibility.md',
      'test-03-e2e-visual-regression-isolation-flakiness.md',
      'career-01-project-evidence-causal-storytelling.md',
      'career-02-architecture-diagrams-boundaries-adrs.md',
      'career-04-incident-response-postmortem-learning.md',
      'career-05-code-review-risk-communication.md',
      'web-02-layout-cascade-responsive-logical-properties.md',
      'web-03-modern-css-architecture-container-progressive.md',
      'a11y-01-wcag-testing-governance.md',
      'browser-01-render-events-storage.md',
      'browser-02-observers-scheduling-lifecycle-coordination.md',
      'web-04-native-layered-ui-view-transitions.md',
      'web-05-web-components-shadow-dom-interoperability.md',
      'net-01-browser-network-fetch-reliability.md',
      'sec-01-xss-csrf-trust-boundaries.md',
      'sec-02-csp-trusted-types-reporting.md',
      'sec-04-cross-origin-isolation-embedding-permissions.md',
      'sec-03-webauthn-passkeys-authentication.md',
      'sec-05-web-crypto-key-lifecycle.md',
      'ts-04-mapped-utility-template-literal-types.md',
      'ts-05-conditional-infer-distribution.md',
      'ts-06-functions-overloads-variance-component-apis.md',
      'ts-07-runtime-contracts-validation-error-models.md',
      'ts-08-domain-state-permission-modeling.md',
      'ts-09-version-migration-module-governance.md',
      'identity-01-session-cookie-token-browser-boundaries.md',
      'identity-02-oauth-oidc-pkce-security.md',
      'privacy-01-data-minimization-consent-retention-rights.md',
      'privacy-02-cross-region-classification-engineering-controls.md',
      'node-01-runtime-event-loop-nonblocking-io.md',
      'node-02-files-streams-buffers-errors.md',
      'node-04-http-bff-production-engineering.md',
      'aidev-01-specification-controlled-agent-loop.md',
      'aidev-02-context-engineering-repository-instructions.md',
      'aidev-03-ai-generated-code-verification.md',
      'biz-01-domain-objects-relations-ubiquitous-language.md',
      'biz-02-state-machines-business-invariants.md',
      'biz-03-rbac-abac-data-permissions.md',
      'biz-04-api-contract-dto-frontend-model.md',
      'biz-05-form-table-detail-state-consistency.md',
      'biz-06-async-jobs-import-export-progress.md',
      'biz-07-errors-idempotency-eventual-consistency.md',
      'biz-08-requirement-acceptance-traceability.md',
      'test-04-api-contract-consumer-driven-testing.md',
      'render-01-spa-ssr-ssg-isr-hybrid-decisions.md',
      'render-02-streaming-ssr-hydration-islands.md',
      'data-01-server-state-cache-keys-invalidation-deduplication.md',
      'data-02-optimistic-updates-conflicts-offline-mutations.md',
      'realtime-01-sse-websocket-webtransport-reliability.md',
      'comp-01-component-responsibility-api-composition.md',
      'comp-02-controlled-uncontrolled-state-imperative.md',
      'ux-01-interaction-states-usability-validation.md',
      'eng-08-software-supply-chain-sbom-provenance.md',
      'linux-01-filesystem-permissions-safe-commands.md',
      'linux-02-process-port-log-network-diagnostics.md',
      'linux-03-shell-environment-automation.md',
      'linux-04-server-security-ssh-users-firewall.md',
      'docker-01-images-containers-dockerfile-cache.md',
      'docker-02-compose-network-volumes-environments.md',
      'eng-06-ci-cd-artifact-promotion-release-rollback.md',
      'deploy-01-nginx-static-assets-reverse-proxy-https-cdn.md',
      'obs-01-frontend-observability-slo-alerting-privacy.md',
      'perf-01-core-web-vitals-performance-budgets.md',
      'perf-02-network-resource-loading-cache-optimization.md',
      'perf-03-main-thread-rendering-long-tasks-inp.md',
      'perf-04-memory-listeners-resource-leaks.md',
      'h5-01-viewport-responsive-safe-area-orientation.md',
      'h5-02-scroll-soft-keyboard-pointer-gestures.md',
      'mcp-01-server-tools-resources-prompts-schema.md',
      'aiprod-01-ai-task-model-selection-value-validation.md',
      'aiprod-02-high-risk-automation-human-in-the-loop.md',
      'aisafe-01-output-validation-content-safety-guardrails.md',
      'aisafe-02-threat-modeling-red-teaming-abuse-defense.md',
      'aigov-01-data-model-change-audit-accountability.md',
      'aiapp-01-model-interface-instructions-context-boundaries.md',
      'aiapp-02-streaming-sse-incremental-rendering.md',
      'aiapp-03-structured-output-schema-validation.md',
      'aiapp-04-tool-calling-execution-result-ui.md',
      'aiapp-05-generative-ui-view-model-host-safety.md',
      'aiui-01-agent-ui-protocol-interoperability.md',
      'aiapp-06-rag-citations-source-trust.md',
      'aiapp-07-prompt-injection-untrusted-content.md',
      'aiapp-08-evaluation-observability-release-gates.md',
      'aiapp-09-cost-quota-cache-reliability.md',
      'aiapp-10-ai-interaction-trust-recovery.md',
      'aiapp-12-conversation-state-context-compression-privacy.md',
      'aiapp-13-long-term-memory-personalization-forgetting.md',
      'agent-01-loop-planning-stopping-recovery.md',
      'agent-03-mcp-transport-stateless-state-versioning.md',
      'agent-04-mcp-client-discovery-compatibility.md',
      'agent-05-human-in-the-loop-risk-approval.md',
      'agent-06-tasks-long-running-recovery-idempotency.md',
      'agent-07-multi-agent-coordination-context-isolation.md',
      'agent-08-tool-contract-schema-discoverability.md',
      'agent-09-observability-read-only-replay.md',
      'agent-10-identity-authorization-runtime-isolation.md',
      'aidev-04-ai-code-review-risk-evidence.md',
      'aidev-07-dependency-source-security.md',
      'aidev-10-ai-tool-data-team-governance.md',
      'compat-01-baseline-progressive-enhancement-device-testing.md',
      'arch-01-quality-attributes-constraints-tradeoffs.md',
      'arch-02-technical-proposal-adr-review.md',
      'arch-03-progressive-migration-strangler-compatibility.md',
      'arch-04-technical-debt-prioritization-governance.md',
      'arch-05-framework-selection-lifecycle-migration.md',
      'lead-01-technical-roadmap-delegation-influence.md',
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

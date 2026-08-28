import { expect, test } from '@playwright/test';

test.describe('Atlas AI 可读交互', () => {
  test('面板用清晰字号和可切换宽度突出核心能力', async ({ page }) => {
    await page.goto('/knowledge/JS-04');
    await page.getByRole('button', { name: /Atlas AI/ }).click();

    const panel = page.getByLabel('Atlas AI 学习助手');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Atlas AI' })).toBeVisible();
    await expect(panel.getByText('会判断与核验资料的学习助手')).toBeVisible();
    await expect(panel.getByText('资料不是答案')).toBeVisible();
    await expect(panel.locator('.context-bar')).toContainText('JS-04 异步、Promise 与事件循环');
    await expect(panel.getByRole('button', { name: '总结当前页' })).toBeVisible();
    await expect(panel.getByRole('button', { name: '解释选中内容' })).toBeDisabled();
    await expect(panel.getByPlaceholder('结合当前页开始新问题…')).toBeVisible();

    const readability = await panel.evaluate((element) => ({
      width: Math.round(element.getBoundingClientRect().width),
      contextFont: Number.parseFloat(getComputedStyle(element.querySelector('.context-bar strong')!).fontSize),
      composerFont: Number.parseFloat(getComputedStyle(element.querySelector('.composer-box textarea')!).fontSize),
      footerFont: Number.parseFloat(getComputedStyle(element.querySelector('.assistant-composer > p')!).fontSize),
    }));
    expect(readability.width).toBeGreaterThanOrEqual(540);
    expect(readability.contextFont).toBeGreaterThanOrEqual(13);
    expect(readability.composerFont).toBeGreaterThanOrEqual(15);
    expect(readability.footerFont).toBeGreaterThanOrEqual(12);
    const standardLayout = await panel.evaluate((element) => {
      const header = element.querySelector('.assistant-header')!;
      const conversation = element.querySelector('.assistant-conversation')!;
      const closeButton = element.querySelector<HTMLButtonElement>('.assistant-header-actions button:last-child')!;
      return {
        panelClientWidth: element.clientWidth,
        panelScrollWidth: element.scrollWidth,
        headerWidth: Math.round(header.getBoundingClientRect().width),
        conversationClientWidth: conversation.clientWidth,
        conversationScrollWidth: conversation.scrollWidth,
        closeButtonRight: Math.round(closeButton.getBoundingClientRect().right),
        panelRight: Math.round(element.getBoundingClientRect().right),
      };
    });
    expect(standardLayout.panelScrollWidth).toBe(standardLayout.panelClientWidth);
    expect(standardLayout.headerWidth).toBe(standardLayout.panelClientWidth);
    expect(standardLayout.conversationScrollWidth).toBeLessThanOrEqual(standardLayout.conversationClientWidth);
    expect(standardLayout.closeButtonRight).toBeLessThanOrEqual(standardLayout.panelRight);

    await panel.getByRole('button', { name: '宽屏阅读' }).click();
    await expect(panel.getByRole('button', { name: '标准宽度' })).toBeVisible();
    await expect.poll(() => panel.evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBeGreaterThanOrEqual(700);
  });

  test('鼠标仍在调整选区时不提示，松开并稳定后才显示 AI 解释', async ({ page }) => {
    await page.goto('/knowledge/JS-04');
    const paragraph = page.locator('#main-content p:visible').filter({ hasText: /任务|微任务|事件循环|异步/ }).first();
    await expect(paragraph).toBeVisible();
    const box = await paragraph.boundingBox();
    if (!box) throw new Error('selectable paragraph has no bounding box');
    const y = box.y + Math.min(box.height / 2, 12);
    await page.mouse.move(box.x + 5, y);
    await page.mouse.down();
    await page.mouse.move(box.x + Math.min(box.width - 5, 180), y, { steps: 8 });

    await page.waitForTimeout(450);
    await expect(page.getByRole('button', { name: 'AI 解释' })).toBeHidden();

    await page.mouse.up();
    await expect(page.getByRole('button', { name: 'AI 解释' })).toBeVisible({ timeout: 1_000 });
  });

  test('流式错误显示阶段和请求编号，并提供可复制的错误报告', async ({ page }) => {
    await page.route('**/api/v1/assistant/stream', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: [
          'event: diagnostic',
          'data: {"incidentId":"req-e2e-diagnostic","stage":"MODEL_WAIT","elapsedMs":1200}',
          '',
          'event: error',
          'data: {"incidentId":"req-e2e-diagnostic","message":"AI 响应超时，请稍后重试","code":"AI_TIMEOUT","stage":"MODEL_WAIT","elapsedMs":15000,"retryable":true}',
          '',
        ].join('\n'),
      });
    });
    await page.goto('/knowledge/JS-04');
    await page.getByRole('button', { name: /Atlas AI/ }).click();
    const panel = page.getByLabel('Atlas AI 学习助手');
    await panel.getByRole('button', { name: '总结当前页' }).click();

    await expect(panel.getByText('AI 响应超时，请稍后重试')).toBeVisible();
    await expect(panel.getByText(/AI_TIMEOUT · MODEL_WAIT · req-e2e-diagnostic/)).toBeVisible();
    await expect(panel.getByRole('button', { name: '复制错误报告' })).toBeVisible();
    await expect(panel).not.toContainText('正在精简上下文');
  });

  test('初次渲染后到达的流内容会立即更新界面', async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        if (String(input).includes('/api/v1/assistant/stream')) {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('event: progress\ndata: {"incidentId":"req-delayed-stream","message":"上下文已就绪，正在回答"}\n\n'));
              window.setTimeout(() => controller.enqueue(encoder.encode('event: delta\ndata: {"incidentId":"req-delayed-stream","delta":"延迟到达的回答已显示。"}\n\n')), 350);
              window.setTimeout(() => {
                controller.enqueue(encoder.encode('event: done\ndata: {"incidentId":"req-delayed-stream","provider":"test","model":"test","pageCharacterCount":100,"contextCharacterCount":40,"webSearchUsed":false,"elapsedMs":500}\n\n'));
                controller.close();
              }, 500);
            },
          });
          return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } });
        }
        return originalFetch(input, init);
      };
    });
    await page.goto('/knowledge/JS-04');
    await page.getByRole('button', { name: /Atlas AI/ }).click();
    const panel = page.getByLabel('Atlas AI 学习助手');
    await panel.getByRole('button', { name: '总结当前页' }).click();

    await expect(panel.getByText('上下文已就绪，正在回答')).toBeVisible();
    await expect(panel.getByText('延迟到达的回答已显示。')).toBeVisible({ timeout: 2_000 });
    await expect(panel.getByText('使用 40 / 100 字')).toBeVisible();
    const answerFont = await panel.getByLabel('AI 助手回答').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(answerFont).toBeGreaterThanOrEqual(15);
  });

  test('正文引用直接链接真实资料，并隐藏未用于回答的检索结果', async ({ page }) => {
    await page.route('**/api/v1/assistant/stream', async (route) => {
      const sources = [
        { id: 'S1', kind: 'SITE', title: '站内事件循环讲义', url: '/knowledge/JS-04', excerpt: '站内讲义摘录' },
        { id: 'W1', kind: 'WEB', title: 'MDN Web Workers', url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API', excerpt: '浏览器标准资料' },
        { id: 'W2', kind: 'WEB', title: '未用于正文的延伸资料', url: 'https://example.com/extra', excerpt: '延伸阅读' },
      ];
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: [
          'event: sources',
          `data: ${JSON.stringify({ sources, searchQuery: 'Web Worker DOM', webSearchUsed: true })}`,
          '',
          'event: delta',
          `data: ${JSON.stringify({ incidentId: 'req-citations', delta: '独立判断后的结论 [站内:S1]；外部核验 [网络:W1]。' })}`,
          '',
          'event: done',
          `data: ${JSON.stringify({ incidentId: 'req-citations', provider: 'test', model: 'test', pageCharacterCount: 1_000, contextCharacterCount: 500, webSearchUsed: true, elapsedMs: 100 })}`,
          '',
        ].join('\n'),
      });
    });

    await page.goto('/knowledge/JS-04');
    await page.getByRole('button', { name: /Atlas AI/ }).click();
    const panel = page.getByLabel('Atlas AI 学习助手');
    await panel.getByRole('button', { name: '总结当前页' }).click();

    const answer = panel.getByLabel('AI 助手回答');
    await expect(answer.getByRole('link', { name: '站内:S1' })).toHaveAttribute('href', '/knowledge/JS-04');
    await expect(answer.getByRole('link', { name: '网络:W1' })).toHaveAttribute('href', 'https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API');
    await expect(panel.locator('.assistant-sources summary')).toContainText('2 条正文引用');
    await panel.locator('.assistant-sources summary').click();
    await expect(panel.locator('.source-link.is-cited')).toHaveCount(2);
    await expect(panel.locator('.source-link')).toHaveCount(2);
    await expect(panel).not.toContainText('未用于正文的延伸资料');
  });

  test('窄屏改为全屏布局且正文和输入区仍保持可读', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/knowledge/JS-04');
    await page.getByRole('button', { name: /Atlas AI/ }).click();
    const panel = page.getByLabel('Atlas AI 学习助手');
    await expect.poll(() => panel.evaluate((element) => Math.round(element.getBoundingClientRect().x))).toBe(0);
    const metrics = await panel.evaluate((element) => ({
      width: Math.round(element.getBoundingClientRect().width),
      composerFont: Number.parseFloat(getComputedStyle(element.querySelector('.composer-box textarea')!).fontSize),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(metrics.width).toBe(390);
    expect(metrics.composerFont).toBeGreaterThanOrEqual(15);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    await expect(panel.getByText('资料不是答案')).toBeVisible();
    await expect(panel.getByRole('button', { name: '宽屏阅读' })).toBeHidden();
  });

  test('总结和解释建立独立会话，追问只继承当前会话并可从历史恢复', async ({ page }) => {
    const requests: Array<Record<string, unknown>> = [];
    const answers = [
      '第一份完整总结：覆盖主线、章节细节、边界提示与复习清单。',
      '当前会话追问回答：这里补充一个具体例子。',
      '第二份独立总结：不会混入上一轮追问。',
    ];
    await page.route('**/api/v1/assistant/stream', async (route) => {
      requests.push(route.request().postDataJSON() as Record<string, unknown>);
      const answer = answers[requests.length - 1] ?? '额外回答';
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: [
          'event: progress',
          `data: ${JSON.stringify({ incidentId: `req-session-${requests.length}`, message: '正在回答' })}`,
          '',
          'event: delta',
          `data: ${JSON.stringify({ incidentId: `req-session-${requests.length}`, delta: answer })}`,
          '',
          'event: done',
          `data: ${JSON.stringify({ incidentId: `req-session-${requests.length}`, provider: 'test', model: 'test', pageCharacterCount: 1_000, contextCharacterCount: 500, webSearchUsed: false, elapsedMs: 100 })}`,
          '',
        ].join('\n'),
      });
    });

    await page.goto('/knowledge/JS-04');
    await page.getByRole('button', { name: /Atlas AI/ }).click();
    const panel = page.getByLabel('Atlas AI 学习助手');
    await panel.getByRole('button', { name: '总结当前页' }).click();
    await expect(panel.getByText(answers[0]!)).toBeVisible();
    expect(requests[0]?.mode).toBe('SUMMARY');
    expect(requests[0]).not.toHaveProperty('history');

    await panel.getByPlaceholder('在当前会话中继续追问…').fill('请再举一个具体例子');
    await panel.getByRole('button', { name: '发送问题' }).click();
    await expect(panel.getByText(answers[1]!)).toBeVisible();
    expect(requests[1]?.mode).toBe('ASK');
    expect(requests[1]?.history).toEqual([
      { role: 'user', content: '总结当前页面' },
      { role: 'assistant', content: answers[0] },
    ]);

    await panel.getByRole('button', { name: '新会话' }).click();
    await panel.getByRole('button', { name: '总结当前页' }).click();
    await expect(panel.getByText(answers[2]!)).toBeVisible();
    expect(requests[2]?.mode).toBe('SUMMARY');
    expect(requests[2]).not.toHaveProperty('history');

    await panel.getByRole('button', { name: '历史会话' }).click();
    await expect(panel.getByText('2 个独立会话')).toBeVisible();
    await expect(panel.locator('.history-list > button')).toHaveCount(2);

    await page.reload();
    await page.getByRole('button', { name: /Atlas AI/ }).click();
    const restoredPanel = page.getByLabel('Atlas AI 学习助手');
    await restoredPanel.getByRole('button', { name: '历史会话' }).click();
    await expect(restoredPanel.locator('.history-list > button')).toHaveCount(2);
    await restoredPanel.locator('.history-list > button').last().click();
    await expect(restoredPanel.getByText('第一份完整总结', { exact: false })).toBeVisible();
  });
});

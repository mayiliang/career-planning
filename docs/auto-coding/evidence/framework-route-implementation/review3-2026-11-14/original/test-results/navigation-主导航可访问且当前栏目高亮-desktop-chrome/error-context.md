# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> 主导航可访问且当前栏目高亮
- Location: e2e/navigation.spec.ts:14:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: /知识体系/ })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "跳到主要内容" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - navigation "主导航" [ref=e5]:
    - generic [ref=e8]:
      - generic [ref=e9]: Career Atlas
      - paragraph [ref=e10]: AI 时代前端能力地图
    - paragraph [ref=e11]: 我的工作空间
    - list [ref=e12]:
      - listitem [ref=e13]:
        - link [ref=e14] [cursor=pointer]:
          - /url: /
          - strong [ref=e19]: 学习台
      - listitem [ref=e20]:
        - link [ref=e21] [cursor=pointer]:
          - /url: /knowledge/map
          - strong [ref=e26]: 知识体系
      - listitem [ref=e27]:
        - link [ref=e28] [cursor=pointer]:
          - /url: /notes
          - strong [ref=e33]: 笔记中心
      - listitem [ref=e34]:
        - link [ref=e35] [cursor=pointer]:
          - /url: /plan
          - strong [ref=e40]: 核心路线
      - listitem [ref=e41]:
        - link [ref=e42] [cursor=pointer]:
          - /url: /jobs
          - strong [ref=e47]: 求职支线
    - generic [ref=e48]:
      - link [ref=e49] [cursor=pointer]:
        - /url: /settings
        - strong [ref=e54]: 设置与数据
      - generic "服务正常" [ref=e55]:
        - generic [ref=e57]:
          - strong [ref=e58]: 服务正常
          - generic [ref=e59]: 本地优先 · 自主学习
  - generic [ref=e60]:
    - banner [ref=e61]:
      - generic [ref=e62]:
        - button "收起侧栏" [expanded] [ref=e63] [cursor=pointer]
        - generic [ref=e66]: 工作空间
        - generic [aria-hidden] [ref=e67]: /
        - generic [ref=e68]: 学习台
      - button "快速查找，快捷键 Command 或 Control 加 K" [ref=e70] [cursor=pointer]:
        - generic [ref=e73]: 搜索知识点、页面…
        - generic [ref=e74]: ⌘ K
    - main [ref=e75]:
      - paragraph [ref=e76]: 学习台页面已打开
      - generic [ref=e79]:
        - generic [ref=e80]:
          - generic [ref=e81]:
            - paragraph [ref=e82]:
              - text: YOUR LEARNING SPACE
              - generic [ref=e83]: 11月14日星期六
            - heading "学习台" [level=1] [ref=e84]: 学习台.
            - generic [ref=e85]: 每一点积累，都在拓宽你的能力边界。按自己的节奏，继续就好。
          - generic [ref=e86]:
            - button "从知识体系选择" [ref=e87] [cursor=pointer]
            - button "记录今日学习" [disabled] [ref=e90]
        - status [ref=e93]:
          - generic [ref=e94]: 正在恢复你的学习现场…
  - button "打开 Atlas AI 助手" [ref=e98] [cursor=pointer]:
    - generic [aria-hidden] [ref=e99]: ✦
    - generic [ref=e100]:
      - strong [ref=e101]: Atlas AI
      - generic [ref=e102]: 总结 · 解释 · 查资料
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test.beforeEach(async ({ page }) => {
  4  |   await page.route('**/api/v1/system/health', async (route) => {
  5  |     await route.fulfill({
  6  |       json: {
  7  |         data: { ok: true, db: true, dataDir: true, aiConfigured: false, timestamp: new Date().toISOString() },
  8  |         meta: { requestId: 'e2e' },
  9  |       },
  10 |     });
  11 |   });
  12 | });
  13 | 
  14 | test('主导航可访问且当前栏目高亮', async ({ page }) => {
  15 |   await page.goto('/');
  16 |   await expect(page.getByRole('heading', { name: '学习台' })).toBeVisible();
  17 |   await expect(page.getByRole('link', { name: '学习台' })).toHaveClass(/active/);
  18 | 
> 19 |   await page.getByRole('link', { name: /知识体系/ }).click();
     |                                                  ^ Error: locator.click: Test timeout of 30000ms exceeded.
  20 |   await expect(page).toHaveURL(/\/knowledge\/map$/);
  21 |   await expect(page.getByRole('link', { name: /知识体系/ })).toHaveClass(/active/);
  22 | 
  23 |   await page.getByRole('link', { name: /笔记中心/ }).click();
  24 |   await expect(page).toHaveURL(/\/notes$/);
  25 |   await expect(page.getByRole('link', { name: /笔记中心/ })).toHaveClass(/active/);
  26 | });
  27 | 
```
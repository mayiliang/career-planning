# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: async-navigation.spec.ts >> 原始笔记保存失败时，不整理旧原文，也不标记学习完成
- Location: e2e/async-navigation.spec.ts:139:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('textbox', { name: 'Markdown 原始笔记' })

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
      - button "快速查找，快捷键 Command 或 Control 加 K" [ref=e69] [cursor=pointer]:
        - generic [ref=e72]: 搜索知识点、页面…
        - generic [ref=e73]: ⌘ K
    - main [ref=e74]:
      - paragraph [ref=e75]: Career Atlas页面已打开
  - button "打开 Atlas AI 助手" [ref=e77] [cursor=pointer]:
    - generic [aria-hidden] [ref=e78]: ✦
    - generic [ref=e79]:
      - strong [ref=e80]: Atlas AI
      - generic [ref=e81]: 总结 · 解释 · 查资料
```

# Test source

```ts
  59  |     };
  60  |     await route.fulfill({ json: { data: { job, activities: [], skillGaps: [] }, meta: { requestId: id } } });
  61  |   });
  62  |   await page.goto('/jobs/first');
  63  |   await expect(page.getByRole('heading', { name: '岗位-first' })).toBeVisible();
  64  |   await page.evaluate(() => {
  65  |     window.history.pushState({}, '', '/jobs/second');
  66  |     window.dispatchEvent(new PopStateEvent('popstate'));
  67  |   });
  68  |   await expect(page.getByRole('heading', { name: '岗位-second' })).toBeVisible();
  69  |   await expect(page.getByRole('heading', { name: '岗位-first' })).toHaveCount(0);
  70  | });
  71  | 
  72  | test('知识点切换后，旧保存失败不能把新草稿写到旧知识点名下', async ({ page }) => {
  73  |   const oldCode = 'PERF-04';
  74  |   const newCode = 'H5-01';
  75  |   let release!: () => void;
  76  |   const delayed = new Promise<void>(resolve => { release = resolve; });
  77  |   let begin!: () => void;
  78  |   const started = new Promise<void>(resolve => { begin = resolve; });
  79  |   let finish!: () => void;
  80  |   const finished = new Promise<void>(resolve => { finish = resolve; });
  81  |   await page.route('**/api/v1/notes/*', async route => {
  82  |     const code = new URL(route.request().url()).pathname.split('/').pop()!;
  83  |     if (route.request().method() === 'GET') {
  84  |       await route.fulfill({ json: { data: null, meta: { requestId: code } } });
  85  |       return;
  86  |     }
  87  |     if (code === oldCode) {
  88  |       begin();
  89  |       await delayed;
  90  |       try {
  91  |         await route.fulfill({ status: 503, json: { error: { code: 'OLD_SAVE_FAILED', message: '旧保存失败', retryable: true }, meta: { requestId: code } } });
  92  |       } finally { finish(); }
  93  |       return;
  94  |     }
  95  |     const body = route.request().postDataJSON() as { contentMd: string };
  96  |     await route.fulfill({ json: { data: { ...note(code), knowledgePointCode: code, originalMd: body.contentMd }, meta: { requestId: code } } });
  97  |   });
  98  |   await page.goto(`/knowledge/${oldCode}?tab=notes`);
  99  |   await page.getByRole('textbox', { name: 'Markdown 原始笔记' }).fill('旧知识点的原始草稿');
  100 |   await started;
  101 |   await navigateWithinApp(page, `/knowledge/${newCode}?tab=notes`);
  102 |   await expect(page.locator('.point-hero h1 code')).toHaveText(newCode);
  103 |   const editor = page.getByRole('textbox', { name: 'Markdown 原始笔记' });
  104 |   await editor.fill('新知识点的原始草稿');
  105 |   release();
  106 |   await finished;
  107 |   await expect(editor).toHaveValue('新知识点的原始草稿');
  108 |   expect(await page.evaluate(code => localStorage.getItem(`career-atlas:note-draft:${code}`), oldCode)).toBe('旧知识点的原始草稿');
  109 |   await expect(page.getByText('旧保存失败', { exact: true })).toHaveCount(0);
  110 |   await page.getByRole('button', { name: '立即保存' }).click();
  111 |   await expect(page.locator('.note-save-state')).toHaveAttribute('data-state', 'SAVED');
  112 | });
  113 | 
  114 | test('知识点详情忽略切换前的迟到读取结果', async ({ page }) => {
  115 |   let release!: () => void;
  116 |   const delayed = new Promise<void>(resolve => { release = resolve; });
  117 |   let begin!: () => void;
  118 |   const started = new Promise<void>(resolve => { begin = resolve; });
  119 |   let finish!: () => void;
  120 |   const finished = new Promise<void>(resolve => { finish = resolve; });
  121 |   await page.route('**/api/v1/knowledge/points/ARCH-01', async route => {
  122 |     const response = await route.fetch();
  123 |     begin();
  124 |     await delayed;
  125 |     try { await route.fulfill({ response }); }
  126 |     catch { /* 新页面会取消旧读取。 */ }
  127 |     finally { finish(); }
  128 |   });
  129 |   await page.goto('/knowledge/ARCH-01');
  130 |   await started;
  131 |   await navigateWithinApp(page, '/knowledge/ARCH-02');
  132 |   await expect(page.locator('.point-hero h1 code')).toHaveText('ARCH-02');
  133 |   release();
  134 |   await finished;
  135 |   await expect(page.locator('.point-hero h1 code')).toHaveText('ARCH-02');
  136 |   await expect(page.getByText('正在打开学习内容…')).toHaveCount(0);
  137 | });
  138 | 
  139 | test('原始笔记保存失败时，不整理旧原文，也不标记学习完成', async ({ page }) => {
  140 |   const code = 'ARCH-03';
  141 |   let organized = 0;
  142 |   let completed = 0;
  143 |   await page.route(`**/api/v1/knowledge/points/${code}`, async route => {
  144 |     const response = await route.fetch();
  145 |     const body = await response.json();
  146 |     body.data.learningState = 'LEARNING';
  147 |     await route.fulfill({ json: body });
  148 |   });
  149 |   await page.route(`**/api/v1/notes/${code}`, async route => {
  150 |     if (route.request().method() === 'GET') {
  151 |       await route.fulfill({ json: { data: null, meta: { requestId: code } } });
  152 |       return;
  153 |     }
  154 |     await route.fulfill({ status: 503, json: { error: { code: 'NOTE_SAVE_FAILED', message: '原文保存失败', retryable: true }, meta: { requestId: code } } });
  155 |   });
  156 |   await page.route(`**/api/v1/notes/${code}/organize/stream`, async route => { organized += 1; await route.abort(); });
  157 |   await page.route(`**/api/v1/learning/points/${code}/complete`, async route => { completed += 1; await route.abort(); });
  158 |   await page.goto(`/knowledge/${code}?tab=notes`);
> 159 |   await page.getByRole('textbox', { name: 'Markdown 原始笔记' }).fill('尚未保存到服务端的新原文');
      |                                                              ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  160 |   await page.getByRole('button', { name: '用 AI 整理并核对' }).click();
  161 |   await expect(page.locator('.note-save-state')).toHaveAttribute('data-state', 'ERROR');
  162 |   await expect(page.getByRole('button', { name: '用 AI 整理并核对' })).toBeEnabled();
  163 |   const saved = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith(`/notes/${code}`));
  164 |   await page.getByRole('button', { name: '我已阅读资料并完成笔记' }).click();
  165 |   await saved;
  166 |   await expect(page.locator('.note-save-state')).toHaveAttribute('data-state', 'ERROR');
  167 |   await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  168 |   expect({ organized, completed }).toEqual({ organized: 0, completed: 0 });
  169 |   expect(await page.evaluate(value => localStorage.getItem(`career-atlas:note-draft:${value}`), code)).toBe('尚未保存到服务端的新原文');
  170 | });
  171 | 
```
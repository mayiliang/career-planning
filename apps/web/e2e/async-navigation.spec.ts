import { expect, test, type Page } from '@playwright/test';

async function navigateWithinApp(page: Page, path: string) {
  await page.evaluate(value => {
    window.history.pushState({}, '', value);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

const now = '2026-10-13T00:00:00.000Z';

function note(title: string) {
  return {
    id: title, knowledgePointCode: 'JS-01', pointTitle: title, domainCode: '01', domainTitle: 'JavaScript',
    originalMd: title, organizedMd: null, activeVersionSource: 'USER', activeMd: title, aiReview: null,
    createdAt: now, updatedAt: now, versions: [], routeOrder: 1,
  };
}

test('笔记搜索忽略旧请求的迟到结果', async ({ page }) => {
  let releaseOld!: () => void;
  const oldResponse = new Promise<void>(resolve => { releaseOld = resolve; });
  let oldStarted!: () => void;
  const started = new Promise<void>(resolve => { oldStarted = resolve; });
  let oldFinished!: () => void;
  const finished = new Promise<void>(resolve => { oldFinished = resolve; });
  await page.route('**/api/v1/notes?*', async route => {
    const search = new URL(route.request().url()).searchParams.get('search') ?? '初始笔记';
    if (search === '旧查询') { oldStarted(); await oldResponse; }
    try {
      await route.fulfill({ json: { data: [note(search)], meta: { requestId: search } } });
    } catch {
      // 新查询会取消旧请求，浏览器因此可能不再接受旧响应。
    } finally {
      if (search === '旧查询') oldFinished();
    }
  });
  await page.goto('/notes');
  await expect(page.locator('.note-reader h2')).toContainText('初始笔记');
  const search = page.getByPlaceholder('例如：ES Modules');
  await search.fill('旧查询');
  await started;
  await search.fill('最新查询');
  await expect(page.locator('.note-reader h2')).toContainText('最新查询');
  releaseOld();
  await finished;
  await expect(page.locator('.note-reader h2')).toContainText('最新查询');
  await expect(page.getByText('正在读取笔记…')).toHaveCount(0);
});

test('岗位详情在同一页面切换参数后读取新的岗位', async ({ page }) => {
  await page.route('**/api/v1/jobs/*', async route => {
    const id = new URL(route.request().url()).pathname.split('/').pop()!;
    const job = {
      id, company: `公司-${id}`, jobTitle: `岗位-${id}`, platform: '手动', salary: null, experience: null,
      location: null, sourceUrl: null, jobDirection: null, techStack: null, jdKeywords: null, matchedProject: null,
      matchLevel: null, skillGap: null, status: 'SAVED', nextAction: null, nextActionDue: null, notes: null,
      priority: 1, createdAt: now, updatedAt: now,
    };
    await route.fulfill({ json: { data: { job, activities: [], skillGaps: [] }, meta: { requestId: id } } });
  });
  await page.goto('/jobs/first');
  await expect(page.getByRole('heading', { name: '岗位-first' })).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/jobs/second');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { name: '岗位-second' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '岗位-first' })).toHaveCount(0);
});

test('知识点切换后，旧保存失败不能把新草稿写到旧知识点名下', async ({ page }) => {
  const oldCode = 'PERF-04';
  const newCode = 'H5-01';
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  let begin!: () => void;
  const started = new Promise<void>(resolve => { begin = resolve; });
  let finish!: () => void;
  const finished = new Promise<void>(resolve => { finish = resolve; });
  await page.route('**/api/v1/notes/*', async route => {
    const code = new URL(route.request().url()).pathname.split('/').pop()!;
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { data: null, meta: { requestId: code } } });
      return;
    }
    if (code === oldCode) {
      begin();
      await delayed;
      try {
        await route.fulfill({ status: 503, json: { error: { code: 'OLD_SAVE_FAILED', message: '旧保存失败', retryable: true }, meta: { requestId: code } } });
      } finally { finish(); }
      return;
    }
    const body = route.request().postDataJSON() as { contentMd: string };
    await route.fulfill({ json: { data: { ...note(code), knowledgePointCode: code, originalMd: body.contentMd }, meta: { requestId: code } } });
  });
  await page.goto(`/knowledge/${oldCode}?tab=notes`);
  await page.getByRole('textbox', { name: 'Markdown 原始笔记' }).fill('旧知识点的原始草稿');
  await started;
  await navigateWithinApp(page, `/knowledge/${newCode}?tab=notes`);
  await expect(page.locator('.point-hero h1 code')).toHaveText(newCode);
  const editor = page.getByRole('textbox', { name: 'Markdown 原始笔记' });
  await editor.fill('新知识点的原始草稿');
  release();
  await finished;
  await expect(editor).toHaveValue('新知识点的原始草稿');
  expect(await page.evaluate(code => localStorage.getItem(`career-atlas:note-draft:${code}`), oldCode)).toBe('旧知识点的原始草稿');
  await expect(page.getByText('旧保存失败', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '立即保存' }).click();
  await expect(page.locator('.note-save-state')).toHaveAttribute('data-state', 'SAVED');
});

test('知识点详情忽略切换前的迟到读取结果', async ({ page }) => {
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  let begin!: () => void;
  const started = new Promise<void>(resolve => { begin = resolve; });
  let finish!: () => void;
  const finished = new Promise<void>(resolve => { finish = resolve; });
  await page.route('**/api/v1/knowledge/points/ARCH-01', async route => {
    const response = await route.fetch();
    begin();
    await delayed;
    try { await route.fulfill({ response }); }
    catch { /* 新页面会取消旧读取。 */ }
    finally { finish(); }
  });
  await page.goto('/knowledge/ARCH-01');
  await started;
  await navigateWithinApp(page, '/knowledge/ARCH-02');
  await expect(page.locator('.point-hero h1 code')).toHaveText('ARCH-02');
  release();
  await finished;
  await expect(page.locator('.point-hero h1 code')).toHaveText('ARCH-02');
  await expect(page.getByText('正在打开学习内容…')).toHaveCount(0);
});

test('原始笔记保存失败时，不整理旧原文，也不标记学习完成', async ({ page }) => {
  const code = 'ARCH-03';
  let organized = 0;
  let completed = 0;
  await page.route(`**/api/v1/knowledge/points/${code}`, async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.learningState = 'LEARNING';
    await route.fulfill({ json: body });
  });
  await page.route(`**/api/v1/notes/${code}`, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { data: null, meta: { requestId: code } } });
      return;
    }
    await route.fulfill({ status: 503, json: { error: { code: 'NOTE_SAVE_FAILED', message: '原文保存失败', retryable: true }, meta: { requestId: code } } });
  });
  await page.route(`**/api/v1/notes/${code}/organize/stream`, async route => { organized += 1; await route.abort(); });
  await page.route(`**/api/v1/learning/points/${code}/complete`, async route => { completed += 1; await route.abort(); });
  await page.goto(`/knowledge/${code}?tab=notes`);
  await page.getByRole('textbox', { name: 'Markdown 原始笔记' }).fill('尚未保存到服务端的新原文');
  await page.getByRole('button', { name: '用 AI 整理并核对' }).click();
  await expect(page.locator('.note-save-state')).toHaveAttribute('data-state', 'ERROR');
  await expect(page.getByRole('button', { name: '用 AI 整理并核对' })).toBeEnabled();
  const saved = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith(`/notes/${code}`));
  await page.getByRole('button', { name: '我已阅读资料并完成笔记' }).click();
  await saved;
  await expect(page.locator('.note-save-state')).toHaveAttribute('data-state', 'ERROR');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  expect({ organized, completed }).toEqual({ organized: 0, completed: 0 });
  expect(await page.evaluate(value => localStorage.getItem(`career-atlas:note-draft:${value}`), code)).toBe('尚未保存到服务端的新原文');
});

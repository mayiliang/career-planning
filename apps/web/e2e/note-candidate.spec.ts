import { expect, test } from '@playwright/test';

test('采用候选稿核对版本，切换知识点后旧响应不改写新笔记', async ({ page }) => {
  const oldCode = 'PERF-04';
  const newCode = 'H5-01';
  const now = '2026-10-13T00:00:00Z';
  const candidate = {
    id: 'candidate-note', knowledgePointCode: oldCode, pointTitle: '旧笔记', domainCode: '07', domainTitle: '测试',
    originalMd: '旧原文', organizedMd: '旧候选稿', activeVersionSource: 'ORIGINAL', activeMd: '旧原文', aiReview: null,
    createdAt: now, updatedAt: now, routeOrder: 1,
    versions: [{ id: 'reviewed-draft-id', versionNo: 2, source: 'AI_DRAFT', changeSummary: null, createdAt: now }],
  };
  let release!: () => void;
  let begin!: () => void;
  let finish!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { begin = resolve; });
  const finished = new Promise<void>(resolve => { finish = resolve; });
  await page.route('**/api/v1/notes/**', async route => {
    if (route.request().url().endsWith('/accept-organized')) {
      expect(route.request().postDataJSON()).toEqual({ expectedDraftVersionId: 'reviewed-draft-id' });
      begin();
      await delayed;
      try { await route.fulfill({ json: { data: { ...candidate, activeMd: '旧候选稿', activeVersionSource: 'ORGANIZED' }, meta: { requestId: 'accept-old' } } }); }
      finally { finish(); }
      return;
    }
    const code = new URL(route.request().url()).pathname.split('/').pop();
    const data = code === oldCode ? candidate : {
      ...candidate, id: 'new-note', knowledgePointCode: newCode, originalMd: '新知识点原文',
      organizedMd: null, activeMd: '新知识点原文', versions: [],
    };
    await route.fulfill({ json: { data, meta: { requestId: String(code) } } });
  });
  await page.goto(`/knowledge/${oldCode}?tab=notes`);
  await expect(page.getByLabel('Markdown 原始笔记')).toHaveValue('旧原文');
  await page.getByRole('button', { name: '采用为阅读版本' }).click();
  await started;
  await page.evaluate(path => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, `/knowledge/${newCode}?tab=notes`);
  await expect(page.getByLabel('Markdown 原始笔记')).toHaveValue('新知识点原文');
  release();
  await finished;
  await expect(page.getByLabel('Markdown 原始笔记')).toHaveValue('新知识点原文');
  await expect(page.getByRole('button', { name: '采用为阅读版本' })).toHaveCount(0);
  await expect(page.getByText('已将整理稿设为阅读版本；原始笔记和全部版本仍然保留')).toHaveCount(0);
});

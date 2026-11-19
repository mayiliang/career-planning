# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: framework-route.spec.ts >> 独立方向、统一下一步、保留焦点、阅读辅助与空态
- Location: e2e/framework-route.spec.ts:7:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: apiRequestContext.put: Test timeout of 120000ms exceeded.
```

# Test source

```ts
  1   | import { createRequire } from 'node:module';
  2   | import { join } from 'node:path';
  3   | import { expect, test } from '@playwright/test';
  4   | import { mkdir, writeFile } from 'node:fs/promises';
  5   | import { fileURLToPath } from 'node:url';
  6   | const evidence = new URL(`../../../docs/auto-coding/evidence/framework-route-implementation/run-${new Date().toISOString().replace(/[:.]/g, '-')}/`, import.meta.url);
  7   | test('独立方向、统一下一步、保留焦点、阅读辅助与空态', async ({ page, browser }) => {
  8   |   test.setTimeout(120_000);
  9   |   await mkdir(evidence, {recursive:true});
  10  |   await page.request.post('/api/v1/import/reset-learning-progress', {data:{}});
  11  |   const pref = (await (await page.request.get('/api/v1/learning/preferences')).json()).data;
> 12  |   await page.request.put('/api/v1/learning/preferences', {data:{frameworkChoice:'UNDECIDED',expectedRevision:pref.revision}});
      |                      ^ Error: apiRequestContext.put: Test timeout of 120000ms exceeded.
  13  |   await page.setViewportSize({width:1440,height:1000});
  14  |   await page.goto('/');
  15  |   const panel = page.getByRole('region', {name:'我的下一步',exact:true});
  16  |   await expect(panel).toContainText('请选择框架方向');
  17  |   await panel.getByLabel('框架方向').focus();
  18  |   await expect(panel.getByLabel('框架方向')).toBeFocused();
  19  |   await panel.getByLabel('框架方向').selectOption('REACT');
  20  |   await panel.getByRole('button',{name:'保存方向',exact:true}).click();
  21  |   await expect(panel).toContainText('补齐基础 · JS-01');
  22  |   await page.reload(); await expect(panel.getByLabel('框架方向')).toHaveValue('REACT');
  23  |   for (const url of ['/plan','/knowledge/REACT-02','/knowledge/materials/react-02-component-boundaries-data-flow-composition.md/react-02']) {
  24  |     await page.goto(url); await expect(panel).toContainText('补齐基础 · JS-01');
  25  |   }
  26  |   await expect(page.getByLabel('练习合同状态')).toContainText('筛选后编辑器');
  27  |   await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
  28  |   await expect(page.getByText('同组下一篇 →',{exact:true})).toBeVisible();
  29  |   const reading = async () => (await (await page.request.get('/api/v1/knowledge/material-progress')).json()).data.find((r:{guide:string})=>r.guide==='react-02-component-boundaries-data-flow-composition.md');
  30  |   const before = await reading();
  31  |   await panel.getByLabel('框架方向').selectOption('VUE'); await panel.getByRole('button',{name:'保存方向',exact:true}).click();
  32  |   await expect(panel).toContainText('补齐基础 · WEB-01');
  33  |   const after = await reading(); expect(after?.progressPercent ?? 0).toBeGreaterThanOrEqual(before?.progressPercent ?? 0);
  34  |   await page.screenshot({path:fileURLToPath(new URL('reader-desktop.png',evidence)),fullPage:false,animations:'disabled'});
  35  |   // 补学链接与返回；查看不会开始目标。
  36  |   await panel.getByRole('link',{name:'补齐基础 · WEB-01 →',exact:true}).click();
  37  |   await expect(page.locator('.point-hero h1 code')).toHaveText('WEB-01');
  38  |   await page.goBack(); await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
  39  |   await page.request.post('/api/v1/learning/points/REACT-03/focus');
  40  |   await page.goto('/plan'); await expect(panel).toContainText('继续学习 · REACT-03'); await expect(panel).toContainText('位于其他方向');
  41  |   await page.screenshot({path:fileURLToPath(new URL('plan-desktop.png',evidence)),fullPage:false,animations:'disabled'});
  42  |   await page.setViewportSize({width:390,height:844});
  43  |   await page.screenshot({path:fileURLToPath(new URL('plan-narrow.png',evidence)),fullPage:false,animations:'disabled'});
  44  |   expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  45  |   await page.request.post('/api/v1/learning/points/REACT-03/complete');
  46  |   await page.request.post('/api/v1/learning/points/WEB-01/defer',{data:{reason:'隔离测试'}});
  47  |   await page.reload(); await expect(panel).toContainText('所需基础已暂缓');
  48  |   await panel.locator('a[href="/knowledge/WEB-01"]').first().click();
  49  |   await page.getByRole('button',{name:'恢复学习',exact:true}).click();
  50  |   await expect(page.locator('.state-row')).not.toContainText('稍后再学');
  51  |   for (const code of ['VUE-01','VUE-02','VUE-03','VUE-04','VUE-05']) await page.request.post(`/api/v1/learning/points/${code}/complete`);
  52  |   await page.goto('/plan'); await expect(panel).toContainText('所选方向的已审学习链已完成');
  53  |   expect((await (await page.request.get('/api/v1/knowledge/recommendation')).json()).data.point).toBeNull();
  54  |   await page.screenshot({path:fileURLToPath(new URL('complete-narrow.png',evidence)),fullPage:false,animations:'disabled'});
  55  |   const dataDir = process.env.CAREER_ATLAS_E2E_DATA_DIR!;
  56  |   expect(dataDir).toContain('/tmp/e2e/career-atlas-e2e-');
  57  |   const requireServer = createRequire(new URL('../../server/package.json', import.meta.url));
  58  |   const Database = requireServer('better-sqlite3');
  59  |   const db = new Database(join(dataDir, 'career-atlas.db'));
  60  |   db.prepare("INSERT INTO learning_practice_attempts (id,knowledge_point_code,activity_id,submission_md,code,execution_output,status,created_at,updated_at) VALUES ('legacy-ui','REACT-02','strict-practice','旧夹具答卷：原文保留','旧代码','旧输出','DRAFT','old','old')").run();
  61  |   db.prepare("INSERT INTO assessment_sessions (id,knowledge_point_code,assessment_type,status,duration_minutes,created_at,updated_at) VALUES ('38107d0d-8a15-4f08-95ef-19144cdd8f00','REACT-02','FIRST','IN_PROGRESS',30,'2026-11-01','2026-11-01')").run();
  62  |   db.prepare("INSERT INTO assessment_questions (id,session_id,question_type,dimension,question_content,max_score,order_index,created_at) VALUES ('38107d0d-8a15-4f08-95ef-19144cdd8f01','38107d0d-8a15-4f08-95ef-19144cdd8f00','ESSAY','practice',?,20,0,'2026-11-01')").run(JSON.stringify({question:'旧题原文保留：解释原组件行为',sourceQuestion:'旧首考题 1'}));
  63  |   db.close();
  64  |   await page.goto('/knowledge/REACT-02');
  65  |   await page.getByRole('button', {name:'在系统中开始并完成 →'}).click();
  66  |   await page.getByText('历史练习 · framework-foundation-legacy · 只读证据',{exact:true}).click();
  67  |   const oldSubmission = page.getByText('旧夹具答卷：原文保留', { exact: true });
  68  |   await oldSubmission.scrollIntoViewIfNeeded();
  69  |   await expect(oldSubmission).toBeVisible();
  70  |   await page.screenshot({path:fileURLToPath(new URL('legacy-practice-narrow.png',evidence)),fullPage:false,animations:'disabled'});
  71  |   const legacy = (await (await page.request.get('/api/v1/assessments/38107d0d-8a15-4f08-95ef-19144cdd8f00')).json()).data;
  72  |   expect(JSON.stringify(legacy)).toContain('旧题原文保留');
  73  |   await page.goto('/assessment/38107d0d-8a15-4f08-95ef-19144cdd8f00');
  74  |   const oldQuestion = page.getByText('旧题原文保留：解释原组件行为', {exact:true});
  75  |   await oldQuestion.scrollIntoViewIfNeeded();
  76  |   await expect(oldQuestion).toBeVisible();
  77  |   await page.screenshot({path:fileURLToPath(new URL('legacy-challenge-narrow.png',evidence)),fullPage:false,animations:'disabled'});
  78  |   await writeFile(new URL('pages.json',evidence),JSON.stringify({time:new Date().toISOString(),browser:browser.version(),viewports:[{width:1440,height:1000},{width:390,height:844}],baseURL:'http://127.0.0.1:42731',paths:['/','/plan','/knowledge/REACT-02','/knowledge/WEB-01','/assessment/38107d0d-8a15-4f08-95ef-19144cdd8f00','/knowledge/materials/react-02-component-boundaries-data-flow-composition.md/react-02'],checks:['选择刷新持久化','各入口下一步一致','切换保留焦点','阅读进度不清零','补学返回','暂缓恢复','链完成无兜底','键盘焦点','窄屏无横向溢出','旧练习只读','旧挑战原题读取']},null,2));
  79  | });
  80  | 
  81  | test('详情暂缓前置立即同步个人推荐并可恢复', async ({ page, browser }) => {
  82  |   await mkdir(evidence, { recursive: true });
  83  |   await page.request.post('/api/v1/import/reset-learning-progress', { data: {} });
  84  |   const preference = (await (await page.request.get('/api/v1/learning/preferences')).json()).data;
  85  |   await page.request.put('/api/v1/learning/preferences', { data: { frameworkChoice: 'REACT', expectedRevision: preference.revision } });
  86  |   await page.goto('/knowledge/REACT-02');
  87  |   const panel = page.getByRole('region', { name: '我的下一步', exact: true });
  88  |   await expect(panel).toContainText('补齐基础 · JS-01');
  89  |   await page.getByRole('button', { name: '暂缓此知识点', exact: true }).click();
  90  |   await expect(panel).toContainText('所需基础已暂缓');
  91  |   await expect(panel.locator('.next')).toHaveCount(0);
  92  |   await expect(page.getByRole('button', { name: '暂缓此知识点', exact: true })).toHaveCount(0);
  93  |   const route = (await (await page.request.get('/api/v1/learning/route')).json()).data;
  94  |   expect(route.outcome).toBe('PAUSED_PREREQUISITE');
  95  |   expect(route.next).toBeNull();
  96  |   expect((await (await page.request.get('/api/v1/knowledge/recommendation')).json()).data.point).toBeNull();
  97  |   await panel.screenshot({ path: fileURLToPath(new URL('defer-detail-desktop.png', evidence)), animations: 'disabled' });
  98  |   await panel.locator('a[href="/knowledge/JS-01"]').first().click();
  99  |   await page.getByRole('button', { name: '恢复学习', exact: true }).click();
  100 |   await expect(panel).toContainText('补齐基础 · JS-01');
  101 |   await page.goBack();
  102 |   await expect(panel).toContainText('补齐基础 · JS-01');
  103 |   await expect(page.getByRole('button', { name: '暂缓此知识点', exact: true })).toBeVisible();
  104 |   await writeFile(new URL('defer-pages.json', evidence), JSON.stringify({ time: new Date().toISOString(), browser: browser.version(), viewport: page.viewportSize(), url: page.url(), checks: ['详情暂缓立即显示 PAUSED_PREREQUISITE', '旧推荐与分支均无下一步', '恢复单点后返回推荐一致'] }, null, 2));
  105 | });
  106 | 
```
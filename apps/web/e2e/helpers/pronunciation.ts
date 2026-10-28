import { expect, type Page } from '@playwright/test';

/** 校验每篇的全部术语，避免新增批次时复制整段 DOM 断言。 */
export async function expectMaterialPronunciations(page: Page, materialPath: string) {
  await page.goto(materialPath);
  await expect(page.locator('.markdown-body[data-pronunciations="ready"]')).toBeVisible();
  const buttons = page.locator('.pronunciation-button');
  expect(await buttons.count(), materialPath).toBeGreaterThan(0);
  await expect(page.locator('pre .pronunciation-button')).toHaveCount(0);
  const coverage = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.markdown-body')!;
    const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
    const expected = Array.from(root.querySelectorAll<HTMLElement>('strong')).flatMap((strong) => {
      const copy = strong.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('.pronunciation-button').forEach((button) => button.remove());
      const value = copy.textContent?.trim().replace(/\s+/g, ' ') ?? '';
      const parenthetical = Array.from(value.matchAll(/[（(]([A-Za-z][A-Za-z0-9.' -]*)[）)]/g), (match) => match[1]);
      return parenthetical.length ? parenthetical : /^[A-Za-z][A-Za-z0-9.' -]*$/.test(value) ? [value] : [];
    }).map(normalize).sort();
    const actual = Array.from(root.querySelectorAll<HTMLButtonElement>('.pronunciation-button'))
      .map((button) => normalize(button.dataset.pronunciationTerm ?? ''))
      .sort();
    return { expected, actual };
  });
  expect(coverage.actual, materialPath).toEqual(coverage.expected);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), materialPath).toBe(true);
}

/** 播放检查依赖当前有效按钮；术语的完整覆盖由上面的断言保证。 */
export async function playFirstPronunciation(page: Page, batch: string) {
  await expect(page.locator('.markdown-body[data-pronunciations="ready"]')).toBeVisible();
  const button = page.locator('.pronunciation-button').first();
  await expect(button).toHaveAttribute('aria-label', /^播放“.+”的美式发音$/);
  const response = page.waitForResponse(value => new RegExp('/pronunciation/' + batch + '/[a-f0-9]+\\.wav$').test(value.url()));
  await button.click();
  expect([200, 206]).toContain((await response).status());
}

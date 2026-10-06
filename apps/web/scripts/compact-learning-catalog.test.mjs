import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compactLearningCatalogs, catalogDecoderSource } from './compact-learning-catalog.ts';
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;

test('production modules preserve every catalog field, concept and relationship', async () => {
  const root = new URL('../../../docs/knowledge/materials/', import.meta.url);
  const plugin = compactLearningCatalogs();
  for (const name of (await readdir(root)).filter(name => /^b\d{2}\.json$/.test(name))) {
    const path = fileURLToPath(new URL(name, root));
    const expected = JSON.parse(await readFile(path, 'utf8'));
    const transformed = await plugin.transform('', path);
    const actual = await import(moduleUrl(transformed.code.replace("'virtual:learning-catalog-decoder'", JSON.stringify(moduleUrl(catalogDecoderSource)))));
    assert.deepEqual(actual.default, expected, name);
    assert.deepEqual(actual.chapters, expected.chapters, `${name} named export`);
  }
  assert.equal(await plugin.transform('{}', '/other/data.json'), undefined);
});

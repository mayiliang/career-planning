import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';

// JSON remains the editable source. Only production modules omit repeated field names.
const fields = [
  ['schemaVersion', 'batch', 'title', 'reviewedOn', 'chapters'],
  ['id', 'guide', 'anchor', 'title', 'question', 'summary', 'outcomes', 'prerequisites', 'concepts', 'connections'],
  ['id', 'heading'],
  ['concept', 'reason'],
];
const children: Record<string, number> = { chapters: 1, concepts: 2, connections: 3 };
const decoderId = 'virtual:learning-catalog-decoder';
const resolvedDecoderId = `\0${decoderId}`;

function pack(value: Record<string, unknown>, level = 0): unknown[] {
  const columns = fields[level]!;
  if (Object.keys(value).length !== columns.length || columns.some(key => !Object.hasOwn(value, key))) {
    throw new Error('学习目录字段发生变化，请同步构建编码规则；不能丢弃未知字段。');
  }
  return columns.map(key => {
    const childLevel = children[key];
    return childLevel === undefined ? value[key]
      : (value[key] as Record<string, unknown>[]).map(child => pack(child, childLevel));
  });
}

export const catalogDecoderSource = `
const fields = ${JSON.stringify(fields)};
const children = ${JSON.stringify(children)};
export function unpack(row, level = 0) {
  return Object.fromEntries(fields[level].map((key, index) => [key,
    children[key] === undefined ? row[index] : row[index].map(child => unpack(child, children[key]))
  ]));
}`;

export function compactLearningCatalogs(): Plugin {
  return {
    name: 'compact-learning-catalogs',
    apply: 'build',
    enforce: 'post',
    resolveId(id) { if (id === decoderId) return resolvedDecoderId; },
    load(id) { if (id === resolvedDecoderId) return catalogDecoderSource; },
    async transform(_code, id) {
      if (!/\/docs\/knowledge\/materials\/b\d{2}\.json$/.test(id.replaceAll('\\', '/'))) return;
      const data = JSON.parse(await readFile(id, 'utf8')) as Record<string, unknown>;
      return {
        code: `import { unpack } from '${decoderId}';
const data = unpack(${JSON.stringify(pack(data))});
export const { schemaVersion, batch, title, reviewedOn, chapters } = data;
export default data;`,
        map: null,
      };
    },
  };
}

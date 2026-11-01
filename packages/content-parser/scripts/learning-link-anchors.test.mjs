import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectHeadingAnchors, extractLinks } from './learning-link-anchors.mjs';

test('站内讲义接受阅读器支持的知识编码，普通文档仍要求标题锚点', () => {
  const text = '# WEB-01：页面基础\n## 重复\n## 重复';
  assert.equal(collectHeadingAnchors(text, true).has('web-01'), true);
  assert.equal(collectHeadingAnchors(text).has('web-01'), false);
  assert.equal(collectHeadingAnchors(text, true).has('web-99'), false);
  assert.equal(collectHeadingAnchors(text).has('重复-1'), true);
});
test('围栏中的示例标题不能伪造有效锚点', () => {
  const text = '```md\n# JS-99 假标题\n```\n~~~\n# 假标题\n~~~\n# JS-04 真实标题';
  const anchors = collectHeadingAnchors(text, true);
  assert.equal(anchors.has('js-99'), false);
  assert.equal(anchors.has('假标题'), false);
  assert.equal(anchors.has('js-04'), true);
});

test('只检查真正的 Markdown 链接，保留引用链接并排除代码调用', () => {
  assert.deepEqual(extractLinks('`tasks[index](signal)`\n```js\ntasks[index](signal)\n```\n[正文](./guide.md#js-04)\n[引用][source]\n\n[source]: https://example.com'), ['./guide.md#js-04', 'https://example.com']);
});

import { unified } from 'unified';
import remarkParse from 'remark-parse';

export function normalizeGithubAnchor(value) {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function collectHeadingAnchors(markdown, materialCodes = false) {
  const counts = new Map();
  const anchors = new Set();
  let fence = null;
  for (const line of markdown.split(/\r?\n/)) {
    const delimiter = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (delimiter && !fence) { fence = delimiter; continue; }
    if (fence) {
      if (delimiter?.[0] === fence[0] && delimiter.length >= fence.length) fence = null;
      continue;
    }
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    if (materialCodes) {
      const code = /\b[A-Z][A-Z0-9]*-\d+\b/i.exec(match[2])?.[0];
      if (code) anchors.add(code.toLowerCase());
    }
    const base = normalizeGithubAnchor(match[2]);
    if (!base) continue;
    const duplicateIndex = counts.get(base) ?? 0;
    counts.set(base, duplicateIndex + 1);
    anchors.add(duplicateIndex === 0 ? base : `${base}-${duplicateIndex}`);
  }
  return anchors;
}

export function extractLinks(markdown) {
  const tree = unified().use(remarkParse).parse(markdown);
  const links = [];
  const definitions = new Map();
  function visit(node, callback) {
    callback(node);
    for (const child of node.children ?? []) visit(child, callback);
  }
  visit(tree, node => { if (node.type === 'definition') definitions.set(node.identifier, node.url); });
  visit(tree, node => {
    if (node.type === 'link') links.push(node.url);
    if (node.type === 'linkReference' && definitions.has(node.identifier)) links.push(definitions.get(node.identifier));
  });
  return links;
}

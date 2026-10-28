import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBuiltin } from 'node:module';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const workspaces = ['apps/web', 'apps/server', 'packages/shared', 'packages/content-parser'];
const entries = new Map([
  ['@career-atlas/shared', 'packages/shared/src/index.ts'],
  ['@career-atlas/content-parser', 'packages/content-parser/src/index.ts'],
]);
const failures = new Set();
const graph = new Map();
const normalize = value => value.split(path.sep).join('/');
const relative = value => normalize(path.relative(root, value));
const owner = file => workspaces.find(workspace => file.startsWith(`${workspace}/`));

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.(?:ts|tsx|vue)$/.test(file) && !/\.(?:test|d)\.ts$/.test(file) ? [file] : [];
  });
}

function dependencies(file) {
  let source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.vue')) source = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const result = [];
  const add = (specifier, typeOnly = false) => {
    if (specifier && ts.isStringLiteral(specifier)) result.push({ specifier: specifier.text, typeOnly });
  };
  const visit = node => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const namedTypesOnly = bindings && ts.isNamedImports(bindings) && !clause.name && bindings.elements.length > 0 && bindings.elements.every(element => element.isTypeOnly);
      add(node.moduleSpecifier, Boolean(clause?.isTypeOnly || namedTypesOnly));
    }
    if (ts.isExportDeclaration(node)) {
      const clause = node.exportClause;
      const namedTypesOnly = clause && ts.isNamedExports(clause) && clause.elements.length > 0 && clause.elements.every(element => element.isTypeOnly);
      add(node.moduleSpecifier, Boolean(node.isTypeOnly || namedTypesOnly));
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0]);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal, true);
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return result;
}

function resolveImport(file, specifier) {
  const packageEntry = entries.get(specifier);
  const workspace = owner(relative(file));
  const clean = specifier.split('?')[0];
  const base = packageEntry ? path.join(root, packageEntry)
    : clean.startsWith('@/') ? path.join(root, workspace, 'src', clean.slice(2))
      : clean.startsWith('.') ? path.resolve(path.dirname(file), clean) : null;
  if (!base) return null;
  const candidates = [base, base.replace(/\.js$/, '.ts'), ...['.ts', '.tsx', '.vue', '.js', '.d.ts'].map(extension => base + extension), path.join(base, 'index.ts')];
  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!resolved) failures.add(`无法解析本地依赖：${relative(file)} -> ${specifier}`);
  return resolved;
}

function checkBoundary(from, to) {
  const fromOwner = owner(from);
  const toOwner = owner(to);
  if (!toOwner) return; // Markdown、JSON、图片等内容真源允许跨工作区引用。
  const allowed = fromOwner === toOwner
    || fromOwner === 'apps/server' && toOwner.startsWith('packages/')
    || fromOwner === 'apps/web' && toOwner === 'packages/shared';
  if (!allowed) failures.add(`工作区依赖方向错误：${from} -> ${to}`);
  if (from.startsWith('apps/server/src/services/') && to.startsWith('apps/server/src/http/')) failures.add(`服务层不能依赖 HTTP 层：${from} -> ${to}`);
  if (/^apps\/server\/src\/(?:db|config)\//.test(from) && /^apps\/server\/src\/(?:services|http)\//.test(to)) failures.add(`基础设施不能依赖业务层：${from} -> ${to}`);
  if (from.startsWith('apps/web/src/api/') && /^apps\/web\/src\/(?:features|components|app|router)\//.test(to)) failures.add(`API 层不能依赖页面层：${from} -> ${to}`);
  if (from.startsWith('apps/web/src/api/modules/') && to === 'apps/web/src/api/client.ts') failures.add(`业务 API 不能反向引用聚合入口：${from}`);
}

const files = workspaces.flatMap(workspace => sourceFiles(path.join(root, workspace, 'src')));
for (const file of files) {
  const from = relative(file);
  const edges = [];
  for (const { specifier, typeOnly } of dependencies(file)) {
    if ((from.startsWith('apps/web/') || from.startsWith('packages/shared/')) && isBuiltin(specifier)) failures.add(`浏览器或共享包不能引用 Node 专属模块：${from} -> ${specifier}`);
    const resolved = resolveImport(file, specifier);
    if (!resolved) continue;
    const to = relative(resolved);
    checkBoundary(from, to);
    if (!typeOnly) edges.push(to);
  }
  graph.set(from, edges);
}

const visited = new Set();
const active = new Set();
function visit(file, chain = []) {
  if (active.has(file)) {
    failures.add(`循环依赖：${[...chain.slice(chain.indexOf(file)), file].join(' -> ')}`);
    return;
  }
  if (visited.has(file)) return;
  active.add(file);
  for (const target of graph.get(file) ?? []) visit(target, [...chain, file]);
  active.delete(file);
  visited.add(file);
}
for (const file of graph.keys()) visit(file);

if (failures.size) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`模块边界检查通过：${files.length} 个源文件，无循环依赖或分层越界。`);
}

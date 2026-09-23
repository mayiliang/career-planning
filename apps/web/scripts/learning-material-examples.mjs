import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../../../', import.meta.url);
export const guideRoot = new URL('docs/knowledge/chinese-guides/', root);
export const catalogUrl = new URL('docs/knowledge/materials/b01.json', root);

export async function readB01Examples() {
  return readMaterialExamples();
}

export async function readMaterialExamples(batch = 'b01') {
  if (!/^b\d{2}$/.test(batch)) throw new Error('无效资料批次');
  const catalog = JSON.parse(await readFile(new URL(`docs/knowledge/materials/${batch}.json`, root), 'utf8'));
  const examples = new Map();
  for (const chapter of catalog.chapters) {
    const markdown = await readFile(new URL(chapter.guide, guideRoot), 'utf8');
    for (const match of markdown.matchAll(/^```(js|javascript|jsx|ts|typescript|tsx|vue|html|powershell|bash|json|css|yaml|dockerfile|nginx)(?=[\s])([^\n]*)\n([\s\S]*?)^```\s*$/gm)) {
      // 配置与页面中的说明片段可不登记；带标识的内容从正文统一提取。
      if (['jsx', 'tsx', 'vue', 'html', 'bash', 'json', 'css', 'yaml', 'dockerfile', 'nginx'].includes(match[1]) && !match[2].includes('example=')) continue;
      const metadata = match[2].trim().match(/^example=([a-z0-9-]+)(?: runtime=(browser|project))?(?: file=([a-zA-Z0-9][a-zA-Z0-9_./-]*))?$/);
      if (!metadata) throw new Error(`${chapter.id} 的代码示例缺少有效 example 标识`);
      const [, id, declaredRuntime, file] = metadata;
      const language = ({ javascript: 'js', typescript: 'ts' })[match[1]] ?? match[1];
      const runtime = declaredRuntime ?? (['jsx', 'tsx', 'vue', 'html'].includes(language) ? 'project' : 'universal');
      // Shell 片段只登记来源；不得作为通用 JavaScript 执行或自动在读者仓库运行。
      if (['powershell', 'bash'].includes(language) && runtime !== 'project') throw new Error(`${id} 的 Shell 示例须声明 project`);
      if (['json', 'css', 'yaml', 'dockerfile', 'nginx'].includes(language) && runtime !== 'project') throw new Error(`${id} 的配置或样式示例须声明 project`);
      const expected = [...match[3].matchAll(/\/\/ => (.*)$/gm)].map((item) => item[1].trim());
      if (file && (file.split('/').some((part) => !part || part === '.' || part === '..'))) throw new Error(`${id} 的文件路径无效`);
      if (runtime === 'project') {
        if (examples.has(id)) throw new Error(`示例标识重复：${id}`);
        examples.set(id, { id, guide: chapter.guide, language, runtime, file, code: match[3], expected });
      } else if (file) {
        if (!/^[a-z0-9-]+\.mjs$/.test(file)) throw new Error(`${id} 的模块文件名无效`);
        if (runtime !== 'browser' || language !== 'js') throw new Error(`${id} 的多文件模块须声明浏览器 JavaScript`);
        if (!examples.has(id)) examples.set(id, { id, guide: chapter.guide, language, runtime, files: [], expected: [] });
        const example = examples.get(id);
        if (!example.files || example.guide !== chapter.guide || example.files.some((item) => item.name === file)) throw new Error(`${id} 的示例或文件重复`);
        example.files.push({ name: file, code: match[3] });
        example.expected.push(...expected);
      } else {
        if (examples.has(id)) throw new Error(`示例标识重复：${id}`);
        examples.set(id, { id, guide: chapter.guide, language, runtime, code: match[3], expected });
      }
    }
  }
  for (const example of examples.values()) {
    if (example.runtime !== 'project' && !example.expected.length) throw new Error(`${example.id} 没有标注可核对的输出`);
    if (example.files && !example.files.some(({ name }) => name === 'main.mjs')) throw new Error(`${example.id} 缺少 main.mjs 入口`);
  }
  return [...examples.values()];
}

// 从正文检查真实的 TypeScript 示例，再转换给原有输出核对流程；不维护第二份例子。
export async function prepareMaterialExamples(examples) {
  const typed = examples.filter(({ language, runtime }) => language === 'ts' && runtime !== 'project');
  if (!typed.length) return examples;
  const { default: ts } = await import('typescript');
  const options = {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
    noEmit: true, types: [], lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], skipLibCheck: true,
  };
  const normalized = (path) => path.replace(/\\/g, '/');
  const sources = new Map(typed.map((example) => [
    normalized(fileURLToPath(new URL(`__material-examples__/${example.id}.ts`, guideRoot))),
    `export {};\n${example.code}`,
  ]));
  const host = ts.createCompilerHost(options);
  const readSource = host.getSourceFile.bind(host);
  host.getSourceFile = (file, languageVersion, ...rest) => sources.has(normalized(file))
    ? ts.createSourceFile(file, sources.get(normalized(file)), languageVersion, true)
    : readSource(file, languageVersion, ...rest);
  const program = ts.createProgram([...sources.keys()], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(), getCanonicalFileName: (name) => name, getNewLine: () => '\n',
    }));
  }
  console.log(`TypeScript ${ts.version}：${typed.length} 个正文示例的严格类型检查通过，预期错误注释有效。`);
  return examples.map((example) => example.language === 'ts' && example.runtime !== 'project'
    ? { ...example, code: ts.transpileModule(example.code, { compilerOptions: { target: options.target, module: options.module, alwaysStrict: true } }).outputText }
    : example);
}

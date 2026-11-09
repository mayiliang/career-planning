import { pilotNode, frameworkEntry, assessmentContractVersion } from '@career-atlas/shared';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectRoot } from '../config/index.js';
import { extractMaterialHeadings } from './knowledge-material.service.js';

// 按已审读的任务—机制关系选择整个三级小节，不按词频猜测，不切开示例。
const mechanisms: Record<string, string[]> = {
  'JS-04': ['先区分现在调用和以后回调', 'Promise 的执行器现在就会运行', '状态已决定和结果已到手不是同一件事', '链上的返回值决定下一步收到什么', '用调用栈任务和微任务推演顺序', 'await 暂停的是当前异步函数', '微任务执行完不等于浏览器已经绘制', '并发从启动动作开始', '组合 Promise 不会自动取消工作', '限制并发需要推迟启动'],
  'JS-05': ['调用方等待的究竟是哪一件事', 'return 和 return await 的区别出现在错误边界内', 'catch 的位置决定它能处理哪些失败', '错误要保留原因也要补上当前语境', 'HTTP 失败和 Promise 拒绝需要分别判断', '两种 finally 的返回值不要混在一起', '一组工作需要先约定怎样算完成', '可取消的等待需要处理开始前和结束后的情况', '把领取取消和结果槽位放进同一个协议', '取消之后仍要判断结果是否过期', '新请求开始后旧请求的清理也可能过期', '区分取消与需要告知用户的失败', '重试前先问上一次可能已经做成了吗', '超时结束等待并不代表远端撤销'],
};
const frameworkMechanisms: Record<string, string[]> = {
  "REACT-01": [
    "学习前先确认",
    "建立可复现的练习工程",
    "组件先返回一份界面描述",
    "一次更新分成触发计算和提交",
    "三次加一先看它们实际提交了什么",
    "快照属于一次渲染而不是整个组件",
    "替换值与更新函数可以按顺序混合",
    "批处理不会把不同用户操作变成一次事务",
    "用手动释放回调固定观察顺序",
    "纯渲染允许 React 重新计算",
    "用相同输入复现纯度错误",
    "Strict Mode 的额外调用不是额外点击"
  ],
  "VUE-01": [
    "学习前先确认",
    "建立可复现的练习工程",
    "沿三个文件找到页面入口",
    "SFC 把同一组件的代码放在一起",
    "模块执行一次与每个实例执行不是一回事",
    "Vite 开发与生产使用同一份源码但处理方式不同",
    "目录随职责增长不必一开始就铺满层级",
    "别名需要让构建工具和类型工具指向同一处",
    "环境变量进入客户端以后就是公开配置",
    "Scoped CSS 限制选择器不隔离整个世界",
    "固定入口练习与单变量排错",
    "类型检查和构建各自回答不同问题"
  ]
};
export function buildAsyncPilotContext(code: string, studyMaterialMd: string, budget = 24_000) {
  const node = pilotNode(code) ?? frameworkEntry(code);
  const required = mechanisms[code] ?? frameworkMechanisms[code];
  if (!node || !required) return null;
  const sections: Array<{ title: string; source: string; content: string; truncated: boolean }> = [];
  const omitted: Array<{ title: string; reason: string }> = [];
  let used = 0;
  let lines: string[] = [];
  if (!studyMaterialMd.includes(`../chinese-guides/${node.guide}#${node.anchor}`)) {
    omitted.push({ title: code, reason: '任务没有链接已审读的主讲义' });
  } else {
    try { lines = readFileSync(resolve(projectRoot, 'docs/knowledge/chinese-guides', node.guide), 'utf8').split(/\r?\n/); }
    catch { omitted.push({ title: code, reason: '主讲义不可读取' }); }
  }
  const headings = extractMaterialHeadings(lines);
  for (const title of required) {
    const index = headings.findIndex(heading => heading.level === 3 && heading.title === title);
    const heading = headings[index];
    if (!heading) { omitted.push({ title, reason: '必需机制小节缺失' }); continue; }
    const end = headings.slice(index + 1).find(next => next.level <= 3)?.line ?? lines.length;
    const content = lines.slice(heading.line, end).join('\n').trim();
    const anchor = title.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');
    const source = `${node.guide}#${anchor}`;
    const cost = content.length + title.length + source.length;
    if (used + cost > budget) { omitted.push({ title, reason: '完整小节超过剩余预算，未发送片段' }); continue; }
    used += cost;
    sections.push({ title, source, content, truncated: false });
  }
  return { contractVersion: assessmentContractVersion(code), budget, used, sections, omitted, complete: omitted.length === 0,
    scope: '仅覆盖当前版本已审读的任务机制；外链为参考元数据，未作为已发送正文。' };
}

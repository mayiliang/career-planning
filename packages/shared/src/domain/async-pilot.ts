/** 异步链试点的唯一导航与前置定义。短文没有知识点身份。 */
export const ASYNC_PILOT_VERSION = 'async-v2';
export type PilotNode = {
  code: string; title: string; kind: 'POINT' | 'READING'; guide: string; anchor: string;
  prerequisites: readonly string[]; reason: string;
};
export const ASYNC_PILOT_NODES: readonly PilotNode[] = [
  { code: 'PREJS-04', title: '定时器与稍后回调', kind: 'READING', guide: 'javascript-scheduled-callbacks.md', anchor: 'prejs-04', prerequisites: [], reason: '先区分调用函数和交给别人稍后调用。' },
  { code: 'JS-01', title: '作用域与闭包', kind: 'POINT', guide: 'js-01-execution-context-scope-closure.md', anchor: 'js-01', prerequisites: [], reason: '异步回调仍按普通函数规则查找变量。' },
  { code: 'PREJS-07', title: 'Promise 与 await 入门', kind: 'READING', guide: 'javascript-promises-and-cancellation.md', anchor: 'prejs-07', prerequisites: ['PREJS-04'], reason: '先能等待结果，再解释结果链和恢复时机。' },
  { code: 'JS-04', title: 'Promise 与事件循环', kind: 'POINT', guide: 'js-04-async-promise-browser-event-loop.md', anchor: 'js-04', prerequisites: ['PREJS-07', 'JS-01'], reason: '理解结果链、执行顺序、启动与等待。' },
  { code: 'JS-05', title: '异步错误与控制流', kind: 'POINT', guide: 'js-05-promise-errors-async-control-flow.md', anchor: 'js-05', prerequisites: ['JS-04'], reason: '在启动与等待之上学习错误、取消、清理和旧结果。' },
];
export const ASYNC_PILOT_CHAIN = ['PREJS-07', 'JS-04', 'JS-05'] as const;
export function pilotNode(code: string) { return ASYNC_PILOT_NODES.find(node => node.code === code); }
export function pilotMaterialHref(node: PilotNode) { return `/knowledge/materials/${node.guide}/${node.anchor}`; }
export function practiceActivityId(code: string) { return ['JS-04', 'JS-05'].includes(code) ? `strict-practice@${ASYNC_PILOT_VERSION}` : 'strict-practice'; }
export type PilotState = 'NOT_STARTED' | 'LEARNING' | 'LEARNED' | 'DEFERRED';

/** 只返回建议，不写状态；已学完的点不再递归要求补读其基础。 */
export function planAsyncPilot(states: ReadonlyMap<string, PilotState>, read: ReadonlySet<string>, current?: string) {
  const target = current && ['JS-04', 'JS-05'].includes(current) && states.get(current) !== 'LEARNED'
    ? current : ['JS-04', 'JS-05'].find(code => states.get(code) !== 'LEARNED');
  if (!target) return { target: null, prerequisites: [], reason: '异步链已学完，可按需要回看或验证掌握程度。' };
  const pending: string[] = [];
  function visit(code: string) {
    const node = pilotNode(code)!;
    if (node.kind === 'POINT' ? states.get(code) === 'LEARNED' : read.has(code)) return;
    node.prerequisites.forEach(visit);
    if (code !== target && !pending.includes(code)) pending.push(code);
  }
  visit(target);
  const deferred = [target, ...pending].filter(code => states.get(code) === 'DEFERRED');
  return {
    target, prerequisites: pending,
    reason: deferred.length ? `${deferred.join('、')} 已暂缓；依赖仍未满足，可查看基础或自行恢复，系统保留你的选择。`
      : pending.length ? `学习 ${target} 前建议补齐下列基础；阅读记录只表示查阅情况，不等于掌握。`
        : states.get(target) === 'LEARNING' ? `继续正在学习的 ${target}；当前学习点由你决定。`
          : `${target} 的已记录前置已满足，可进入本篇；熟悉的内容无需重学。`,
  };
}

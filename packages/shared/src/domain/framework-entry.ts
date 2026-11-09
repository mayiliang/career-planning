/** 两个框架入口的已审读合同；不表示必须同时学习两个框架。 */
export const FRAMEWORK_ENTRY_VERSION = 'framework-entry-v2';
export const FRAMEWORK_ENTRY_NODES = [
  { code: 'REACT-01', guide: 'react-01-render-purity-state-snapshot.md', anchor: 'react-01', prerequisites: ["JS-01", "JS-03", "WEB-01"] },
  { code: 'VUE-01', guide: 'vue-01-vite-sfc-project-structure.md', anchor: 'vue-01', prerequisites: ["WEB-01"] },
 ] as const;
export function frameworkEntry(code: string) { return FRAMEWORK_ENTRY_NODES.find(node => node.code === code); }
export function assessmentContractVersion(code: string) {
  return frameworkEntry(code) ? FRAMEWORK_ENTRY_VERSION : ['JS-04', 'JS-05'].includes(code) ? 'async-v2' : null;
}

export const FRAMEWORK_PREREQUISITE_REASONS: Readonly<Record<string, string>> = {
  'JS-01': '闭包与局部绑定：解释回调为何保留创建时的状态。',
  'JS-03': '对象共享与不可变更新：识别渲染修改输入造成的污染。',
  'JS-06': '模块导入与求值：追踪入口、组件和共享模块的关系。',
  'WEB-01': 'HTML、按钮和挂载容器：读懂最终页面与用户事件。',
};

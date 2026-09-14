# Vue 知识点讲义

## VUE-10 组件测试、性能与生产构建

保存失败后，输入还在不在？筛选变慢，是计算还是 DOM 太多？开发页面没问题，为什么部署到子目录就白屏？这三类问题需要不同证据：组件行为、性能记录和真实构建产物。

本篇用一个可控制结果的保存表单讲清如何验证行为，再把观察延伸到更新成本和发布。重点是为关键问题选择足够的检查，不是给每个实现细节都配一套测试。

### 学习前先确认

- 直接前置：[VUE-07 Vue Router、类型化/文件路由与导航边界](../chinese-guides/vue-07-router-navigation-boundaries.md#vue-07)。理解页面、导航和数据的关系以后，再检查它们如何组合。

正文组件使用 Vue 3 + TypeScript；测试示例使用 Vitest、Vue Test Utils 和 jsdom。jsdom 模拟 DOM，不负责真实布局；浏览器性能与部署需要另外观察。

### 先说清要保护哪一种结果

**component testing** 从组件公开输入和交互检查结果；**end-to-end testing** 跨过浏览器、页面和服务边界。两者都不应为了“测得全面”去反复证明同一个简单事实。

| 当前问题 | 最直接的证据 | 不必顺便承担的工作 |
| --- | --- | --- |
| 标题解析是否接受空格 | 纯函数输入与输出 | 启动整个站点 |
| 保存失败是否保留草稿 | 组件输入、失败结果、可见文字 | 读取组件私有 ref |
| 深链刷新后是否白屏 | 构建后的页面与服务器响应 | 所有页面做截图回归 |
| 一万行滚动是否卡顿 | 目标桌面浏览器的性能轨迹 | 用 jsdom 给出帧率 |

一次缺陷修复通常只需要能重现该错误的最小检查。覆盖率可以提示未执行的路径，但不会证明断言有意义；反过来，少量聚焦的测试也不能被包装成“整个系统都正确”。

### 一个保存表单先把公开合同写完整

合同是：标题至少两个字符；保存期间不能再次提交；失败保留草稿；成功向父层报告服务返回的标题。创建 `src/TitleForm.vue`：

```vue example=vue10-title-form runtime=project file=src/TitleForm.vue
<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps<{ save: (title: string) => Promise<string> }>();
const emit = defineEmits<{ saved: [title: string] }>();
const draft = ref('');
const pending = ref(false);
const error = ref('');
const message = ref('');
async function submit() {
  if (pending.value) return;
  error.value = ''; message.value = '';
  const title = draft.value.trim();
  if (title.length < 2) { error.value = '标题至少两个字符'; return; }
  pending.value = true;
  try {
    const saved = await props.save(title);
    draft.value = saved;
    message.value = '保存完成';
    emit('saved', saved);
  } catch { error.value = '保存失败，草稿仍保留，可以重试'; }
  finally { pending.value = false; }
}
</script>
<template>
  <form @submit.prevent="submit">
    <label>资料标题 <input v-model="draft" :disabled="pending" aria-describedby="title-feedback" :aria-invalid="error ? 'true' : 'false'"></label>
    <button :disabled="pending">{{ pending ? '正在保存' : '保存标题' }}</button>
    <div id="title-feedback"><p v-if="error" role="alert">{{ error }}</p><p v-if="message" role="status">{{ message }}</p></div>
  </form>
</template>
```

这个单实例演示固定了反馈 ID；在同一页放多个表单时，应给每个实例生成独立 ID。若组件可能在保存期间切换账号或卸载，还要为任务补上相应取消、失效和结果归属，不能只依赖按钮禁用。

### 手动交付结果比随机等网络更容易理解

把下面作为 `src/App.vue`，保留普通 Vue 入口。两个交付按钮控制模拟 Promise；保存动作本身不会发网络请求。

```vue example=vue10-save-app runtime=project file=src/App.vue
<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import TitleForm from './TitleForm.vue';
const saved = ref('尚未保存');
const delivery = shallowRef<{ resolve: () => void; reject: () => void } | null>(null);
function save(title: string): Promise<string> {
  return new Promise((resolve, reject) => {
    delivery.value = {
      resolve: () => { delivery.value = null; resolve(title); },
      reject: () => { delivery.value = null; reject(new Error('模拟失败')); },
    };
  });
}
</script>
<template>
  <main>
    <TitleForm :save="save" @saved="saved = $event" />
    <button :disabled="!delivery" @click="delivery?.resolve()">交付成功</button>
    <button :disabled="!delivery" @click="delivery?.reject()">交付失败</button>
    <p>父层收到：{{ saved }}</p>
  </main>
</template>
```

输入一个字再提交，只出现校验反馈，不会启动保存。输入“组件协作”后提交，按钮等待；交付失败，输入仍在；再次提交并交付成功，父层才显示收到的标题。

这组操作把三件事分开了：触发提交、外部任务完成、Vue 更新 DOM。若把它们都藏进固定的一秒等待，读者就看不到真正的依赖关系。

### 两个行为测试就能保护关键约定

在演示项目安装 Vitest、Vue Test Utils、jsdom 与 @vitejs/plugin-vue。创建根目录 `vitest.config.ts`，让测试也使用 Vue SFC 编译：

```ts example=vue10-test-config runtime=project file=vitest.config.ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
export default defineConfig({ plugins: [vue()], test: { environment: 'jsdom' } });
```

创建 `src/TitleForm.spec.ts`，运行 `npx vitest run src/TitleForm.spec.ts`。用例只观察 DOM、传给外部函数的值和公开事件，不依赖内部变量名。

```ts example=vue10-form-tests runtime=project file=src/TitleForm.spec.ts
import { describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import TitleForm from './TitleForm.vue';
describe('标题保存', () => {
  it('非法标题不调用保存', async () => {
    const save = vi.fn(async (title: string) => title);
    const wrapper = mount(TitleForm, { props: { save } });
    try {
      await wrapper.get('input').setValue('短');
      await wrapper.get('form').trigger('submit');
      expect(wrapper.get('[role="alert"]').text()).toBe('标题至少两个字符');
      expect(save).not.toHaveBeenCalled();
    } finally { wrapper.unmount(); }
  });
  it('失败后保留草稿，重试成功才发出结果', async () => {
    let rejectFirst!: (reason: Error) => void;
    const first = new Promise<string>((_, reject) => { rejectFirst = reject; });
    const save = vi.fn<(title: string) => Promise<string>>()
      .mockImplementationOnce(() => first).mockResolvedValueOnce('组件协作');
    const wrapper = mount(TitleForm, { props: { save } });
    try {
      await wrapper.get('input').setValue(' 组件协作 ');
      await wrapper.get('form').trigger('submit');
      expect(wrapper.get('button').attributes('disabled')).toBeDefined();
      expect(save).toHaveBeenCalledWith('组件协作');
      rejectFirst(new Error('模拟失败'));
      await flushPromises();
      expect(wrapper.get('input').element.value).toBe(' 组件协作 ');
      expect(wrapper.get('[role="alert"]').text()).toContain('草稿仍保留');
      expect(wrapper.emitted('saved')).toBeUndefined();
      await wrapper.get('form').trigger('submit');
      await flushPromises();
      expect(wrapper.emitted('saved')).toEqual([['组件协作']]);
      expect(wrapper.get('[role="status"]').text()).toBe('保存完成');
    } finally { wrapper.unmount(); }
  });
});
```

trigger 和 setValue 等待 Vue 的更新；手动 reject 决定业务异步何时完成，flushPromises 让已能推进的 Promise 回调继续运行。它不会替你结束尚未交付的请求，也不负责推进所有计时器。

这里先让组件安装失败处理，再拒绝 Promise，避免在测试安排阶段产生无主的 rejection。finally 卸载实例，让一个失败断言也不会留下组件干扰后续用例。

### 替身只能证明它实际参与的部分

上面的 save 替身证明组件会怎么处理结果，不证明服务器真的保存过。若要检查状态码、序列化或 cookie，应把观察移到 HTTP 或服务边界，而不是再给这个替身增加无关断言。

Testing Pinia 可以把 actions 替换为空实现；“组件调用了 action”与“真实 action 更新了状态”是不同结论。需要后者时使用真实 Pinia 或明确关闭 stub，见 [Pinia 观察与动作](../chinese-guides/vue-08-pinia-state-layers.md#patch-订阅与动作观察各自解决不同问题)。

网络竞态使用可控制结果顺序的请求，debounce 使用可控制的时钟。截图、字体和动画也需要稳定输入。自动重试可以留下调查线索，但不能把第一次失败从报告中抹掉。

### Vue 性能先看变化传播到了哪里

假设有一千个条目，当前选中 ID 从 a 变为 b。给每个子组件传 activeId，所有子组件都会收到一个变化的 prop；在父层计算布尔 active，则通常只有 a 与 b 的 active 变化。

这与 React 的引用问题相关，但 Vue 和 React 的更新机制并不相同。子组件自己读取的响应式来源、slots 和其他依赖也会影响更新，不能简化为“props 没变就永不更新”。

computed 应保持纯计算；如果每次返回新对象，即使字段相同，也可能失去值稳定带来的收益。大数组的浅层响应式可以减少代理开销，但嵌套值按不可变方式替换的责任仍在调用者，见 [Vue 响应式边界](../chinese-guides/vue-02-ref-reactive-computed-boundaries.md#vue-02)。

### 缓存和窗口化都有不适用的时候

v-once 表示不再更新那部分结果，只适合确实固定的内容。v-memo 的依赖若漏掉标题，标题变化也可能被跳过；它不是给任意列表贴上的加速标签。

列表慢时先区分筛选计算、组件执行和 DOM 布局。分页或虚拟化能减少节点，但会影响焦点、读屏、浏览器查找与打印。固定行高例子及其限制见 [React 大列表](../chinese-guides/react-07-performance-memo-large-lists.md#用固定高度窗口观察节点数量)，算法思路可以对照，框架代码不用照搬。

性能记录使用目标桌面浏览器与同一动作。重复进出复杂页面还应观察内存是否趋于稳定。没有测到瓶颈时，不必为了少一次更新引入难以维护的缓存。

### 构建把模块变成可以请求的文件

**code splitting** 把按需模块放进独立产物，**source map** 把产物位置映射回源码。构建工具转换 TypeScript 并不等于完成严格类型检查，Vue 项目通常还要运行 vue-tsc。

开发环境的模块服务与生产产物不是同一条路径。理解过程可以看这条链：

```text
源码里的静态与动态 import
→ 构建解析和转换
→ 入口、公共依赖与按需资源
→ 浏览器根据 URL 请求这些文件
→ 运行时加载组件并读取数据
```

构建报告只能说明生成了什么，不能证明服务器会返回正确 MIME、页面入口和缓存头。动态 import 的实际分块还受打包器与插件配置影响，不能把旧版工具内部实现当成所有版本的规则。

### 子路径发布要把三个位置对齐

若站点发布在 `/atlas/`，Vite 的 base、router history 的 base 与服务器路由前缀都要对应。资源使用正确的导入或 BASE_URL，不在各处硬编码根路径 `/assets`。

| 请求 | 应得到什么 | 常见错误 |
| --- | --- | --- |
| `/atlas/lessons/a` | 页面入口或服务端页面 | 只在客户端点击时可用，刷新 404 |
| `/atlas/assets/某文件.js` | JS 与正确类型 | 被 fallback 换成 HTML 200 |
| `/api/不存在` | API 的真实失败响应 | 混入前端入口 |

本地 preview 能证明产物可以被读取，不能证明 CDN、反向代理或生产 cookie 配置正确。新版本替换时还要考虑已打开的旧页面：它可能继续请求旧 chunk，应该保留兼容资源或提供明确的恢复动作。

### 配置值进入浏览器以后就是公开内容

Vite 的客户端环境值通常是字符串，`"false"` 也是非空字符串。下面只接受明确的开关值，缺省为关闭，其余输入给出可诊断错误。

```ts example=vue10-config-boolean
function readFlag(value: string | undefined): boolean {
  if (value === undefined || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error('开关只接受 true 或 false');
}
console.log(readFlag('false')); // => false
console.log(readFlag('true')); // => true
try { readFlag('yes'); } catch (error) { console.log(error instanceof Error ? error.message : '未知错误'); }
// => 开关只接受 true 或 false
```

mode 决定加载哪组环境文件，NODE_ENV 与 mode 则是不同概念；不要只因文件名带 production 就推断所有运行分支正确。客户端 VITE_ 配置会进入代码，密钥不能放在其中。

公开 source map 与受控上传各有诊断和源码暴露方面的取舍。隐藏 map 不能保护已经进入 bundle 的秘密，source map 的 hidden 选项也不等于服务器拒绝访问生成的文件。

### 预算与发布检查应该服务于具体问题

**performance budget** 可以限制首屏脚本、样式或某条关键路径的可接受退化，但通过字节预算不保证输入流畅。传输压缩后很小的文件，解压、解析和执行仍可能昂贵。

发布证据应指向同一制品：本次构建、实际检查过的文件、部署使用的版本。若检查后重新构建另一份，就需要说明为什么它等价。工具链升级也应检查是否少发现了测试文件，而不只看绿色状态。

把检查规模留给风险决定。普通文案修改没有必要重跑全部端到端流程；改了数据恢复，就保护对应失败和重试；改了路径与构建，就核对真实产物入口。能解释每项检查保护什么，比不断扩大套件更有价值。

### 参考与延伸阅读

- [Vue：测试](https://cn.vuejs.org/guide/scaling-up/testing.html)：比较不同测试层的观察范围。
- [Vue Test Utils：异步行为](https://test-utils.vuejs.org/guide/advanced/async-suspense.html)：查 nextTick 与 flushPromises。
- [Vitest：测试环境](https://vitest.dev/guide/environment.html)：查 jsdom 与浏览器环境的区别。
- [Vue：性能优化](https://cn.vuejs.org/guide/best-practices/performance.html)：查 props、computed 与大列表。
- [Vite：生产构建](https://vite.dev/guide/build)：查 base、产物与分块。
- [Vite：环境变量与模式](https://vite.dev/guide/env-and-mode)：查字符串配置和公开范围。

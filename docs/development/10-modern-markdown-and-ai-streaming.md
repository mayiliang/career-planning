# 现代 Markdown 与 AI 流式协议

更新时间：2026-08-03

## 功能范围

统一渲染组件 `MarkdownRenderer.vue` 用于学习资料、笔记、AI 整理稿、掌握挑战提示、练习验证和判题思考。支持：

- CommonMark/GFM 常用语法、表格、自动链接、任务清单、删除线；
- 脚注、标记、上下标、提示/警告容器；
- 行内与块级 KaTeX 数学公式；
- Mermaid 流程图、时序图、状态图、类图等 Mermaid 当前支持的图形；
- Highlight.js 代码高亮；
- `::: thinking` 与 `<think>...</think>` 的可折叠思考区。

示例：

````markdown
| 能力 | 证据 |
| --- | --- |
| 性能 | INP 与火焰图 |

$$T(n) = O(n \log n)$$

```mermaid
flowchart LR
  Read[阅读资料] --> Note[完成笔记]
  Note --> Learned[用户标记已学完]
```

::: thinking
先核对资料覆盖范围，再组织候选稿。
:::
````

## 流式事件

所有 AI 长任务使用 SSE，事件保持职责分离：

| 事件 | 数据 | 含义 |
| --- | --- | --- |
| `start` | 任务标识 | 连接建立 |
| `progress` | `message`、耗时/字符数 | 不含正文的运行状态 |
| `thinking` | `delta` | 模型提供的推理增量 |
| `delta` | `delta` | 面向用户的正文增量 |
| `done` | 最终 DTO | 服务端校验、保存完成 |
| `error` | 中文 `message` | 可显示错误 |

服务端识别兼容接口常见的 `reasoning_content` 和 `reasoning` 字段；thinking 与最终正文分别累加、分别渲染。thinking 只作为模型生成过程的可见信息，不作为事实依据、评分证据或持久化的用户笔记。

`DEEPSEEK_THINKING_MODE=auto` 时不强加供应商参数；`enabled` 与 `disabled` 只在所用接口明确兼容时使用。模型没有返回推理字段时，界面不制造虚假的思考内容。

## 流式渲染性能

- 高频 token 不直接触发同步全量 DOM 更新；组件以 72ms 窗口合并更新，并在下一动画帧提交。
- Markdown HTML 使用最多 120 项的 LRU 缓存，避免重复解析相同快照。
- Mermaid 只在已闭合的 `mermaid` 代码围栏出现后动态加载；渲染结果最多缓存 40 项。
- 每次更新带修订号，旧的异步图形结果不得覆盖新内容。
- KaTeX、表格和代码块允许局部横向滚动，不推动整页宽度。
- 组件卸载时清理计时器、动画帧和异步修订，避免后台更新。

如需继续优化，优先记录长笔记的输入延迟、渲染耗时、长任务和内存峰值，再决定是否引入 Web Worker 或增量语法树；不能为了“看起来更快”而降低 Markdown 正确性。

## 安全边界

- Markdown 原始 HTML 默认关闭。
- 生成的 HTML 再经 DOMPurify 清洗，禁止脚本、iframe、object、embed、form 和事件属性。
- 外链只允许 HTTPS/HTTP、mailto、站内路径和锚点；外部链接自动增加 `noopener noreferrer`。
- Mermaid 使用 `securityLevel: strict`，且只在浏览器中把文本源码交给渲染器。
- KaTeX 保持 `trust: false` 的默认信任边界。
- AI 正文、thinking、用户笔记和资料全部走同一安全渲染器，不能绕过清洗直接使用 `v-html`。

## 验收重点

1. 表格、公式、图形、代码、脚注、任务清单能在资料与笔记中一致显示。
2. 快速连续输入时，最终预览与源文本一致，页面无明显卡顿。
3. 模型输出 thinking 时，折叠区在正文前流式更新；不输出时不显示空面板。
4. 中止或超时不会覆盖原笔记，最后一次完整候选稿之前不写入数据库。
5. 恶意 HTML、`javascript:` 链接和图形脚本不能执行。

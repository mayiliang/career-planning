# 14 浏览器 AI、本地推理与新 Web 平台

这一领域关注 AI 能力向浏览器和边缘设备迁移后的前端职责：算力检测、模型下载、WebGPU、Worker、隐私、离线与云端回退。

## WEBAI-01 Chrome Built-in AI API 与能力检测

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Chrome Built-in AI 入门](https://developer.chrome.com/docs/ai/get-started)、[Built-in AI API 状态](https://developer.chrome.com/docs/ai/built-in-apis)
- 严格考核：实现 availability、downloadable、downloading、available、unavailable 五种状态 UI，并提供云端 fallback。
- 通过标准：不把实验 API 当全平台能力；模型下载需要用户激活；移动端和硬件不支持时有清晰替代路径。

## WEBAI-02 WebGPU 核心模型与兼容边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN WebGPU](https://developer.mozilla.org/docs/Web/API/WebGPU_API)、[WebGPU Specification](https://www.w3.org/TR/webgpu/)
- 严格考核：说明 adapter、device、buffer、pipeline、shader 和 command encoder 的职责，实现一次 compute shader，并展示兼容检测。
- 通过标准：理解 WebGPU 不是 Baseline；资源正确释放；错误和 device lost 可处理；能说明与 WebGL/WASM 的边界。

## WEBAI-03 WebAssembly、SIMD 与推理性能

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN WebAssembly](https://developer.mozilla.org/docs/WebAssembly)、[WebAssembly SIMD](https://github.com/WebAssembly/simd)
- 严格考核：比较同一计算任务的 JS、WASM 和 WebGPU 版本，记录加载、预热、执行、内存与包体数据。
- 通过标准：基准方法可复现；不只给一次测量；能解释序列化和边界调用成本；按设备能力选择实现。

## WEBAI-04 Worker、并发与主线程响应

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Web Workers](https://developer.mozilla.org/docs/Web/API/Web_Workers_API)、[Comlink](https://github.com/GoogleChromeLabs/comlink)
- 严格考核：把分词、向量计算或模型推理移入 Worker，支持 Transferable、进度、取消与异常传播，并测量 INP。
- 通过标准：主线程无明显长任务；大数据不重复复制；Worker 可终止；错误不会静默；对不支持场景有降级。

## WEBAI-05 浏览器模型下载、缓存与版本管理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Cache API](https://developer.mozilla.org/docs/Web/API/Cache)、[StorageManager](https://developer.mozilla.org/docs/Web/API/StorageManager)
- 严格考核：设计分片下载、校验和、断点、进度、配额检测、版本切换和清理流程，并模拟下载中断与空间不足。
- 通过标准：模型损坏不会加载；旧版本可回滚；不会无限占用磁盘；用户能看到体积、网络与删除入口。

## WEBAI-06 本地 Embedding 与语义搜索

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Transformers.js](https://huggingface.co/docs/transformers.js/)、[IndexedDB](https://developer.mozilla.org/docs/Web/API/IndexedDB_API)
- 严格考核：在 Worker 中生成 embedding，把 1000 条文档向量持久化并实现 top-k 搜索，评估首载时间与相关性。
- 通过标准：UI 不冻结；索引版本与模型绑定；数据留在本地；有至少 20 条查询评估，不以“看起来相关”代替指标。

## WEBAI-07 多模态输入、媒体管线与隐私

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MediaDevices](https://developer.mozilla.org/docs/Web/API/MediaDevices)、[WebCodecs](https://developer.mozilla.org/docs/Web/API/WebCodecs_API)
- 严格考核：设计图片/音频采集、预处理、预览、上传或本地推理流程，处理权限拒绝、设备切换、尺寸压缩和元数据清理。
- 通过标准：授权是按需的；停止后释放媒体轨；不默认上传；敏感元数据处理明确；低端设备有降级。

## WEBAI-08 混合推理与端云路由

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Chrome Hybrid AI](https://developer.chrome.com/docs/ai/built-in)、[Network Information API](https://developer.mozilla.org/docs/Web/API/Network_Information_API)
- 严格考核：根据能力、隐私、延迟、网络、成本和任务质量设计本地/云端路由器，并写出决策表和故障注入测试。
- 通过标准：路由决策可解释；本地失败能回退；敏感任务默认本地或显式确认；结果协议一致且可观测。

## WEBAI-09 AI PWA、离线与后台同步

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[web.dev PWA](https://web.dev/learn/pwa/)、[Background Sync](https://developer.mozilla.org/docs/Web/API/Background_Synchronization_API)
- 严格考核：实现可离线打开的 AI 笔记应用，本地排队任务、恢复网络后同步，并解决重复提交与冲突。
- 通过标准：离线壳和数据版本一致；同步幂等；冲突不静默覆盖；不支持 Background Sync 时仍可手动恢复。

## WEBAI-10 本地 AI 性能、能耗与可访问性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Performance API](https://developer.mozilla.org/docs/Web/API/Performance_API)、[WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)
- 严格考核：建立首 Token、tokens/s、内存、长任务、耗电代理指标和可访问性检查，比较三档设备的体验。
- 通过标准：有真实测量与预算；高负载可暂停或降级；状态对读屏可理解；动画尊重 reduced-motion；不让“本地”掩盖糟糕性能。

## 领域综合考核

实现一个离线可用的浏览器语义搜索 Demo：Worker + 本地 embedding + IndexedDB + 能力检测 + 云端回退，并提交性能、隐私和兼容性报告。

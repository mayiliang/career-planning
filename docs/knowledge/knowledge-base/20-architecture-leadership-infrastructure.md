# 20 架构领导力、演进治理与后端基础设施素养

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。高级前端需要能定义质量属性、推动跨团队决策，并理解浏览器之外决定系统可靠性的关键基础设施。

## ARCH-01 质量属性、约束与架构权衡

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[AWS Well-Architected Framework](https://docs.aws.amazon.com/zh_cn/wellarchitected/latest/framework/welcome.html)、[Google SRE Workbook](https://sre.google/workbook/table-of-contents/)。覆盖范围：性能、可靠性、安全、可维护性、成本、可访问性等质量属性及场景化权衡。
- 严格考核：首考题 1（资料定位）：定位架构支柱和可靠性方法；首考题 2（机制解释）：解释业务目标如何变成可测量质量场景；首考题 3（最小产出）：为大型前端平台定义质量属性和预算；首考题 4（受限排错）：识别互相冲突、不可测量或缺少约束的目标；首考题 5（学习复述）：说明架构为何是权衡而非技术清单。命题边界：必须给出业务上下文。
- 通过标准：质量目标包含刺激、环境、响应和指标；关键权衡有证据；风险与假设显式；可验证。评估边界：套用云厂商支柱名称不算完成架构设计。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## ARCH-02 技术方案、ADR 与架构评审

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#arch-02)、[Architecture Decision Records](https://adr.github.io/)、[Google Engineering Practices](https://google.github.io/eng-practices/review/)。覆盖范围：问题定义、候选方案、决策驱动因素、ADR、评审、异议、风险、验证和复盘。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：定位 ADR 和评审原则；首考题 2（机制解释）：解释从提案到决策和复验的闭环；首考题 3（最小产出）：为跨框架组件平台提交方案和三项 ADR；首考题 4（受限排错）：修复结论先行、假选项和不可逆大爆炸方案；首考题 5（学习复述）：主持一次异议评审。命题边界：文档长度不作为质量指标。
- 通过标准：选项真实可行；依据可追溯；反对意见被记录；决策有复查日期和退出条件。评估边界：只有最终方案描述不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## ARCH-03 渐进迁移、Strangler 与兼容层

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Martin Fowler Strangler Fig](https://martinfowler.com/bliki/StranglerFigApplication.html)、[React Incremental Adoption](https://zh-hans.react.dev/learn/add-react-to-an-existing-project)。覆盖范围：现状基线、切片、兼容层、双写/影子流量、Feature Flag、数据迁移、回滚和完成定义。
- 严格考核：首考题 1（资料定位）：定位渐进替换原则；首考题 2（机制解释）：解释流量和数据如何逐步切换；首考题 3（最小产出）：制定旧前端到新架构的垂直切片迁移计划；首考题 4（受限排错）：处理双系统漂移、共享状态和回滚失效；首考题 5（学习复述）：说明何时大爆炸重写反而合理。命题边界：必须基于可观测的真实迁移单元。
- 通过标准：每阶段独立交付和回滚；兼容层有删除日期；数据一致性策略明确；迁移成功可量化。评估边界：仅列里程碑和人日不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## ARCH-04 技术债、依赖升级与生命周期治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Google Engineering Practices Code Health](https://google.github.io/eng-practices/review/reviewer/standard.html)、[GitHub Dependabot](https://docs.github.com/zh/code-security/dependabot)。覆盖范围：债务分类、利息、风险、升级窗口、弃用、依赖维护、所有权、预算和退出标准。
- 严格考核：首考题 1（资料定位）：定位代码健康和依赖治理依据；首考题 2（机制解释）：说明技术债如何影响交付风险；首考题 3（最小产出）：建立债务台账并完成一次主版本升级；首考题 4（受限排错）：处理长期 Fork、无主依赖和只追数量的清债；首考题 5（学习复述）：向产品解释不治理的业务代价。命题边界：技术偏好不能自动被定义为技术债。
- 通过标准：债务有影响、证据、owner 和触发条件；升级有兼容测试和回滚；删除废弃路径。评估边界：静态分析告警数量不能作为唯一排序依据。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## LEAD-01 技术路线、跨团队推动与影响力

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#lead-01)、[Google DORA Research](https://dora.dev/research/)、[Google Engineering Practices Review](https://google.github.io/eng-practices/review/)。覆盖范围：技术愿景、路线图、干系人、优先级、风险沟通、授权、反馈、冲突和结果度量。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：定位目标和协作反馈原则；首考题 2（机制解释）：解释从技术问题到组织结果的推动链路；首考题 3（最小产出）：制定两季度前端质量路线图；首考题 4（受限排错）：处理目标空泛、依赖失约和团队抵触；首考题 5（学习复述）：进行十分钟高层汇报和工程师答疑。命题边界：领导力不等同于职位或独自完成。
- 通过标准：目标有基线和结果指标；依赖与决策人明确；计划允许反馈调整；能举证他人能力提升。评估边界：会议数量和输出文档数量不是影响力。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## BACKEND-01 SQL、事务、索引与前端数据模型

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#backend-01)、[PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)、[PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)。覆盖范围：关系建模、主外键、查询、索引、事务隔离、分页、读模型及其对 API/前端状态的影响。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：定位事务和隔离行为；首考题 2（机制解释）：解释数据模型如何决定接口和一致性；首考题 3（最小产出）：为审核流建模并实现稳定游标分页；首考题 4（受限排错）：处理丢失更新、慢查询和偏移分页漂移；首考题 5（学习复述）：说明前端为何需要理解数据库。命题边界：不要求数据库管理员深度，但必须正确识别边界。
- 通过标准：约束防止非法状态；查询有索引依据；并发写入策略明确；接口不泄露表结构偶然性。评估边界：ORM 生成成功不代表模型正确。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## BACKEND-02 消息队列、异步任务与幂等消费

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[AWS Well-Architected Queues](https://docs.aws.amazon.com/zh_cn/wellarchitected/latest/serverless-applications-lens/using-queues-and-streams.html)、[MDN HTTP Idempotent Methods](https://developer.mozilla.org/zh-CN/docs/Glossary/Idempotent)。覆盖范围：任务提交、202、队列、重试、死信、幂等、状态查询、取消、进度和用户通知。
- 严格考核：首考题 1（资料定位）：定位队列和幂等原则；首考题 2（机制解释）：画出请求、入队、消费、重试与结果查询；首考题 3（最小产出）：实现可恢复导出任务及前端进度；首考题 4（受限排错）：注入重复消费、乱序完成和毒消息；首考题 5（学习复述）：说明“至少一次”如何影响 UI。命题边界：不得假设队列提供端到端恰好一次。
- 通过标准：提交幂等；状态机单调合理；重试有上限；失败和取消对用户可见；死信可处置。评估边界：轮询页面成功不足以证明后台可靠性。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## BACKEND-03 对象存储、上传下载与 CDN

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Amazon S3 Multipart Upload](https://docs.aws.amazon.com/zh_cn/AmazonS3/latest/userguide/mpuoverview.html)、[Cloudflare Cache Concepts](https://developers.cloudflare.com/cache/concepts/)。覆盖范围：预签名 URL、分片上传、校验、断点、内容类型、病毒扫描、私有下载、CDN 缓存键、失效和成本。
- 严格考核：首考题 1（资料定位）：定位分片上传和 CDN 缓存机制；首考题 2（机制解释）：解释浏览器直传、完成确认、处理和分发链路；首考题 3（最小产出）：实现大文件分片上传和受控下载；首考题 4（受限排错）：处理重复分片、伪造 MIME、缓存私有文件和旧版本；首考题 5（学习复述）：说明为何文件不应总经过业务服务器。命题边界：供应商术语必须映射到通用对象存储概念。
- 通过标准：上传可恢复可校验；权限最小且短期；私有内容不被公共缓存；失败可清理未完成分片。评估边界：单个小文件上传成功不足以通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## CLOUD-01 Serverless、容器与 Kubernetes 交付素养

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Kubernetes Concepts](https://kubernetes.io/zh-cn/docs/concepts/overview/)、[CNCF Cloud Native Definition](https://github.com/cncf/toc/blob/main/DEFINITION.md)。覆盖范围：Serverless、容器编排、Pod/Deployment/Service/Ingress、配置密钥、健康检查、伸缩、滚动发布和平台边界。
- 严格考核：首考题 1（资料定位）：定位云原生和 Kubernetes 核心对象；首考题 2（机制解释）：解释镜像到可访问服务的控制链；首考题 3（最小产出）：为前端 SSR/BFF 服务编写最小部署并演练滚动更新；首考题 4（受限排错）：处理探针错误、配置漂移、资源不足和回滚；首考题 5（学习复述）：比较静态托管、Serverless 和 Kubernetes。命题边界：这是架构协作素养，不要求成为集群管理员。
- 通过标准：部署可重复；健康检查反映真实就绪；配置和密钥分离；更新可回滚；选择与规模匹配。评估边界：能运行 YAML 不代表理解生产边界。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## 领域综合考核

提交一份真实系统演进方案：包含质量属性、ADR、渐进迁移、技术债台账、数据/队列/对象存储架构、部署模型、跨团队路线图，并完成一次故障与回滚演练。

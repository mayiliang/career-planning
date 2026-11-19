# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: framework-route.spec.ts >> 独立方向、统一下一步、保留焦点、阅读辅助与空态
- Location: e2e/framework-route.spec.ts:7:1

# Error details

```
Test timeout of 120000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f9e3]:
  - link "跳到主要内容" [ref=f9e4] [cursor=pointer]:
    - /url: "#main-content"
  - navigation "主导航" [ref=f9e5]:
    - list [ref=f9e6]:
      - listitem [ref=f9e7]:
        - link [ref=f9e8] [cursor=pointer]:
          - /url: /
          - strong [ref=f9e13]: 学习台
      - listitem [ref=f9e14]:
        - link [ref=f9e15] [cursor=pointer]:
          - /url: /knowledge/map
          - strong [ref=f9e20]: 知识体系
      - listitem [ref=f9e21]:
        - link [ref=f9e22] [cursor=pointer]:
          - /url: /notes
          - strong [ref=f9e27]: 笔记中心
      - listitem [ref=f9e28]:
        - link [ref=f9e29] [cursor=pointer]:
          - /url: /plan
          - strong [ref=f9e34]: 核心路线
      - listitem [ref=f9e35]:
        - link [ref=f9e36] [cursor=pointer]:
          - /url: /jobs
          - strong [ref=f9e41]: 求职支线
  - generic [ref=f9e42]:
    - banner [ref=f9e43]:
      - generic [ref=f9e44]: 掌握挑战
      - generic [ref=f9e46]:
        - button "快速查找，快捷键 Command 或 Control 加 K" [ref=f9e47] [cursor=pointer]
        - link "设置与数据" [ref=f9e50] [cursor=pointer]:
          - /url: /settings
    - main [ref=f9e53]:
      - paragraph [ref=f9e54]: 掌握挑战页面已打开
      - main [ref=f9e57]:
        - button "← 返回知识点" [ref=f9e58] [cursor=pointer]
        - generic [ref=f9e59]:
          - generic [ref=f9e60]:
            - paragraph [ref=f9e61]: OPTIONAL MASTERY CHALLENGE · M3
            - heading "REACT-02 掌握挑战" [level=1] [ref=f9e62]
            - paragraph [ref=f9e63]: 1 个渐进任务 · 20 分 · 建议 30 分钟 · M3 首次合同
          - generic [ref=f9e64]:
            - generic [ref=f9e65]: 进行中
            - strong [ref=f9e66]: 建议时间 30:00
            - button "取消本次挑战" [ref=f9e67]
        - generic [ref=f9e68]:
          - article [ref=f9e69]:
            - generic [ref=f9e70]: "01"
            - generic [ref=f9e71]:
              - generic [ref=f9e72]:
                - generic [ref=f9e73]: practice · ESSAY
                - strong [ref=f9e74]: 20 分
              - paragraph [ref=f9e75]: 原题任务 · 旧首考题 1
              - heading "旧题原文保留：解释原组件行为" [level=2] [ref=f9e76]
              - generic "挑战验证合同" [ref=f9e77]:
                - generic [ref=f9e78]:
                  - generic [ref=f9e79]: M 阶段 / 复测
                  - paragraph [ref=f9e80]: M3 · 首次挑战：完成后如需复测，将以变式验证迁移能力。
                - generic [ref=f9e81]:
                  - generic [ref=f9e82]: 否决项
                  - paragraph [ref=f9e83]: 本题未列出额外否决项；仍须满足题干、资料依据与验证清单。
                - generic [ref=f9e84]:
                  - generic [ref=f9e85]: 本地 Worker 自检（非安全沙箱 / 非服务端证明）
                  - paragraph [ref=f9e86]: 本题不启用本地自检；将按题目合同和语义评分复核。
              - generic [ref=f9e87]:
                - generic [ref=f9e88]: 卡住了？选择恰好够用的帮助
                - generic [ref=f9e89]:
                  - button "解释题意" [ref=f9e90] [cursor=pointer]
                  - button "给一个提示" [ref=f9e91] [cursor=pointer]
                  - button "拆解步骤" [ref=f9e92] [cursor=pointer]
                  - button "给回答提纲" [ref=f9e93] [cursor=pointer]
                  - button "帮我起个头" [ref=f9e94] [cursor=pointer]
                  - button "看相似示例" [ref=f9e95] [cursor=pointer]
                  - button "查看完整思路" [ref=f9e96] [cursor=pointer]
              - textbox "写下可以被追问、验证和复现的答案..." [ref=f9e97]
          - generic [ref=f9e98]:
            - generic [ref=f9e99]: 已完成 0 / 1
            - button "提交并查看掌握反馈" [ref=f9e100] [cursor=pointer]
  - button "打开 Atlas AI 助手" [ref=f9e101] [cursor=pointer]:
    - generic [aria-hidden] [ref=f9e102]: ✦
```
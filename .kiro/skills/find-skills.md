# Find Skills

帮助发现和安装 agent skills 的技能。

## 何时使用

当用户：
- 问"怎么做 X"，X 可能有现成的 skill
- 说"找一个 X 的 skill"
- 想扩展 agent 能力
- 需要特定领域的帮助（设计、测试、部署等）

## Skills 生态

浏览 skills：https://skills.sh/

常见分类：

| 分类 | 关键词 |
|------|--------|
| Web 开发 | react, nextjs, typescript, css, tailwind |
| 测试 | testing, jest, playwright, e2e |
| DevOps | deploy, docker, kubernetes, ci-cd |
| 文档 | docs, readme, changelog, api-docs |
| 代码质量 | review, lint, refactor, best-practices |
| 设计 | ui, ux, design-system, accessibility |
| 效率 | workflow, automation, git |

## 如何搜索

用 web search 在 https://skills.sh/ 或 GitHub 上搜索相关 skill，然后：

1. 找到 skill 的 GitHub 仓库
2. 下载 SKILL.md 内容
3. 转换为 Kiro 的 steering 文件（放到 `.kiro/steering/`）或 skill 文件（放到 `.kiro/skills/`）

## 安装方式

对于 Kiro，不使用 `npx skills` 命令，而是：
1. 从 GitHub 仓库获取 SKILL.md 内容
2. 保存到 `.kiro/skills/` 目录（手动引用）或 `.kiro/steering/` 目录（自动/条件加载）

## 找不到 Skill 时

1. 告知用户没有找到现成的 skill
2. 用现有能力直接帮助完成任务
3. 建议用户可以自己创建 skill

# Vibe Coding QA Skill

`vibe-coding-qa` 是一个面向 Vibe Coding 的 QA/TDD skill。它的目标不是生成厚重的传统测试文档，而是用轻量测试设计、TDD 前置门禁、分层自动化测试、回归影响分析、运行时验证和失败复盘来约束 AI 生成代码。

这个 skill 适合用于 Claude、Codex、Gemini CLI、OpenCode 等编程智能体。它不绑定某一个工具；具体工具只需要在项目级指令文件中引用并执行这里的约束。

## 设计思路

核心原则是：测试不是代码写完后的补充检查，而是 AI 写代码前的控制系统。

- 需求权威优先：预期行为必须来自 Spec、PRD、issue、验收标准、API contract 或用户明确确认。现有实现只能作为 baseline，不能自动成为正确行为。
- 测试设计先行：写测试脚本前先做轻量测试设计，记录需求来源、测试点、测试层级、TDD Red 证据或例外/阻塞、初始回归影响。
- TDD 约束生产代码：修改生产代码前必须有有效 Red、可复用失败测试、非 TDD 例外，或明确 prerequisite blocker。
- Red 必须是真行为失败：compile error、missing method、missing endpoint、import error、fixture/setup/env/DB 失败都不是 Red。静态类型语言中应先建最小可编译桩，再获得断言级 Red。
- 分层测试就近覆盖：优先单元测试，其次 API/集成测试，最后 E2E。E2E 覆盖关键用户旅程，不承载所有字段组合。
- 测试数据必须有业务语义：API/集成和 E2E 测试必须结合需求状态、使用场景与项目真实领域（schema、枚举、已有 factory）生成模拟真实业务数据，并使用业务系统的主语言/locale（中文产品用中文数据），不能用 `foo`、`bar`、`test123` 这类占位数据。
- QA report 收口：测试结束后生成或更新 `qa-test-report.md`，记录 TDD 顺序证据、测试执行、回归范围、测试数据证据、未覆盖风险。

## 目录结构

```text
.
|-- SKILL.md
|-- README.md
|-- references/
|   |-- qa-constitution.md
|   |-- test-analysis-and-design.md
|   |-- unit-testing.md
|   |-- api-and-integration-testing.md
|   |-- e2e-testing.md
|   |-- regression-testing.md
|   |-- runtime-qa-validation.md
|   |-- failure-analysis.md
|   |-- test-data-and-simulation.md
|   `-- test-tooling.md
|-- templates/
|   |-- lightweight-test-design.md
|   |-- qa-test-report.md
|   |-- regression-impact-analysis.md
|   `-- bug-report.md
`-- scripts/
    `-- qa_artifacts.mjs
```

- `SKILL.md`：skill 入口，定义适用场景、核心工作流、强制规则和参考文档选择方式。
- `references/`：详细规则和方法。`qa-constitution.md` 是最高优先级规则，不应被其他文档弱化。
- `templates/`：项目中实际产出的 QA artifact 骨架。
- `scripts/qa_artifacts.mjs`：模板创建和结构检查工具，只检查 artifact 结构和明显占位内容，不替代工程判断。

## 如何使用

典型流程：

1. 读取 `SKILL.md` 和 `references/qa-constitution.md`。
2. 基于 Spec/PRD/issue/API contract/code baseline 创建 `lightweight-test-design.md`。
3. 在 `Pre-Code TDD Gate` 中确认是否允许修改生产代码。
4. 对单元测试和 API/集成测试执行 Red-Green-Refactor。
5. 对 E2E 执行 scenario-first 设计，覆盖关键用户旅程。
6. 实现 Green 后运行新增、修改和受影响的回归测试。
7. 生成或更新 `qa-test-report.md`。
8. 如遇失败，先按 `failure-analysis.md` 分类，再决定修代码、修测试、补数据、处理环境或请求需求澄清。

常用脚本：

```bash
node scripts/qa_artifacts.mjs list
node scripts/qa_artifacts.mjs create lightweight-test-design docs/qa/<change>/lightweight-test-design.md
node scripts/qa_artifacts.mjs create qa-test-report docs/qa/<change>/qa-test-report.md
node scripts/qa_artifacts.mjs check lightweight-test-design docs/qa/<change>/lightweight-test-design.md
node scripts/qa_artifacts.mjs check qa-test-report docs/qa/<change>/qa-test-report.md
```

`check` 只做确定性结构检查。它能发现缺少 `Pre-Code TDD Gate`、缺少 `TDD Sequence Evidence`、把 compile error 当 Red 等问题，但不能替代真实测试执行和人工/agent 的工程判断。

## 在项目级 Agent 指令中添加约束

只安装 skill 通常不够。要让 agent 真正按 TDD 执行，需要在项目级指令文件中加入硬约束。

常见位置：

- Claude：`CLAUDE.md`
- Codex：`AGENTS.md` 或 Codex 项目级 instructions
- Gemini CLI：`GEMINI.md`
- OpenCode：对应项目级 agent instruction 文件

推荐加入以下内容，并按项目实际路径调整 artifact 目录：

```markdown
## Vibe Coding QA / TDD 硬约束

行为变更不得直接写生产代码。任何会修改生产代码的任务，在改代码前必须先满足以下条件之一：

- 已创建或更新轻量测试设计，且存在有效 Red 证据。
- 已有可复用失败测试能证明当前行为缺口。
- 已记录非 TDD 例外，包括原因、替代验证方式和剩余风险。
- 已记录明确 prerequisite blocker，包括缺失依赖、账号、服务、权限、环境变量、测试框架或不安全的数据准备路径。

Red 证据必须是预期行为层面的失败，例如断言失败、状态错误、响应字段缺失、持久化状态不符。语法错误、import error、compile error、missing method/class/endpoint、fixture/setup/env/DB 失败都不是 Red。

对于 Java、Kotlin、TypeScript、Go、C# 等静态类型语言，如果目标 API、方法、Mapper、Controller、route 或 DTO 不存在，应先创建最小可编译生产桩。桩只暴露目标签名或路由，不实现真实行为。测试必须能运行并失败在行为断言上，才算 Red。

测试分层优先级为 Unit -> API/Integration -> E2E。单元测试和 API/集成测试默认执行严格 Red-Green-Refactor。E2E 使用 scenario-first 设计，覆盖关键用户旅程，不要求强制 Red-Green。

API/集成测试和 E2E 测试必须使用模拟真实业务数据，并说明业务真实性依据。不得使用 `foo`、`bar`、`test123`、`asdf`、`张三`、`Acme Inc.` 或 lorem 文本作为业务记录。

测试结束后必须生成或更新 `qa-test-report.md`，记录 TDD 顺序证据、测试执行结果、回归范围、测试数据证据、未运行测试、阻塞项和剩余风险。事后补写的测试不得伪装成正常 TDD，必须记录为 TDD violation 或 non-TDD exception。
```

如果项目使用专门的需求管理、规格管理或 agent command workflow，请在项目级 agent 指令文件中自行定义它和本 QA gate 的协作顺序。这个 skill 只规定通用 QA/TDD 约束，不绑定任何特定需求工具。

## 后续优化方向

- Bug asset / bug index：把 vibe coding 中发现的 bug、根因和有效解决方案沉淀为可检索资产。优先写入代码仓库 issue；没有 issue 系统时，落到项目内 `docs/bug-index/`。
- 更强 artifact checker：增加跨 artifact 的一致性检查，例如 lightweight design 中的测试点是否都出现在 QA report coverage summary 中。
- Agent-specific instruction generator：基于通用约束生成 `CLAUDE.md`、`AGENTS.md`、`GEMINI.md` 或 OpenCode 指令片段。
- 技术栈示例：补充 Java/Spring、Node/Express、React/Vue、Playwright、Testcontainers 等常见项目的落地样例。
- CI 集成：提供 GitHub Actions 或其他 CI 示例，在 PR 中检查 QA artifact、测试执行证据和 TDD gate。

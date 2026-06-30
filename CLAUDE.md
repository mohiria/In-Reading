# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**In Reading** 是一款 Chrome MV3 浏览器扩展（沉浸式外语阅读助手）。核心理念：不做整句/整页翻译，而是按用户语言等级（i+1 习得理论）只对「认知边界上的生词」做原位注解（IPA + 简短释义），让用户保持在阅读心流中。详见 `docs/product-spec.md` 与 `README.md`。

技术栈：React 18 + TypeScript（strict）+ Vite 4 + `@crxjs/vite-plugin`（MV3 打包）。存储用 Chrome Storage（sync/local/session）+ IndexedDB（`idb`）。

## 常用命令

```bash
npm install              # 安装依赖
npm run build            # tsc 类型检查 + vite build → 产物在 dist/（加载已解压扩展时选 dist）
npm run dev              # vite 开发服务器（HMR）
npm test                 # vitest run（一次性跑全部）
npx vitest               # watch 模式
npx vitest run src/test/unit/analyzer.test.ts   # 跑单个测试文件
```

构建产物 `dist/` 通过 `chrome://extensions/` → 开发者模式 → 加载已解压的扩展程序 安装。

### 词库与资源生成（非 npm script，用 tsx 直接跑）

```bash
npx tsx scripts/generate-dict.ts        # 从 oxford_5000.json 生成 public/data/dictionary-core.json.gz + version.json
npx tsx scripts/sync-inflections.ts     # 由 confusion-map.json 同步生成 src/common/nlp/inflections.json（词形还原表）
npx tsx scripts/generate-icons.ts       # 用 sharp 生成多尺寸 icon
```

改动 `oxford_5000.json` 或 `public/dictionaries/confusion-map.json` 后需重跑对应脚本。`generate-dict.ts` 用 `Date.now()` 写入 `version.json` 的 `version` 字段，扩展端据此判断是否需要更新本地 IndexedDB。

## 架构总览

扩展分四个执行上下文，通过 `chrome.runtime` 消息通信：

- **content script**（`src/content/index.tsx`）：注入每个页面，负责扫描 DOM、注解生词、监听动态内容与 SPA 导航。UI（Tooltip/划词弹窗）渲染在 **Shadow DOM** 中隔离样式（host 元素 `#ll-extension-host`）。
- **background service worker**（`src/background/index.ts`）：管理每标签页开关状态、图标徽标、翻译请求编排（划词翻译走这里）。
- **popup**（`src/popup/`）：点击图标的快捷面板（等级、发音风格、开关）。
- **options**（`src/options/`）：完整设置页（含 LLM 引擎配置）。

### 核心数据流：页面注解

1. `runScan`（content/index.tsx）取设置 + 生词本 → 调 `scanAndHighlight`。
2. `scanAndHighlight`（`src/content/engine/scanner.ts`）用**优化 TreeWalker** 遍历正文：通过 `SKIP_SELECTOR`、`isLikelyUI`（链接密度 + 标点启发式）、`HEADER_SELECTOR` **剪枝**掉导航/UI/标题，只处理正文段落（`p`/`li`/`div` 等 block）。
3. 对每个文本节点调 `analyzeText`（`src/common/nlp/analyzer.ts`）：正则切词 → `inflections.json` 词形还原 → 查词典 → `checkDifficulty` 判断是否够难需要注解。
4. 命中词包成 `.ll-word-container` span（含发音图标、IPA、释义），带 **Spaced Reinforcement**（`REFRESH_GAP`，同一词隔几个 block 才重复注解，避免视觉噪音）。

### 词典分层查询（注意优先级）

`analyzeText` 查词有**两级且有固定优先级**：

1. **Dictionary A — confusion-map**（`public/dictionaries/confusion-map.json`，编译进 bundle）：优先级最高，处理同形异义/易混词。无词根 IPA 的条目标记 `hideIPA: true`（多音词不显示音标）。
2. **Dictionary B — IndexedDB 词库**（`batchLookupWords`）：仅当 A 未命中才回退。数据来自 `dictionary-core.json.gz`，首次/版本更新时由 `indexed-db.ts` 解压并分块（2000/批）写入。

难度判定在 `checkDifficulty`：词的 CEFR tag 经 `TAG_LEVEL_MAP`（`src/common/nlp/dictionary.ts`）映射为数值 rank，与用户等级 `USER_LEVEL_RANK` 比较，`maxDifficulty >= userRank` 才注解。生词本里的词无视难度强制注解。改难度逻辑务必同时看这两张映射表。

### 翻译引擎（划词翻译，走 background）

`handleTranslationRequest`（background/index.ts）按优先级回退：

1. **LLM 引擎**（settings.engine === 'llm' 且有 apiKey）：`src/background/llm/index.ts`，支持 gemini/openai/claude/deepseek/moonshot/zhipu/qwen/custom。除 gemini 与原生 anthropic 外，其余走 OpenAI 兼容 `/chat/completions`。模型清单与默认 baseUrl 在 `src/common/config.ts`。
2. **词典查询**（单词）：Youdao → iCIBA。
3. **机器翻译兜底**：Youdao MT → iCIBA MT → Google。

> LLM 相关改动前必读 `claude-api` skill（涉及 Claude/Anthropic 模型、参数）。`config.ts` 与 `manifest.json` 的 `host_permissions` 须同步：新增 LLM provider 域名要加进 `host_permissions`。

### 状态与同步要点

- **标签页开关**存 `chrome.storage.session`（key `tabState_<tabId>`），刷新保留、关标签清除。`Alt+A` 或 popup 切换。
- **设置**存 sync，**生词本**存 local。content script 监听 `chrome.storage.onChanged`：设置变化触发重扫；生词本变化做**外科手术式更新**（只对新增词增量注解、删除词调 `unhighlightWord`），避免全页重扫抖动。
- **MutationObserver**（500ms 防抖）跟动态内容；通过判断 `.ll-word-container` / `#ll-extension-host` **过滤掉自身造成的 mutation**，否则会无限循环。
- **SPA 导航**：劫持 `history.pushState`/`replaceState` + `popstate`，URL 变化时重扫（应对 BBC/YouTube 等单页应用）。

## 类型约定

核心类型在 `src/common/types/index.ts`：`UserSettings`、`LLMSettings`、`WordExplanation`（注解数据的统一结构，`analyzeText` 返回的 explanation 都归一到它）、`SavedWord`。新增字段优先扩展这里而非各处临时塞属性。路径别名 `@/*` → `src/*`。

## 两阶段工作流（OpenSpec + Vibe Coding QA）

行为变更走两阶段，不允许「直接写代码」。两套 skill 在 `.claude/skills/` 与 `.claude/commands/opsx/`。

**阶段 1：OpenSpec 把需求转成行为契约**

| 命令 | 作用 |
| :--- | :--- |
| `/opsx:explore <topic>` | 思考、研究，不实现 |
| `/opsx:propose <change>` | 生成 `proposal.md` / `design.md` / `tasks.md` / `specs/<capability>/spec.md` |
| `/opsx:apply <change>` | 按 `tasks.md` 实现 |
| `/opsx:archive <change>` | 完成后归档，delta spec 升级到 `openspec/specs/` |

变更草案在 `openspec/changes/`，归档稳定规格在 `openspec/specs/`，配置 `openspec/config.yaml`（schema: spec-driven）。`spec.md` 只写 WHEN/THEN 行为契约——不写 DOM 选择器、类名、文件路径或实现步骤，那些归 `design.md` / `tasks.md`。

**阶段 2：vibe-coding-qa 以 TDD 落地**

改任何生产代码前，必须存在以下之一（详见 `.claude/skills/vibe-coding-qa/SKILL.md` 与 `references/qa-constitution.md`）：① 当前行为的轻量测试设计；② 有效 Red 证据（测试因**预期行为原因**失败）；③ 已有可复用失败测试；④ 书面记录的非 TDD 例外 + 备选验证 + 剩余风险；⑤ 明确写下的、阻止写 Red 的具体阻塞。

测试分层就近（本项目栈：vitest + jsdom）：**单元**（纯函数与业务规则：`analyzer`/`checkDifficulty`/`format`/`dictionary` 映射）→ **集成**（jsdom 真实 DOM 的 `scanner`、IndexedDB、mock 的 `chrome.*`，参考 `src/test/integration/scanner.integration.test.ts`）→ **E2E**（仅关键阅读旅程，`npm run build` 后加载 `dist/` 到 Chrome 实测，场景优先，不要求严格 Red-Green）。测试代码入 `src/test/`（`unit/`、`integration/`、`components/`），环境与 setup 见 `src/test/setup.ts`。

**反作弊**：禁止削弱断言、删负例、跳过测试、为让套件通过而改期望行为；改/删既有测试必须先声明需求权威依据。

### 阶段衔接闸门（apply 逐 task 生效，覆盖 opsx:apply 默认循环）

OpenSpec 的 schema 只产出 proposal/design/specs/tasks，**不含测试设计**；`/opsx:apply` 的内置循环是测试盲的（原文只说 "make the code changes required"）。二者不会互相触发，**本节优先级高于该循环**：apply 每处理一个会改动生产代码的 task 之前先停，逐条核对，任一不满足则该 task 不许进入写码——

1. **合法 Red = 已运行 + 断言级失败**：必须先贴出该 Red 测试**实际运行**、因**预期行为原因**失败的输出（如 `expected X but got Y`、DOM 未注解、返回值不符）。没有运行输出 = 没有 Red。
2. **以下一律判「未达 Red / 阻塞」，不当 Red 记**：编译/类型失败、目标函数尚不存在、导入错误、fixture/环境失败。静态类型下拿真 Red 的正解（先建最小可编译桩再写断言）见 `references/qa-constitution.md` 的 Mandatory TDD Rule。
3. **`tasks.md` 勾选 `[x]` 标准**：充分条件是「贴出失败运行输出」；仅创建测试文件、或还编译不过，都不能打勾。
4. **产物顺序不可倒置**：`qa/test-design.md`（轻量测试设计）必须在该能力**第一行生产代码之前**存在；`qa/qa-report.md` 在末尾产出。禁止先写实现再回头补测试点。

测试点输入直接取自 OpenSpec 工件：specs 的 `#### Scenario:` WHEN/THEN 是测试点来源，`tasks.md` 提供改动清单与回归范围。QA 设计/报告产物入 `openspec/changes/<change>/qa/`（用 `.claude/skills/vibe-coding-qa/templates/` 做骨架），随 change 一并归档；自动化测试代码入 `src/test/...`，**不**入 `qa/`。

无 hook 拦截时这是软约束，靠执行者在 apply 每个 task 前主动自检；但它把规则放在决策发生的那一刻，而非只在顶部声明一次。

实操：单文件小修也要记录代表性测试点与 Red/异常证据；跨模块、改难度模型/词典分层/消息协议等架构性改动，先 OpenSpec 出方案，apply 时按本闸门走 QA。

## 权威优先级与冲突门

文档冲突时按以下顺序仲裁：① `docs/product-spec.md`（产品规格）→ ② `README.md`（产品哲学与功能）→ ③ `openspec/specs/`（已归档稳定行为）→ ④ `openspec/changes/<change>/`（在途变更）→ ⑤ `openspec/changes/<change>/qa/`（QA 产物）。

OpenSpec 输出或测试与 ①② 冲突时**停下来触发 Requirement Conflict Gate**——不要私自放宽断言或改写期望行为；规则见 `.claude/skills/vibe-coding-qa/references/qa-constitution.md` 的「Requirement Authority And Conflict Rule」节。

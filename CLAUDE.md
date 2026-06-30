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

## 工作流：OpenSpec + Vibe Coding QA

本仓库已接入两套配套工作流（`.claude/skills/` 与 `.claude/commands/opsx/`）：

- **OpenSpec（spec-driven 变更）**：较大或需求不清晰的改动，先走提案而非直接写码。用 `/opsx:explore`（厘清需求）→ `/opsx:propose`（生成 proposal/design/specs/tasks）→ `/opsx:apply`（按 tasks 实现）→ `/opsx:archive`（完成后归档）。变更草案在 `openspec/changes/`，能力规格在 `openspec/specs/`，配置 `openspec/config.yaml`（schema: spec-driven）。
- **Vibe Coding QA（TDD 分层测试）**：写/改核心逻辑（analyzer、scanner、difficulty、storage）前用 `vibe-coding-qa` skill。默认顺序：轻量测试设计 → 先写 Red 单测 → 分层（unit / integration / E2E）→ 回归影响分析。测试放 `src/test/`（`unit/`、`integration/`、`components/`），环境 jsdom，setup 见 `src/test/setup.ts`。

实操选择：单文件 bug 修复或小改动直接动手 + 补/跑测试即可；跨模块、改难度模型/词典分层/消息协议等有架构影响的改动，先用 OpenSpec 出方案再实现。

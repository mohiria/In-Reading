## Why

行内自动注解只查本地词库（confusion-map + Oxford 核心约 5944 词），覆盖不到中级+用户真正不会的进阶词（i+1 的那 10%），头号"沉浸式注解"卖点对目标用户基本不触发；连字符复合词（如 `life-threatening`）还被分词拆开、整体无法注解。`engine:'llm'` 目前只影响划词、不影响行内。本变更让**开启 AI 后行内也能按语境回填未收录词**，且不拖慢页面加载。

## What Changes

- **触发门（opt-in）**：仅当 `settings.engine==='llm'` && `settings.llm.apiKey` && `navigator.onLine` 才启用回填；默认/离线纯本地，行为与今天完全一致。
- **分阶段渲染**：Phase 1 本地注解立即出（同今天）；Phase 2 未命中本地的"难词"后台批量回填、结果到了再注解（复用 `createWordContainer` 现有 fade-in，体验为渐显）。注解本就是渲染后异步增强，不挡页面加载。
- **候选筛选**：`scanAndHighlight` 已收集 `candidates`；取「经 `getLookupCandidates` 词形还原后仍不在 `combinedDict`」的词，再用**常见词频表**过滤（跳过琐碎词）+ 长度 + 排除疑似专有名词，得 `unknownHard`。
- **连字符复合词**：扩展候选分词，使 `[a-zA-Z]+(?:-[a-zA-Z]+)+`（如 `life-threatening`）整体成为候选 token，参与本地查词与回填。
- **批量调用**：把 `unknownHard`（带所在句语境）一次发 background 新 handler（扩展 `background/llm/index.ts` 批量 prompt，一次解释 N 词），限制单次扫描的调用数/并发。
- **缓存**：新增 IndexedDB store `ai_cache`，**按单词(小写)为键**，值 `{meaning, ipa_us, ipa_uk, source}`；命中缓存直接注解，稳态趋近离线。
- **优雅降级**：离线/未开 AI → 仅本地、无报错；LLM 失败 → 那些词保持不注解（不刷错误）。

## Capabilities

### New Capabilities
<!-- 无 -->

### Modified Capabilities
- `inline-annotation`: 新增——开启 AI 且在线时，对本地未收录的难词按语境在线回填注解（分阶段渐显、按词缓存）；连字符复合词整体参与候选与查词。

## Impact

- 代码：`src/content/engine/scanner.ts`（候选分词含连字符、回填编排 + Phase2 二次注解）、`src/background/index.ts`（批量回填 handler）、`src/background/llm/index.ts`（批量 prompt）、`src/common/storage/indexed-db.ts`（`ai_cache` store 读写）、新增常见词频表资源。
- 触发复用现有 `engine:'llm'` 开关与 `llm` 配置；无新设置项、无 manifest 变更。
- 引入网络/LLM 调用（仅 opt-in 时）；隐私：开 AI 即同意页面词发送给所配 LLM。
- 非目标：不改本地词库内容（那是 `fix-dictionary-glosses`）、不改难度模型、不动 confusion-map、不做 SRS。

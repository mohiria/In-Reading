# QA 报告 — inline-ai-backfill

## 范围

开启 AI 且在线时，行内注解覆盖本地词库（~5944 核心词）未收录的进阶词与连字符复合词；默认/离线纯本地、行为与今天完全一致。修改能力 `inline-annotation`。

## 分层与执行证据

| 层 | 对象 | 证据 |
| --- | --- | --- |
| 单元（TDD）| `backfill.ts` 纯逻辑 | `src/test/unit/backfill.test.ts` B1–B5 Red→Green，5/5 通过 |
| 全量回归 | 现有行内/扫描/弹窗用例 | `npx vitest run` 17 文件 / 56 用例全通过（含 scanner.integration、scanner.batch2、scanner、pos_abbreviation 等，Phase1 行为无回归）|
| 构建 | TS 全量编译 + 打包 | `npm run build` 通过（content/background 双 bundle）|
| 集成（手动）| `ai_cache` 读写、`BACKFILL_WORDS`、scanner Phase2 二次注解 | jsdom 无 IndexedDB / 无 `chrome.runtime` → 留 5.2 手动 |

## TDD 证据

- `extractCandidates`：`life-threatening` 整体入候选并附加 `life`/`threatening` 部件（B1/B2）。
- `selectUnknownHard`：命中本地（isResolved）排除、长度 <4 排除、仅大写专名（everLower 缺失）排除、去重小写（B3–B5）。

## 关键设计（可审性）

- **触发门**：`content/index.tsx` 仅当 `engine==='llm' && llm.apiKey && navigator.onLine` 才注入 `backfillFn`；否则 scanner Phase2 直接 return → 与今天逐字节一致。
- **解耦**：scanner 通过注入 `backfill` 函数（同 `dbLookup` 模式）触达后台，纯逻辑可单测、Phase2 编排无须 mock chrome。
- **降级**：缓存查询、批量请求、写库全 `catch` 静默；后台 `BACKFILL_WORDS` 未开 AI / 失败返回空 `{}`、不抛。
- **防循环**：Phase2 二次注解仍产生 `ll-word-container`，被既有 MutationObserver `isOurMutation` 过滤。
- **限额**：`MAX_BACKFILL=80`、`BATCH_LIMIT=40`、并发 ≤2；超限 `console.log` 丢弃数。
- **缓存**：新增 IndexedDB `ai_cache` store（DB_VERSION 3→4），按小写词为键，稳态趋近离线。

## 剩余风险 / 未决（5.2 手动）

- 开 AI + 在线读真实文章：本地词秒标、进阶词 ~1–2s 渐显、`life-threatening` 整体注解。
- 断网 / 关 AI：仅本地、无报错。
- 重复访问命中 `ai_cache` 即时注解、无新请求。
- 批量 prompt 的释义质量依赖所配 provider；解析失败按「不注解」降级，不影响 Phase1。

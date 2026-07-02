# Lightweight Test Design — inline-ai-backfill

## Context

- Spec: `specs/inline-annotation`（在线回填、连字符复合词候选、按词缓存、降级）
- 可单测核心（纯逻辑）：候选分词含连字符 `extractCandidates`、`selectUnknownHard` 筛选。
- 网络/LLM 批量、IndexedDB `ai_cache`、scanner Phase2 二次注解：jsdom/网络不便 → 手动验证（5.2）。

## Requirement Authority / Conflict Gate

修改 `inline-annotation`，ADDED 新需求（在线回填等），不削弱既有；relationship = extends/amends。

## Pre-Code TDD Gate

- `extractCandidates` / `selectUnknownHard` 严格 Red→Green（纯函数）。
- 批量 LLM、缓存 DB、Phase2 编排、降级：Non-TDD，手动验证兜底（开/关 AI、在线/离线、缓存命中）。
- 先建桩（返回空）拿断言级 Red。

## Test Points

| # | Test point | Layer | Expected | Coverage |
| --- | --- | --- | --- | --- |
| B1 | 连字符复合词成单一候选 | Unit | `extractCandidates('a life-threatening case')` 含 `life-threatening` | `backfill.test.ts` |
| B2 | 普通词/短词规则 | Unit | 含 3+ 字母词；不含 1-2 字母 | 同上 |
| B3 | unknownHard：排除已命中本地 | Unit | isResolved 为真的词不入选 | 同上 |
| B4 | unknownHard：排除疑似专名（从不小写） | Unit | 只大写出现的词（不在 everLower）不入选 | 同上 |
| B5 | unknownHard：排除过短 | Unit | core 长度 <4 不入选 | 同上 |

## TDD Candidates

| 测试点 | Why Red | Expected Red |
| --- | --- | --- |
| B1 | 桩 `extractCandidates`→[] | `expected [] to contain 'life-threatening'` |
| B3 | 桩 `selectUnknownHard`→[] | `expected [] to contain 'ubiquitous'`（或反向断言失败） |

## Regression

| Changed | Impacted | Rerun | Risk |
| --- | --- | --- | --- |
| 候选分词 + 回填编排 + 缓存 + LLM | 行内注解（仅 opt-in 路径新增；本地路径不变） | 全量 + scanner 既有用例 + 手动 | Medium（仅 AI 开启时新行为） |

## Non-TDD 例外

批量 LLM、`ai_cache` 真实 IndexedDB、Phase2 DOM 二次注解、降级 → 手动验证（5.2）：开 AI+在线渐显、断网/关 AI 仅本地无报错、缓存命中即时、life-threatening 整体注解。

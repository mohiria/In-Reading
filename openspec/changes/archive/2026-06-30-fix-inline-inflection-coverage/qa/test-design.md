# Lightweight Test Design — fix-inline-inflection-coverage

## Context

- Spec: `specs/inline-annotation`（表面优先还原 + 已保存按基础词高亮）、`specs/vocabulary-management`（popup 搜索）
- 可单测核心：`getLookupCandidates`（查词候选生成）、`analyzeText` 已保存按基础词；popup 搜索/查词 DB 命中走手动。
- Env: vitest + jsdom

## Requirement Authority / Conflict Gate

修改既有能力 `inline-annotation`（Batch 3 的「Inflected-form coverage」之上细化：表面优先 + 后缀回退 + saved-base），relationship = amends；不削弱既有断言（保留 `getLemmaKeys` 既有测试）。

## Pre-Code TDD Gate

- 纯函数 `getLookupCandidates` + analyzer 判定走严格 Red→Green。
- `batchLookupWords`/`lookupWordInDB` 真实 IndexedDB 命中、popup 渲染：jsdom 不便，记 Non-TDD，手动验证（5.2）。
- 先建桩 `getLookupCandidates`→`[lower]`，写断言级 Red。

## Test Points

| # | Test point | Source | Layer | Expected | Coverage |
| --- | --- | --- | --- | --- | --- |
| C1 | 屈折形候选含基础词 | inline-annotation | Unit | `getLookupCandidates('victims')` 含 `victim`、`'suffered'` 含 `suffer` | `indexed-db.test.ts` |
| C2 | 表面优先 | inline-annotation | Unit | `getLookupCandidates('building')[0] === 'building'` | 同上 |
| C3 | -ies→y | inline-annotation | Unit | `'cities'` 含 `city` | 同上 |
| C4 | 无可剥后缀只返回自身 | inline-annotation | Unit | `'apple'` → `['apple']` | 同上 |
| S1 | 存基础词后变形判为已保存 | inline-annotation | Unit | 存 `victim`、高档位下 `victims` 仍被标注 | `analyzer.test.ts` |

## TDD Candidates

| 测试点 | Why Red | Expected Red |
| --- | --- | --- |
| C1 | 桩仅返回 `[lower]` | `expected ['victims'] to contain 'victim'` |
| S1 | 当前 isSaved 只看 base/lower（变形词） | `expected undefined`（victims 未被标注） |

C2/C4 为守卫。

## Regression

| Changed | Impacted | Rerun | Risk |
| --- | --- | --- | --- |
| getLookupCandidates + batch/lookup + analyzer + popup | 行内查词命中范围、已保存高亮、popup 列表 | 全量（含既有 `getLemmaKeys`、analyzer tear/rose、difficulty） | Low |

## Non-TDD 例外

`batchLookupWords` 真实 DB 命中、popup 搜索渲染 → 手动验证（5.2）。

## Coverage Closure

- Red 覆盖 C1/S1；C2/C3/C4 守卫；UI/DB 手动兜底。

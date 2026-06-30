# Lightweight Test Design — Batch 3 (词形还原覆盖核心词库)

## Context

- Requirement / Spec: `specs/inline-annotation/spec.md`「Inflected-form coverage for the core dictionary」
- Change summary: #3 让 IndexedDB 查询感知 lemma。提取纯函数 `getLemmaKeys(word)` 返回待查键序列 `[surface, lemma]`（lemma 取自 `inflections.json`），`batchLookupWords`/`lookupWordInDB` 依次按这些键查 USER/WORDS，使变形词命中原形条目。
- Target: `src/common/storage/indexed-db.ts`
- Env: vitest + jsdom（无 IndexedDB；故核心逻辑下沉为纯函数测试）

## Requirement Authority / Conflict Gate

| Behavior | Baseline | New requirement | Relationship | Result |
| --- | --- | --- | --- | --- |
| DB 查词 | `batchLookupWords` 仅按表面词形精确查 | spec Inflected-form coverage | extends（新增 lemma 回退，不改既有命中） | Proceed |

## Pre-Code TDD Gate

- Behavior contract source: spec Inflected-form coverage
- Gate evidence: Red（纯函数断言级）
- Stub：先建 `getLemmaKeys` 最小可编译桩（仅返回 `[lower]`，无 lemma 行为），写 Red 断言再实现，符合静态类型 Red 规则。
- IndexedDB 集成层在本环境不可运行：`batchLookupWords` 的真实 DB.get 验证记为 Non-TDD 例外，由构建 + Batch 5.2 真实页面手动验证兜底；本批 TDD 覆盖「查哪些键」这一缺陷核心逻辑。

## Test Points

| # | Test point | Source | Method | Layer | Input | Expected | Priority | Coverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B3-1 | 变形词的查询键包含其 lemma | spec | 等价类 | Unit | `getLemmaKeys('studies')` | 含 `study` | P0 | `indexed-db.test.ts` |
| B3-2 | 多映射变形词 | spec | 等价类 | Unit | `getLemmaKeys('played')` | 含 `play` | P1 | 同上 |
| B3-3 | 无映射词只查自身 | spec | 边界 | Unit | `getLemmaKeys('apple')` | `['apple']` | P1 | 同上 |
| B3-4 | 表面词形优先于 lemma | spec | 顺序 | Unit | `getLemmaKeys('studies')[0]` | `studies` | P2 | 同上 |

## Test Data Plan

| Test point | Data | Realism basis |
| --- | --- | --- |
| B3-1..B3-4 | 真实英语变形：studies→study、played→play（均在 inflections.json）；apple 无映射 | 真实词形还原对；inflections.json 为项目既有 lemma 源（单元纯逻辑，最小数据例外不适用——用真实映射） |

## TDD Candidates

| Test point | Why Red | Expected Red |
| --- | --- | --- |
| B3-1 | stub 仅返回 `[lower]`，不含 lemma | `expected ['studies'] to contain 'study'` |

B3-3/B3-4 为守卫（stub 阶段即应通过：apple→['apple']、首元素为 surface）。

## Regression Impact

| Changed item | Impacted behavior | Tests to rerun | Risk |
| --- | --- | --- | --- |
| indexed-db 查词键 | 批量/单词查词命中范围（只新增 lemma 回退） | 全量套件、构建 | Low |

## Non-TDD Exceptions

| Scope | Reason | Alternative validation | Residual risk |
| --- | --- | --- | --- |
| `batchLookupWords` 真实 IndexedDB 命中 | jsdom 无 IndexedDB，未引入 fake-indexeddb | 构建通过 + Batch 5.2 真实页面（studies/plays 等变形词被标注） | 低（键逻辑已单测） |

## Coverage Closure

- Ready for code change: Yes（贴 Red 后）
- Red/守卫覆盖 B3-1..B3-4：Yes
- 备选验证记录：Yes

# Lightweight Test Design — Batch 4 (数据 + 构建脚本)

## Context

- Requirement / Spec: `specs/confusion-dictionary/spec.md`（Non-empty glosses、POS-correct inflection generation）
- Change summary：
  - #8 `scripts/sync-inflections.ts` POS 判定改精确匹配（`e.type === 'verb'/'noun'`）；并**外科式**清理既有错误变形——仅删除「旧 substring 逻辑生成、而新逻辑不再生成、且当前指向该混淆词」的项（不动不规则形和其他来源项），再补正确形。
  - #5 为 26 个空译文词填入中文释义（用户已校对），按现有格式重算根 `meaning`。
- Target：`scripts/sync-inflections.ts`、`src/common/nlp/inflections.json`（重生成）、`public/dictionaries/confusion-map.json`（26 词）
- Env：vitest + jsdom（数据完整性测试直接 import JSON）

## Requirement Authority / Conflict Gate

| Behavior | Baseline | New requirement | Relationship | Result |
| --- | --- | --- | --- | --- |
| 变形生成 POS 判定 | `e.type.includes('verb'/'noun')` 子串误匹配 | spec POS-correct inflection | supersedes（修正缺陷） | Proceed |
| 混淆词译文 | 26 词 `translation` 全空 | spec Non-empty glosses；用户已校对 26 条译文 | extends（补数据） | Proceed |

## Pre-Code TDD Gate

- `sync-inflections.ts` 属一次性/维护脚本：constitution 允许非严格 TDD。但其产物 `inflections.json` 与 `confusion-map.json` 用**数据完整性测试**做断言级 Red→Green 守卫。
- Gate evidence：数据完整性断言级 Red（26 词空 / 坏变形存在）。

## Test Points

| # | Test point | Source | Method | Layer | Expected | Priority | Coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B4-1 | 26 个曾空词的每个 entry translation 非空 | #5 / spec | 数据完整性 | Unit | 全部非空 | P0 | `confusion-data.test.ts` |
| B4-2 | 无 confusion 条目全空译文（meaning 不退化为纯词性符） | #5 / spec | 不变量 | Unit | 0 个全空 | P0 | 同上 |
| B4-3 | inflections.json 不含 adverb/prep 词的动词/复数坏形 | #8 / spec | 数据完整性 | Unit | acrossed/betweened/beyonded… 均 absent | P0 | 同上 |
| B4-4 | 合法 noun/verb 变形保留 | #8 回归 | 守卫 | Unit | books→book、acted→act | P1 | 同上 |

## Test Data Plan

| Test point | Data | Realism basis |
| --- | --- | --- |
| B4-1/2 | 26 词真实多义中文释义（用户校对）；按词性顺序对应 entries | 真实词义 + 产品中文；源自各词 definition |
| B4-3/4 | 已核验坏形（acrossed→across 等）现存、合法形（books→book）现存 | 真实英语词形；inflections.json 实测 |

## TDD Candidates

| Test point | Why Red on current data | Expected Red |
| --- | --- | --- |
| B4-1 | 26 词 translation 全空 | `expected [...26词] to equal []` |
| B4-3 | 坏变形当前存在 | `expected ['acrossed',...] to equal []` |

B4-4 为守卫（实现前后均应 PASS：books/acted 现存且应保留）。

## Regression Impact

| Changed item | Impacted behavior | Tests to rerun | Risk |
| --- | --- | --- | --- |
| confusion-map 26 词 translation/meaning | 注解与弹窗对这些词的显示 | 全量套件、构建、`analyzer.test.ts` | Low |
| inflections.json 重生成 | 词形还原映射（仅删坏形 + 补正确形） | 全量、`getLemmaKeys` 相关 | Low-Medium |

回归核验：重生成后 diff `inflections.json`，确认仅移除 substring-POS 坏形，未误删不规则形/他源项。

## Non-TDD Exceptions

| Scope | Reason | Alternative validation | Residual risk |
| --- | --- | --- | --- |
| `sync-inflections.ts` 脚本本体 | 维护脚本 | 数据完整性测试（B4-3/4）+ 重生成 diff 人工核对 | 低 |

## Coverage Closure

- Ready for code change: Yes（贴 Red 后）
- Red/守卫覆盖 B4-1..B4-4：Yes
- 重生成 diff 核对：实现阶段执行

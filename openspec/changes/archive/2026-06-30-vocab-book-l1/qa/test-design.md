# Lightweight Test Design — vocab-book-l1

## Context

- Requirement / Spec: `specs/vocabulary-management/spec.md`（Time-based grouping、CSV export for Anki/Excel）
- Change summary: 纯前端展示/导出。核心可单测逻辑两块——按添加时间分组 `groupByAddedTime`、CSV 生成 `toCSV`；UI（Options 列表/搜索/导出按钮、Popup 去上限）走手动验证。
- Target: `src/common/utils/vocab.ts`（分组）、`src/common/utils/export.ts`（CSV）；UI `src/options/Options.tsx`、`src/popup/Popup.tsx`
- Env: vitest + jsdom

## Requirement Authority / Conflict Gate

全新能力（`vocabulary-management`），无既有行为冲突；relationship = ADDED。

## Pre-Code TDD Gate

- 核心逻辑（分组边界、CSV 转义/BOM）走严格 Red→Green（纯函数，可测）。
- `downloadCSV`（Blob + `<a download>`）与 UI 组件：jsdom 不便稳定断言下载/渲染，记为 Non-TDD 例外，由手动验证（任务 5.2）兜底。
- 为拿真 Red：先建最小可编译桩（`groupByAddedTime`→`[]`、`toCSV`→`''`），写断言级 Red，再实现。

## Test Points

| # | Test point | Source | Method | Layer | Expected | Priority | Coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | 词按 timestamp 落入正确时间组 | Time grouping | 边界值 | Unit | 今天/本周/本月/更早各归位 | P0 | `vocab.test.ts` |
| T2 | 空组不出现 | Time grouping | 等价类 | Unit | 无该时段词则该组不返回 | P1 | 同上 |
| T3 | 组内/整体按时间倒序 | Time grouping | 排序 | Unit | 新词在前 | P1 | 同上 |
| T4 | CSV 表头 + BOM | CSV export | 数据 | Unit | 以 `﻿` 开头，含 `word,ipa,meaning,context,sourceUrl,date` | P0 | `export.test.ts` |
| T5 | 含逗号/引号/换行的字段被正确转义 | CSV export | 边界 | Unit | 用双引号包裹、内部引号翻倍，不串行 | P0 | 同上 |
| T6 | 中文字段保留、date 由 timestamp 格式化 | CSV export | 数据 | Unit | 中文原样、`YYYY-MM-DD` | P1 | 同上 |

## Test Data Plan

| 测试点 | 数据 | Realism basis |
| --- | --- | --- |
| T1–T3 | 固定 `now` + 构造 today/本周/本月/更早 的 `SavedWord.timestamp` | 真实生词记录形状（word/meaning/timestamp）；分组为纯逻辑，注入 now 保证确定性 |
| T4–T6 | 含逗号「a, b」、引号「he said "hi"」、换行、中文释义的 `SavedWord` | 真实释义可能含标点/中文；CSV 转义是业务正确性关键 |

## TDD Candidates

| 测试点 | Why Red | Expected Red |
| --- | --- | --- |
| T1 | 桩 `groupByAddedTime` 返回 `[]` | `expected [] to ... contain today group` |
| T4 | 桩 `toCSV` 返回 `''` | `expected '' to start with BOM/header` |
| T5 | 桩无转义 | 断言转义结果不符 |

## Regression Impact

| Changed item | Impacted | Tests to rerun | Risk |
| --- | --- | --- | --- |
| 新增 utils + Options/Popup 展示 | 仅生词展示/导出；不动数据结构/存储/注解 | 全量 `npm test` | Low |

## Non-TDD Exceptions

| Scope | Reason | Alternative validation |
| --- | --- | --- |
| `downloadCSV`、Options/Popup 组件 | jsdom 不便稳定断言下载/渲染 | 手动验证（任务 5.2）：Excel 打开不乱码、Anki 导入、Options 看全量/搜索 |

## Coverage Closure

- Ready for code change: Yes（贴 Red 后）
- Red 覆盖 T1/T4/T5；T2/T3/T6 守卫
- UI/下载记 Non-TDD，手动兜底

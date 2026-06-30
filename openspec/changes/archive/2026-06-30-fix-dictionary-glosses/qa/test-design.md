# Lightweight Test Design — fix-dictionary-glosses

## Context

- Spec: `specs/core-dictionary`（译文与 definition 一致、无空译、重生成提升 version）
- 数据修复：以英文 definition 为准校验 `oxford_5000.json` 中译，修不匹配+空译；重跑 generate-dict。
- 可自动断言：数据完整性（无空译、已知错位词显示自身义）。模型逐条校验的"语义正确"靠抽样人工复核。

## Requirement Authority / Conflict Gate

新能力 `core-dictionary`，ADDED；不与既有冲突。

## Pre-Code TDD Gate

- 数据完整性单测做断言级 Red→Green（改数据前 Red：空译存在、appear=食欲）。
- 逐条语义正确性：模型校验 + 抽样人工复核（Non-TDD，记 qa-report）。

## Test Points

| # | Test point | Layer | Expected | Coverage |
| --- | --- | --- | --- | --- |
| D1 | 无空译文 | Unit(数据) | `oxford_5000.json` 无空 translation | `dictionary-data.test.ts` |
| D2 | 已知错位词显示自身义 | Unit(数据) | appear 含「出现」、apple 含「苹果」、appetite 含「食欲」，且 appear 不含「食欲」 | 同上 |

## TDD Candidates

| 测试点 | Why Red | Expected Red |
| --- | --- | --- |
| D1 | 当前 101 条空译 | `expected 101 to be 0` |
| D2 | 当前 appear→食欲 | `expected '食欲…' to contain '出现'` |

## 校验方法（workflow）

12 块（每 500 条）并行：每个 agent 读一块紧凑三元组，逐条判断中译是否与 word/词性/definition 相符；仅返回「不符/空」的修正（index+corrected）。汇总→补丁回写→重生成。保守：只改明显错的，保留正确译文。

## Regression

| Changed | Impacted | Rerun | Risk |
| --- | --- | --- | --- |
| oxford_5000.json translation + 重生成 gz/version | 行内/划词对受影响词的释义 | 全量 npm test + 构建 + 抽样手动 | Low（仅数据；不改逻辑） |

## Non-TDD 例外

逐条语义正确性、客户端重导 → 抽样人工复核 + 手动加载验证（任务 4.2）。

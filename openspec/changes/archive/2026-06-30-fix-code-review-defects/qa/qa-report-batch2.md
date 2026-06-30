# QA Test Report — Batch 2 (scanner 内容过滤纠偏)

## Scope

OpenSpec change `fix-code-review-defects`，Batch 2：#6 恢复 header/footer/aside + role=banner/contentinfo/complementary 硬跳过；#7 rule3 类名 token 精确匹配（去掉 header/footer）；#10 isLikelyUI 仅对「无块级后代」的 leaf-ish 容器做链接密度分析，结构/内容 wrapper 廉价下降；#4 内容地标（main/article）豁免链接密度整块拒绝。需求源：`specs/inline-annotation`。设计见 `qa/test-design-batch2.md`。

## TDD 证据（Red → Green）

| 测试点 | Red（实现前，断言级失败） | Green |
| --- | --- | --- |
| B2-1 footer/aside/contentinfo 不标注 | `expected 1 to be +0` | PASS |
| B2-3 article-header 内容仍标注 | `expected 0 to be ≥ 1` | PASS |
| B2-5 article 内链接卡片不被整块丢弃 | `expected 0 to be ≥ 1` | PASS |

守卫/回归点（实现前即 PASS，证明不引入回归）：B2-2（内容区仍标注）、B2-4（sidebar 仍跳过）、B2-6（深层嵌套正文仍标注）。

## 关键设计修正（Requirement Conflict Gate）

首版实现用「无直接文本即短路下降」，导致 `scanner.test.ts` 两个既有用例失败：
- `should skip sidebars and navigation based on textual features`
- `should skip link-heavy navigation areas even if they are large`

分类：这两个用例保护的是**合法行为**（无类名的纯链接导航应被跳过），非本批要改的缺陷。冲突点：B2-5（article 内链接卡片应标注）vs 上述（裸 body 链接导航应跳过）。判定二者真正的区分维度是**是否在内容地标内**，而非叶子性。

处置（amends，不削弱断言）：改为「有块级后代 → 结构/内容 wrapper，下降不判 UI；仅对 leaf-ish 容器做链接密度；内容地标豁免」。该设计同时满足 B2-5 与两个既有 nav 用例，未修改/弱化任一既有断言。

## 执行证据

- 全量 `npm test`：**29 passed / 0 failed（11 文件）**（含 `scanner.test.ts` 6/6、`scanner.integration.test.ts`、`scanner.batch2.test.ts` 5、Batch 1 套件）。
- 构建 `npm run build`（tsc + vite）：通过（1349 modules，仅既有 icon/chunk 告警）。

## 回归范围

- 受影响：全页扫描的跳过与标注范围。
- 已重跑：`scanner.test.ts`（含 density/punctuation、prose-in-div、spaced-reinforcement）、`scanner.integration.test.ts`、全量套件。
- 风险：Medium → 实测后降为 Low（既有 UI 跳过用例全保留）。

## 行为权衡与剩余风险

- `#10` 量化性能为 Non-TDD 例外：B2-6 深嵌套正确性已守卫；`querySelector(BLOCK_SELECTOR)` 文档序提前返回 + 链接密度仅在 leaf-ish 容器上计算，复杂度由原「每祖先重扫子树」降为近线性。真实大页面手动 smoke 留待 Batch 5.2。
- 区分维度依赖 `main/article/[role=main]` 内容地标。无内容地标包裹（裸 body）的真实正文若同时链接密集且无标点，可能被判 UI——属罕见且与「Stay In Reading 跳过 UI 噪音」目标一致；Batch 5.2 人工核对。

## 结论

Batch 2 四项修复 Red→Green，全量套件与构建通过，既有 nav-skip 用例无回归、无削弱。质量门通过。

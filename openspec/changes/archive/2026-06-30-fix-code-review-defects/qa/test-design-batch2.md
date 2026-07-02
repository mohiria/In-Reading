# Lightweight Test Design — Batch 2 (scanner 内容过滤纠偏)

## Context

- Requirement / Spec: `specs/inline-annotation/spec.md`（Content-region filtering、Bounded scan performance）
- Change summary: #6 恢复 header/footer/aside + role=banner/contentinfo/complementary 硬跳过；#7 rule3 类名按 token 精确匹配（去掉 header/footer）；#10 isLikelyUI 先做廉价类名判定，再对「无直接文本」的纯结构 wrapper 短路下降，仅对承载文本的元素做链接密度计算；#4 内容地标（main/article）豁免链接密度整块拒绝。
- Target: `src/content/engine/scanner.ts`（`SKIP_SELECTOR`、`isLikelyUI`、`createOptimizedWalker`）
- Env: vitest + jsdom，集成测试 `src/test/integration/`

## Requirement Authority / Conflict Gate

| Behavior | Existing baseline | New requirement | Relationship | Result |
| --- | --- | --- | --- | --- |
| 地标区跳过 | 重构删除了 header/footer/aside 硬跳过 | spec Content-region filtering | supersedes（恢复并明确） | Proceed |
| 类名 UI 判定 | `className.includes('header')` 子串匹配 | spec「named like a header not dropped」 | amends | Proceed |
| 链接密集整块拒绝 | rule1 对整子树 FILTER_REJECT | spec「not pruned wholesale」 | amends | Proceed |
| 扫描成本 | 每元素重扫子树 | spec Bounded scan performance | amends（重构） | Proceed |

集成测试 `scanner.integration.test.ts`（Batch 1 已修正）仍须通过：header(role=banner)/nav/footer/标题 0 标注、p1–p5 间隔强化不变。

## Pre-Code TDD Gate

- Behavior contract source: 上述 spec 场景
- Gate evidence type: Red（集成层断言）+ 重构守卫
- #10 性能维度：strict Red-Green 不适用（计时在 jsdom 不稳定），记为 Non-TDD 例外，用「深层嵌套内容仍正确标注」做行为守卫 + 备选验证（真实大页面手动 smoke，Batch 5.2）。

## Test Points

| # | Test point | Source | Method | Layer | Input | Expected | Priority | Coverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B2-1 | footer/aside/role=contentinfo 的散文不被标注 | #6 | 等价类 | Integration | 各区唯一难词 | 这些区 0 难词容器 | P0 | `scanner.batch2.test.ts` |
| B2-2 | 内容区不被地标硬跳过 | #6 | 回归 | Integration | main/article 内难词 | 被标注 | P0 | 同上 |
| B2-3 | class="article-header" 的短无标点内容仍标注 | #7 | 边界 | Integration | div.article-header 含难词 | 难词被标注 | P0 | 同上 |
| B2-4 | 明确 UI 类名（sidebar/navbar）仍被跳过 | #7 | 等价类 | Integration | div.sidebar 含难词 | 0 标注 | P1 | 同上 |
| B2-5 | 内容区链接卡片标题不被整块丢弃 | #4 | 场景 | Integration | article 内多 <a> 卡片 | 标题难词被标注 | P0 | 同上 |
| B2-6 | 深层嵌套正文仍正确标注（#10 短路不破坏内容） | #10 | 结构 | Integration | 50 层 wrapper 套正文 | 难词被标注 | P1 | 同上 |

## TDD Candidates

| Test point | Why Red on current code | Expected Red |
| --- | --- | --- |
| B2-1 | 当前不跳过 footer/aside/contentinfo，难词被标注 | `expected 1+ to be 0` |
| B2-3 | 当前 rule3 `includes('header')` 把 article-header 当 UI 拒绝 | `expected 0 to be ≥1` |
| B2-5 | 当前 rule1 对链接密集子树整块 REJECT | `expected 0 to be ≥1` |

B2-2/B2-4/B2-6 为守卫/回归点（实现前后均应通过，证明不引入新回归）。

## Test Data Plan

| Test point | Data | Realism basis | Setup |
| --- | --- | --- | --- |
| 全部 | 难词 arduous/meticulous/ephemeral/quintessential/ubiquitous/serendipity（均不在真实 confusion-map，避免内部默认词库干扰），mockDict 提供中文释义 | 真实英语高级词 + 中文释义（产品语言）；DOM 模拟 MS Learn / 博客版式 | 每用例独立 `document.body.innerHTML` |

注：`scanAndHighlight` 内部用真实 `defaultConfusionMap`，已核验这些词均 absent，故 mockDict 注入即测试点唯一来源。

## Regression Impact

| Changed item | Impacted behavior | Tests to rerun | Risk |
| --- | --- | --- | --- |
| SKIP_SELECTOR / isLikelyUI / walker | 全页扫描的跳过与标注范围 | `scanner.integration.test.ts`、本批新增、全量 | Medium |

行为权衡（记录）：移除「每祖先链接密度」后，无 nav 标签且无 UI 类名的链接列表（在非内容区）可能不再整块跳过；但其链接文字多为低于用户档的常用词，难词罕见，难词级别词不受影响。真实页面以 Batch 5.2 手动验证兜底。

## Non-TDD Exceptions

| Scope | Reason | Alternative validation | Residual risk |
| --- | --- | --- | --- |
| #10 量化性能 | jsdom 计时不稳定 | B2-6 深嵌套正确性 + 真实大页面手动 smoke（5.2） | 低 |

## Coverage Closure

- Ready for code change: Yes（贴出 Red 后）
- Red / 守卫 覆盖 B2-1..B2-6：Yes
- 回归：`scanner.integration.test.ts` 全量重跑

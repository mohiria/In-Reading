# 轻量测试设计 — known-words-whitelist

## 需求权威来源

`specs/inline-annotation`（抑制门）、`specs/known-words`（手动增删、互斥、可划词查）的 Scenario。与 `docs/product-spec.md`/`README.md` 一致（i+1 只注解认知边界词；白名单让用户剔除已掌握词，提升信噪比）。

## 测试点与分层

| # | 测试点（来源 Scenario） | 层 | TDD |
| --- | --- | --- | --- |
| K1 | 难度达标词在 `knownWords` → `analyzeText` 返回 0 match（抑制） | 单元 | Red→Green |
| K2 | 同一词同时在 `vocabulary` 与 `knownWords` → 仍 1 match（生词本优先） | 单元 | Red→Green |
| K3 | 不在 `knownWords` 的难词仍匹配（不回归） | 单元 | Red→Green |
| K4 | `addKnownWord` 后该词从 vocabulary 移除；`addToVocabulary` 后从 knownWords 移除（互斥） | 单元（chrome.storage mock） | Red→Green |
| K5 | 划词点「标记已掌握」→ 调 `addKnownWord(text)` | 组件 | Red→Green |
| I1 | onChanged：标记已掌握 → `unhighlightWord` 去注解；取消 → 重扫恢复 | 集成 | 手动 |
| I2 | scanner 串参：knownSet 经 scanAndHighlight 传达 analyzeText | 集成 | 手动 |

## TDD 红/异常证据

- K1/K2/K3（analyzer 纯函数）、K5（组件）先写断言级 Red 再实现。K4 用 chrome.storage mock（测试栈已 stub chrome）。
- I1/I2 依赖真实 IndexedDB/DOM 时序与 `chrome.storage.onChanged`，jsdom 无法拿断言级 Red，记非 TDD 例外，备选验证 = 手动（5.2）+ 代码审查。

## 测试数据

- K1：dict `{ obscure: {word:'obscure', meaning:'晦涩的', cefr:['c1']} }`，userLevel CEFR_A1，knownWords `new Set(['obscure'])` → 0 match。
- K2：同上 + vocabulary `new Set(['obscure'])` → 仍 1 match。
- K4：chrome.storage.local mock 起始 `{ vocabulary: [{word:'foo'}], knownWords: [] }`，调 addKnownWord('foo') → vocabulary 不含 foo、knownWords 含 foo。

## 回归范围

- analyzer 现有用例（heteronym、saved base、连字符）须仍绿——新增第 7 参默认空 Set，不影响既有 6 参调用。
- SelectionPopup 现有用例（POS 渲染、ai_cache 命中/写回）须仍绿。
- scanner 集成用例须仍绿（knownWords 默认空 → 行为不变）。

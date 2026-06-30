# QA Test Report — Batch 3 (词形还原覆盖核心词库)

## Scope

OpenSpec change `fix-code-review-defects`，Batch 3：#3 让 IndexedDB 查询感知 lemma。新增纯函数 `getLemmaKeys(word)`→`[surface, lemma]`（lemma 取自 `inflections.json`），`batchLookupWords` 与 `lookupWordInDB` 依序按这些键查 USER/WORDS，结果按表面词形 key，使变形词命中原形条目。需求源 `specs/inline-annotation`。设计见 `qa/test-design-batch3.md`。

## TDD 证据（Red → Green）

| 测试点 | Red（实现前） | Green |
| --- | --- | --- |
| B3-1 `getLemmaKeys('studies')` 含 `study` | `expected ['studies'] to include 'study'` | PASS |
| B3-2 `getLemmaKeys('played')` 含 `play` | `expected ['played'] to include 'play'` | PASS |

守卫点：B3-3（`apple`→`['apple']`）、B3-4（surface 优先，首元素为表面词形）——stub 阶段即 PASS。

## 执行证据

- `indexed-db.test.ts`：4/4 通过。
- 全量 `npm test`：**33 passed / 0 failed（12 文件）**，无回归。
- 构建 `npm run build`：通过。

## 回归范围

- 受影响：批量/单词 DB 查词命中范围（仅新增 lemma 回退，既有精确命中不变；`lookupWordInDB` 在原 suffix 回退之前先试 lemma）。
- 已重跑：全量套件、构建。
- 风险：Low。

## 覆盖与剩余风险

- TDD 覆盖缺陷核心逻辑「查哪些键」（`getLemmaKeys`）。
- Non-TDD 例外：`batchLookupWords` 的真实 IndexedDB 命中在 jsdom 不可运行（未引入 fake-indexeddb），记为例外，由构建 + Batch 5.2 真实页面手动验证兜底（含 studies/plays/played 等变形词被标注）。
- 数据完整性局限（非本批回归）：`inflections.json` 当前对部分变形（running、countries、studied）无映射，源于 `sync-inflections` 的 POS 与规则缺陷——Batch 4 修脚本并重生成后覆盖率提升。本批只负责「有 lemma 就去查 DB」。

## 结论

Batch 3 的 #3 修复 Red→Green，全量套件与构建通过，无回归。质量门通过（DB 集成层以备选验证兜底）。

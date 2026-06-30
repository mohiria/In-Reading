## Context

行内注解（`scanner.ts`→`analyzeText`）只查本地词库；查词在 `src/common/storage/indexed-db.ts`。Batch 3 给 `batchLookupWords`/`lookupWordInDB` 加了 `getLemmaKeys`（表面 + `inflections.json` lemma），但**后缀回退只留在 `lookupWordInDB`**（`s/ed/ing`，行 92-94），`batchLookupWords` 没有，导致行内与划词不一致。`analyzeText` 的已保存判定 `vocabulary.has(baseWord)||has(lowerWord)` 用变形词，存基础词后变形不高亮。Popup 生词搜索缺失（Options 已有）。

## Goals / Non-Goals

**Goals:** 统一两条查词路径的还原逻辑、修好 victims/suffered/threatening 行内显示与「存基础词→变形高亮」、Popup 补搜索；不引入错义。

**Non-Goals:** 连字符复合词分词（life-threatening）；在线/LLM 行内回填（后续 Change）；改 `SavedWord` 结构。

## Decisions

- **统一候选生成 `getLookupCandidates(word)`（纯函数，替代/扩展 `getLemmaKeys`）**，返回去重、有序的候选键：
  1. 表面词 `lower`（**最先**，保证 building/meeting 用自身条目）
  2. `inflections.json` 的 lemma（若存在且不同）
  3. 后缀还原候选：`-ies→y`、`-es→ø`、`-s→ø`、`-ed→ø`/`-e`、`-ing→ø`/`+e`
  消费方（`batchLookupWords`、`lookupWordInDB`）按序查 USER/WORDS，命中即止。安全性来自「表面最先」+「仅当某候选确在词库才命中」。
- **`analyzeText` 已保存判定按基础词**：解析出 `explanation` 后，`isSaved = has(lowerWord) || has(baseWord) || has(explanation.word?.toLowerCase())`，使保存 `victim` 后 `victims` 也判为已保存。
- **`batchLookupWords` 结果键**：仍以**表面词**为键（调用方 `combinedDict[surface]`），但值为命中的基础词条目；配合 `analyzeText` 的 `dict[lowerWord]` 回退即可命中。
- **Popup 搜索**：在 VocabTab 加受控 `input`，内存过滤 `word`/`meaning`（与 Options 同逻辑）。

## Risks / Trade-offs

- [粗暴后缀还原落到词义漂移的他词] → 「先查表面」已保护有独立条目的常见词（building/meeting/meaning/news/series 均有自身条目，实测确认）；残余仅「未收录且还原后漂移」的冷僻词，少见且只是近似，不阻塞。
- [`-ing`/双写/去 e 还原不完美（running→runn 未命中）] → 未命中即不注解，不会给错义；这类词由后续 LLM 按语境兜底。
- [候选过多导致多次 IndexedDB get] → 候选数个位数、命中即止；可接受。

## Migration Plan

纯前端/本地、向后兼容。先扩展 `getLookupCandidates` 单测（Red）→ 实现 → analyzer 已保存单测 → UI；每步 `npm test`，构建后手动验证 victims/suffered/threatening 行内显示与 popup 搜索。

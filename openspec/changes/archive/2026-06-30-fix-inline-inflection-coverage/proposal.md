## Why

5.2 实测发现行内注解的两个缺陷：
1. 屈折/派生形如 `victims`、`suffered`、`threatening` 在页面上不显示翻译——划词能查到（`lookupWordInDB` 有后缀回退），但行内用的 `batchLookupWords` 只有 lemma 表回退、没有后缀回退，且这些词不在 `inflections.json`，于是行内查不到本地词库里的基础词（`victim`/`suffer`/`threaten`）。
2. 即使把基础词加进生词本（如 `victim`），其变形 `victims` 仍不高亮——`analyzeText` 的「已保存」判定用的是变形词而非还原后的基础词。

附带：Popup 生词页没有搜索框（只有 Options 页有），用户希望补上。

安全性：采用「先查表面词，查不到再剥后缀」——`building`/`meeting`/`meaning` 等「变形后词义漂移」的词在词库里都有自己的条目，会被「先查表面」命中、不触发还原，因此不会出现 `building→build` 这类错义。真正未收录/语境敏感的词（如 `life-threatening` 复合词、进阶词）不在本变更范围，留待 LLM 按语境解释。

## What Changes

- `batchLookupWords`（`src/common/storage/indexed-db.ts`）：查词顺序改为「表面词 → `inflections.json` lemma → 后缀还原候选（`-s/-es/-ies/-ed/-ing`）」，命中即用；与划词路径一致。提取可单测的纯函数 `getLookupCandidates(word)`。
- `analyzeText`（`src/common/nlp/analyzer.ts`）：「已保存」判定除 `baseWord`/`lowerWord` 外，**也按解析出的词条基础词（`explanation.word`）匹配**，使保存基础词后其屈折形也高亮。
- `Popup.tsx` 生词页新增搜索框（按 `word`/`meaning` 过滤），与 Options 页一致。

非目标：不处理连字符复合词分词（`life-threatening`）；不引入在线/LLM 行内回填（属后续 Change）。

## Capabilities

### New Capabilities
<!-- 无 -->

### Modified Capabilities
- `inline-annotation`: 细化「未收录表面词」的还原——先查表面、再后缀还原；并使「已保存基础词」高亮其屈折形。
- `vocabulary-management`: Popup 生词预览新增搜索过滤（此前仅 Options）。

## Impact

- 代码：`src/common/storage/indexed-db.ts`（`getLookupCandidates` + `batchLookupWords`/`lookupWordInDB` 复用）、`src/common/nlp/analyzer.ts`（已保存判定）、`src/popup/Popup.tsx`（搜索框）。
- 无数据结构/依赖/权限变更；不涉及网络。
- 影响测试：`src/test/unit/indexed-db.test.ts`（扩展 `getLookupCandidates`）、`src/test/unit/analyzer.test.ts`（已保存基础词高亮）。

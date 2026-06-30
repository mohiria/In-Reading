# Design

## A. 连字符整词注解（`src/common/nlp/analyzer.ts`）

唯一承重改动是 `analyzeText` 的分词正则（`analyzer.ts:23`）：
```
- const regex = /\b[a-zA-Z]{3,}\b/g
+ const regex = /[A-Za-z]+(?:-[A-Za-z]+)+|[a-zA-Z]{3,}/g
```
复合词分支在前、整体优先匹配。现有循环无需改结构：`match[0]` 含连字符；`baseWord = inflections[lower] || lower`（复合词不在 inflections，用整词）；查 `activeMap[整词] / dict[整词]`，命中 push 单 result（`word=整词`、`length=整词长度`），不命中 `continue`。复合分支贪婪整体消费，部件不再被单独匹配 → 命中不了即不注解。渲染管线（`scanner.ts` 的 `index/length` 切片、`createWordContainer`、`unhighlightWord` 属性选择器）对含连字符的 `word` 天然兼容。开 AI 时 `extractCandidates` 已把整词送回填、进 `backfillDict`，Phase2 用新正则即渲染为单注解。

## B. 词库缓存强制刷新（不动生词本）

- `indexed-db.ts` 新增 `resetDictionaryCache()`：`clear(WORDS)` + `clear(AI_CACHE)` + `delete(META,'version_info')`，**不碰 USER**；`forceReimportDictionary()` = reset 后立即 `checkAndUpdateDictionary()`。
- `background/index.ts` 加 `chrome.runtime.onInstalled` → `resetDictionaryCache()`（SW 与 content 同源共享 IndexedDB）。
- `options/Options.tsx` 加「重置词库缓存」按钮 → `forceReimportDictionary()` → 提示刷新页面。

生词本权威存储是 `chrome.storage.local.vocabulary`，`user_words` 仅副本；本设计不触及二者，故零影响。

## C. 划词复用本地缓存（`src/content/components/SelectionPopup.tsx`）

现有本地预查块（`:59-60`）补 `getAiCache([lowerText])`：命中则把 `AiCacheEntry`（meaning/ipa_us/ipa_uk/source）映射成与 `lookupWordInDB` 同形的 explanation（含按发音偏好算 `ipa`），走现有「`isSaved || localExp` → 即时渲染、return、不发 `TRANSLATE_WORD`」分支。不改 `handleTranslationRequest`（预查已覆盖）。

## 测试策略

- A：单元（analyzer.test.ts）强 Red→Green——整词命中返回单 match；仅含部件时整词返回 0 match；普通词不回归。
- C：组件（SelectionPopup.test.tsx）——mock `getAiCache` 命中时即时渲染、不调 `sendMessage`。
- B：jsdom 无 IndexedDB / 无 `onInstalled`，属集成时序，文档化非 TDD 例外 + 手动验证。

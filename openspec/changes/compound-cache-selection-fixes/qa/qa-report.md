# QA 报告 — compound-cache-selection-fixes

## 范围

三项体验修复：A 连字符复合词整词注解（`inline-annotation`）、B 词库缓存强制刷新（`core-dictionary`）、C 划词复用本地 AI 缓存（`selection-translation`）。

## 分层与执行证据

| 层 | 对象 | 证据 |
| --- | --- | --- |
| 单元（TDD）| A：`analyzeText` 分词 | `analyzer.test.ts` A1/A2/A3 Red→Green；analyzer 6/6 |
| 组件（TDD）| C：`SelectionPopup` ai_cache 预查 | `SelectionPopup.test.tsx` C1 Red→Green；2/2 |
| 全量回归 | 现有 analyzer/scanner/popup 等 | `npx vitest run` 17 文件 / 60 用例全通过 |
| 构建 | TS 全量编译 + content/background 双 bundle | `npm run build` 通过 |
| 集成（手动）| B：`resetDictionaryCache`/onInstalled/按钮 | jsdom 无 IndexedDB / 无 `chrome.runtime.onInstalled` → 留 4.2 手动 |

## TDD 证据

- **A1**（整词命中单注解）：Red `expected +0 to be 1`（旧正则把 `anti-migrant` 拆为两 match）→ 改正则后 Green，返回 1 个 match、`word==='anti-migrant'`、`length===12`。
- **A2**（不拆部件）：Red `expected { word: 'migrant', … } to be undefined`（旧逻辑注解了部件 `migrant`）→ Green，整词不命中即 0 注解。
- **A3**（普通词不回归）：始终 Green。
- **C1**：Red（`findByText('机缘巧合')` 未找到，因组件未查 ai_cache、走了网络分支）→ 补 `getAiCache` 预查后 Green，且断言未发 `TRANSLATE_WORD`。

## 关键设计与可审性

- **A**：唯一承重改动是 `analyzer.ts:23` 分词正则 `/[A-Za-z]+(?:-[A-Za-z]+)+|[a-zA-Z]{3,}/g`（复合分支贪婪优先）；渲染管线、Phase2 回填天然兼容。
- **B**：`resetDictionaryCache` 只清 `words`+`ai_cache`、删 `version_info`，**显式不碰 `user_words`/`chrome.storage`**；`onInstalled` 重置 → 下次扫描重导；Options「重置词库缓存」按钮即时 reset+reimport。
- **C**：预查顺序 confusion-map → `lookupWordInDB`(核心词库) → `getAiCache`(AI 回填)，命中即走现有即时渲染分支、不发网络；`handleTranslationRequest` 不改（预查已覆盖）。

## 非 TDD 例外（B）

jsdom 无 `indexedDB`、无 `chrome.runtime.onInstalled`，`resetDictionaryCache`/onInstalled/Options 按钮属集成时序，无法在当前测试栈拿断言级 Red。备选验证：代码审查 + 4.2 手动。剩余风险：onInstalled 在某些浏览器对「重载 unpacked 扩展」是否必触发存在差异；Options 手动按钮为兜底。

## 剩余风险 / 待手动验证（4.2）

- Brave 读 BBC 测试页（开 AI）：`anti-migrant` 单注解；重载扩展后无需手删 IndexedDB 即见修正释义；Options 按钮即时刷新且生词本仍在；划词已回填进阶词即时出、无 loading。
- 取舍：不在词库的复合词（`well-being` 等）不再注解其部件——已与用户确认接受。

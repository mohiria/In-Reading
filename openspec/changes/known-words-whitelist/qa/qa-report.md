# QA 报告 — known-words-whitelist

## 范围

「已掌握」白名单(生词本镜像反面):手动标记的词不再被行内注解(只压「难度达标」路径,生词本仍优先);与生词本互斥;本地存储、无 IndexedDB、无 gloss。改 `inline-annotation`,新增 `known-words` 能力。

## 分层与执行证据

| 层 | 对象 | 证据 |
| --- | --- | --- |
| 单元(TDD) | A 注解门 `analyzeText` | `analyzer.test.ts` K1/K2/K3,K1 断言级 Red→Green;9/9 |
| 单元(TDD) | 存储互斥 | `knownWords.test.ts` K4a/K4b（chrome.storage mock + 桩 initDB）Green;2/2 |
| 组件(TDD) | 划词按钮 | `SelectionPopup.test.tsx` K5,断言级 Red(按钮缺失)→Green;4/4 |
| 全量回归 | analyzer/scanner/popup/options 等 | `npx vitest run` 18 文件 / 68 用例全通过 |
| 构建 | TS 全量 + content/background 双 bundle | `npm run build` 通过 |
| 集成(手动) | scanner 串参、onChanged 外科更新 | jsdom 无 IndexedDB / 无 `chrome.storage.onChanged` 真实时序 → 5.2 手动 |

## TDD 证据

- **K1**(抑制):Red `expected { word: 'obscure', … } to be undefined`(现状忽略 knownWords)→ 加门后 Green。
- **K2**(生词本优先):同时在 vocab+known → 仍注解(`isSavedWord` 胜)。
- **K3**(不回归):不在 known 的难词仍注解。
- **K4a/K4b**(互斥):`addKnownWord('foo')` 后 vocabulary 无 foo;`addToVocabulary('bar')` 后 knownWords 无 bar。
- **K5**(划词按钮):Red「Unable to find /标记已掌握/」→ 加按钮+`onToggleKnown` 后 Green,断言 `addKnown('tear')` 被调用。

## 关键设计

- 注解门:`isSavedWord || (isHardEnough && !isKnown)`(`analyzer.ts`),`isKnown` 三形态(baseWord/lowerWord/resolvedWord)同 `isSavedWord`。`knownWords` 为第 7 参默认空 Set,既有 6 参调用不破。
- 串参:`scanAndHighlight`→`annotateBlocks`→`processTextNode`→`analyzeText`;Phase2 `runBackfill` 也排除 known 词(不浪费 LLM)并在二次注解传递。
- 互斥:`knownWords.ts` 单向 import `removeFromVocabulary`;`vocabulary.ts` 内联移除 knownWords 键(避免循环依赖)。
- onChanged:known 加→`unhighlightWord` 即时去注解;减→`runScan(true)` 恢复。互斥触发的 vocab 分支幂等无冲突。
- 存储:`chrome.storage.local` 键 `knownWords`(小写词数组),无 IndexedDB。

## 非 TDD 例外(集成时序)

scanner 串参全链路、`content/index.tsx` 的 onChanged 外科更新依赖真实 DOM + `chrome.storage.onChanged`,jsdom 无法拿断言级 Red。备选验证:单元已覆盖注解门(analyzeText 直接传 knownWords)、互斥(存储)、按钮(组件);端到端留 5.2 手动 + 代码审查。

## 剩余风险 / 待手动验证(5.2)

- Brave 读 BBC(开 AI):划被注解的词 → 标记已掌握 → 立即去注解,刷新/换页不复现;同词再划仍可查、按钮「取消已掌握」,取消后恢复注解;标记已掌握的词若在生词本则自动移出(反之亦然),两列表不重叠;Options「已掌握」区可搜/移除并恢复注解。

# Design

镜像生词本基础设施,但更简单:本地单键、无 IndexedDB、无 gloss。

## 存储 `src/common/storage/knownWords.ts`（新建）

- `getKnownWords(): Promise<string[]>` — 读 `chrome.storage.local` 键 `knownWords`。
- `addKnownWord(word)` — 去重小写写入;互斥:import 并调 `removeFromVocabulary(word)`（单向依赖）。
- `removeKnownWord(word)` — 过滤写回。
- 互斥另一向:`vocabulary.ts` 的 `addToVocabulary` **内联**移除 `knownWords` 键中的该词（不 import knownWords.ts，避免循环依赖）。

## Hook `src/common/hooks/useKnownWords.ts`（新建）

镜像 `useVocabulary`:监听 `area==='local' && changes.knownWords`,暴露 `knownWords`/`addKnownWord`/`removeKnownWord`。

## 注解门 `src/common/nlp/analyzer.ts`

`analyzeText` 加 `knownWords: Set<string>` 第 7 参（confusionMap 之后，默认空 Set）。门:
```ts
const isKnown = knownWords.has(baseWord) || knownWords.has(lowerWord) || (!!resolvedWord && knownWords.has(resolvedWord))
if (isSavedWord || (isHardEnough && !isKnown)) { ... }
```
已掌握只压「难度达标」路径;生词本优先（防御）。三形态检查同 `isSavedWord`。

## Scanner 串参 `src/content/engine/scanner.ts`

`knownWords` 从 `scanAndHighlight`（末位新增，默认空 Set）→ `annotateBlocks` → `processTextNode` → `analyzeText(…, pronunciation, undefined, knownWords)`（第 6 位传 undefined 用默认 confusionMap）。

## Scanner 入口 + onChanged `src/content/index.tsx`

- `runScan`:`Promise.all` 加 `getKnownWords()`，构建 `knownSet` 传入。
- `onChanged` 新增 `else if (area==='local' && changes.knownWords && tabEnabled)`:新增词 → `unhighlightWord` 抹注解;移除词 → `runScan(true)`。互斥触发的 vocab 分支幂等无冲突。

## UI

- `SelectionPopup.tsx`:引 `useKnownWords`，计算 `isKnown`，加第二按钮「标记已掌握/取消已掌握」→ `onToggleKnown`。
- `Options.tsx`:镜像生词本 section 加「已掌握」section（搜索 + 扁平列表 + 移除）。

## 测试

- 单元（analyzer）K1 抑制 / K2 生词本优先 / K3 不回归;单元（knownWords，chrome.storage mock）K4 互斥;组件 K5 划词按钮。
- onChanged/串参属集成时序（jsdom 无），手动验证 + 代码审查，记非 TDD 例外。

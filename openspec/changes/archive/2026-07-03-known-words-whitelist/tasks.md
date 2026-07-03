## 1. 注解抑制门（QA 前置，核心行为）

- [x] 1.1 出 `qa/test-design.md`（K1 抑制、K2 生词本优先、K3 不回归、K4 互斥、K5 划词按钮）
- [x] 1.2 写 Red 单测（`analyzer.test.ts`）：K1 难词在 knownWords → 0 match（断言级 Red `expected {...} to be undefined`）；K2/K3 守护
- [x] 1.3 `analyzer.ts` 加 `knownWords` 第 7 参 + 门 `isSavedWord || (isHardEnough && !isKnown)` → K1/K2/K3 Green（9/9）

## 2. 存储 + Hook + 互斥

- [x] 2.1 新建 `knownWords.ts`：`getKnownWords`/`addKnownWord`(互斥调 removeFromVocabulary)/`removeKnownWord`
- [x] 2.2 `vocabulary.ts` `addToVocabulary` 内联移除 knownWords 键（避免循环依赖）
- [x] 2.3 K4 单测（`knownWords.test.ts`，chrome.storage mock + 桩 initDB）：K4a/K4b 互斥 Green（2/2）
- [x] 2.4 新建 `useKnownWords.ts`（镜像 useVocabulary，监听 changes.knownWords/vocabulary）

## 3. Scanner 串参 + 入口 + onChanged

- [x] 3.1 `scanner.ts`：`knownWords` 串过 scanAndHighlight→annotateBlocks→processTextNode→`analyzeText(…, undefined, knownWords)`；runBackfill 也排除 known 并传递
- [x] 3.2 `content/index.tsx` runScan：Promise.all 加 getKnownWords，构建 knownSet 传入
- [x] 3.3 `content/index.tsx` onChanged：新增 knownWords 分支（加→unhighlightWord，删→runScan(true)）
- [x] 3.4 集成时序（jsdom 无）→ 文档化非 TDD 例外 + 手动验证（5.2）

## 4. UI

- [x] 4.1 K5 组件测试（`SelectionPopup.test.tsx`）：点「标记已掌握」调 addKnown(text)，断言级 Red（按钮缺失）→ Green
- [x] 4.2 `SelectionPopup.tsx`：useKnownWords + onToggleKnown + 第二按钮（标记/取消已掌握）
- [x] 4.3 `Options.tsx`：新增「已掌握 ({n})」section（搜索 + 扁平列表 + 移除）

## 5. 验证与提交

- [x] 5.1 全量 `npx vitest run` 68/68 + `npm run build` 通过；出 `qa/qa-report.md`
- [x] 5.2 手动（Brave 读 BBC，开 AI）：标记已掌握→立即去注解、刷新不复现；再划仍可查、可取消恢复；与生词本互斥；Options 可搜/移除恢复（用户已验证通过）
- [x] 5.3 提交（Conventional Commits，中文正文）

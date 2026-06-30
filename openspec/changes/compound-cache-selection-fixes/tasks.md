## 1. A — 连字符整词注解

- [x] 1.1 出 `qa/test-design.md`（测试点：整词命中单注解、仅含部件时整词 0 注解、普通词不回归）
- [x] 1.2 写 Red 单测（`analyzer.test.ts` A1/A2/A3）：贴出断言级 Red（A1 expected 1 got 0；A2 migrant 被误注解）
- [x] 1.3 改 `analyzer.ts:23` 正则为连字符感知 → 单测 Green（analyzer 6/6）

## 2. B — 词库缓存强制刷新（不动生词本）

- [x] 2.1 `indexed-db.ts` 新增 `resetDictionaryCache()`（clear WORDS+AI_CACHE、delete version_info，不碰 USER）与 `forceReimportDictionary()`
- [x] 2.2 `background/index.ts` 加 `chrome.runtime.onInstalled` → `resetDictionaryCache()`
- [x] 2.3 `options/Options.tsx` 加「维护 → 重置词库缓存」按钮 → `forceReimportDictionary()` → 完成提示刷新页面
- [x] 2.4 jsdom 无 IndexedDB/onInstalled → 文档化非 TDD 例外（见 qa-report），手动验证留 4.2

## 3. C — 划词复用本地缓存

- [x] 3.1 写 Red 组件测试（`SelectionPopup.test.tsx` C1）：mock `getAiCache` 命中 → 断言渲染释义且不调 `TRANSLATE_WORD`；贴出 Red（findByText 机缘巧合 未找到）
- [x] 3.2 `SelectionPopup.tsx` 本地预查补 `getAiCache`（confusion → lookupWordInDB → ai_cache）→ 测试 Green（2/2）

## 4. 验证与提交

- [x] 4.1 全量 `npx vitest run` 60/60 + `npm run build` 通过；出 `qa/qa-report.md`
- [ ] 4.2 手动（Brave 读 BBC 测试页，开 AI）：anti-migrant 单注解；重载扩展自动重导词库；Options 按钮即时刷新且生词本仍在；划词已回填进阶词即时出（待用户验证）
- [x] 4.3 提交（Conventional Commits，中文正文）

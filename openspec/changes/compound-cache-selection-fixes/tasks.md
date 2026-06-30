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

## 3b. 跟进修复（用户验证发现）

- [x] 3b.1 #2 重置后仍显示旧译：`batchLookupWords`/`lookupWordInDB` 改为 WORDS 优先（两遍：先核心词库全候选，再 user_words 兜底），核心词库永不被陈旧 user_words 快照遮蔽
- [x] 3b.2 #2 scanner 查全部候选（不再排除 userDict 命中词），核心词库覆盖 userDict 快照；集成测试 `scanner.integration P1` Red（显示「食欲」）→ Green（「出现」）
- [x] 3b.3 #4 划词第二次仍加载：`SelectionPopup` 网络结果成功后 `putAiCache`（单词），重复划词即时命中；组件测试 C2 Green
- [x] 3b.4 user_words 的 WORDS 优先属 IndexedDB 时序（jsdom 无），文档化非 TDD 例外 + 手动验证

## 4. 验证与提交

- [x] 4.1 全量 `npx vitest run` 60/60 + `npm run build` 通过；出 `qa/qa-report.md`
- [ ] 4.2 手动（Brave 读 BBC 测试页，开 AI）：anti-migrant 单注解；重载扩展自动重导词库；Options 按钮即时刷新且生词本仍在；划词已回填进阶词即时出（待用户验证）
- [x] 4.3 提交（Conventional Commits，中文正文）

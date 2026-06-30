## 1. QA 前置（纯函数核心逻辑）

- [ ] 1.1 出 `qa/test-design.md`（轻量测试设计）：覆盖时间分组（今天/本周/本月/更早边界）与 CSV 生成/转义（逗号/引号/换行/中文 BOM）测试点，来源为 specs `vocabulary-management` 的 Scenario
- [ ] 1.2 先写 Red 单测（`src/test/unit/`）：`groupByAddedTime` 边界用例 + `toCSV` 转义/表头/BOM 用例；跑出断言级失败并贴输出

## 2. 核心纯函数实现（Green）

- [ ] 2.1 实现时间分组纯函数（按 `SavedWord.timestamp` → 今天/本周/本月/更早，组内倒序，空组省略；本地时区、固定周起始），放 `src/common/utils/`
- [ ] 2.2 实现 `src/common/utils/export.ts`：`toCSV(words)` 输出 UTF-8 BOM + 表头 `word,ipa,meaning,context,sourceUrl,date`，逐字段 CSV 转义，`ipa` 走 `formatIPA`、`date` 由 timestamp 格式化为 `YYYY-MM-DD`；`downloadCSV(filename, csv)` 用 `Blob` + `<a download>` 触发下载
- [ ] 2.3 单测转 Green；`npm test`

## 3. Options 生词本区

- [ ] 3.1 `src/options/Options.tsx` 新增「生词本」区：复用 `useVocabulary`，按时间分组渲染全量列表（不再限 20），每条显示 word + `formatIPA(ipa)` + meaning + 删除按钮
- [ ] 3.2 加搜索框：按 `word`/`meaning` 大小写不敏感过滤
- [ ] 3.3 加「导出 CSV」按钮，调用 `toCSV` + `downloadCSV`；空列表时禁用或导出仅表头

## 4. Popup 去上限 + 入口

- [ ] 4.1 `src/popup/Popup.tsx` VocabTab 去掉 `vocabulary.slice(0, 20)`（或预览仍限量但明确）
- [ ] 4.2 加「查看全部」入口：`chrome.runtime.openOptionsPage()`

## 5. 验证与提交

- [ ] 5.1 `npm run build` + `npm test` 全绿；出 `qa/qa-report.md`
- [ ] 5.2 手动：保存 >20 词 → Options 看到全量、时间分组正确、搜索可用；导出 CSV 用 Excel 打开中文不乱码、在 Anki `File→Import` 能按字段映射导入
- [ ] 5.3 提交（Conventional Commits，中文正文）

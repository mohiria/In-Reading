## 1. QA 前置（纯逻辑）

- [ ] 1.1 出 `qa/test-design.md`：覆盖 `getLookupCandidates`（表面优先、屈折/后缀候选、building 不被还原）与 analyzer「存基础词→变形判为已保存」测试点，来源 specs `inline-annotation`
- [ ] 1.2 写 Red 单测：扩展 `src/test/unit/indexed-db.test.ts`（`getLookupCandidates('victims')` 含 `victim`、`'suffered'` 含 `suffer`、`'building'` 首项为 `building`、`'cities'` 含 `city`）；`src/test/unit/analyzer.test.ts` 新增「保存基础词后变形被标注」用例；跑出断言级失败并贴输出

## 2. 查词候选与还原（Green）

- [ ] 2.1 在 `src/common/storage/indexed-db.ts` 实现 `getLookupCandidates(word)`：表面 → inflections lemma → 后缀候选（`-ies→y`、`-es`、`-s`、`-ed→ø/-e`、`-ing→ø/+e`），去重有序
- [ ] 2.2 `batchLookupWords` 与 `lookupWordInDB` 改为按 `getLookupCandidates` 顺序查 USER/WORDS（表面最先、命中即止），结果按表面词为键
- [ ] 2.3 单测转 Green；`npm test`

## 3. 已保存按基础词判定（Green）

- [ ] 3.1 `src/common/nlp/analyzer.ts`：`isSavedWord` 增加按 `explanation.word`（基础词）匹配
- [ ] 3.2 analyzer 单测转 Green

## 4. Popup 搜索

- [ ] 4.1 `src/popup/Popup.tsx` VocabTab 加搜索框（受控 input，按 `word`/`meaning` 大小写不敏感过滤），过滤后仍可删除

## 5. 验证与提交

- [ ] 5.1 `npm run build` + `npm test` 全绿；出 `qa/qa-report.md`
- [ ] 5.2 手动：开启注解读含 victims/suffered/threatening 的页面 → 行内显示翻译；存 `victim` → `victims` 高亮；building/meeting 仍显示自身释义（不被误还原）；popup 搜索可用
- [ ] 5.3 提交（Conventional Commits，中文正文）

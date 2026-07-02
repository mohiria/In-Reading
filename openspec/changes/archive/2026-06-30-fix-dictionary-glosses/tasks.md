## 1. 导出与分块

- [x] 1.1 一次性脚本导出紧凑三元组 `{index,word,type,def,tr}`（scratchpad/dictchunks），按 500 条/块切 12 块（chunk-00..11）
- [x] 1.2 空译文（共 101 条）与错位簇（app- 等）随块校验，错位集中在 chunk-00/01（早字母区）

## 2. 模型校验 + 修正补丁（QA 前置：先定数据完整性断言）

- [x] 2.1 出 `qa/test-design.md`：测试点 = 「无空译文」「已知错位词显示自身义（appear=出现/apple=苹果/appetite=食欲）」「译文与 definition 一致（抽样）」
- [x] 2.2 写 Red 数据完整性单测（`src/test/unit/dictionary-data.test.ts`）：导入 `oxford_5000.json`，断言无空 translation、`appear` 含「出现」不含「食欲」、`apple` 含「苹果」、`appetite` 含「食欲」——初始 Red
- [x] 2.3 驱动本机 codex 逐块校验（以英文 definition 为标准答案），仅对「不符/空」产出 `{index,corrected}` 到 `scratchpad/fixes-NN.json`；共 305 条修正（chunk-00=143、01=100，余簇零散）

## 3. 回写与重生成

- [x] 3.1 确定性补丁脚本 `apply-fixes.cjs`：合并 12 个 fixes，按 index 仅改 `translation`，2 空格缩进写回，`JSON.parse` 校验
- [x] 3.2 应用 305 条（0 缺失）；校验仅 `translation` 字段变动（其余 7 字段 0 变更）、词身一致、anchors 正确；另删除一个空词残键 `definition`（生成伪条目，致 1 条空译）→ 空译归零
- [x] 3.3 `npx tsx scripts/generate-dict.ts` 重建 `public/data/dictionary-core.json.gz`（4954 条）+ `version.json`（version 已提升至新 Date.now()，触发 IndexedDB 重导）

## 4. 验证与提交

- [x] 4.1 数据完整性单测转 Green（D1/D2 2/2）；全量 `npm test` 56/56、`npm run build` 通过；出 `qa/qa-report.md`
- [ ] 4.2 手动：加载新 dist，读含 appear/apple/appeared 的页面 → 显示正确释义；空译词有释义（待用户验证）
- [x] 4.3 提交（Conventional Commits，中文正文；含 oxford 数据 + gz/version 重生成）

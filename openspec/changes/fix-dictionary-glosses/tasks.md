## 1. 导出与分块

- [ ] 1.1 写一次性脚本导出紧凑三元组 `index|word|type|definition|translation`（到 scratchpad/临时文件），按块切分（如每块 ~1500 条）
- [ ] 1.2 先单列出全部 101 条空译文（必改）与已知错位簇（app- 等）作为优先批

## 2. 模型校验 + 修正补丁（QA 前置：先定数据完整性断言）

- [ ] 2.1 出 `qa/test-design.md`：测试点 = 「无空译文」「已知错位词显示自身义（appear=出现/apple=苹果/appetite=食欲）」「译文与 definition 一致（抽样）」
- [ ] 2.2 写 Red 数据完整性单测（`src/test/unit/`）：导入 `oxford_5000.json`，断言无空 translation、且 `appear` 译文含「出现」不含「食欲」、`apple` 含「苹果」、`appetite` 含「食欲」——当前应失败
- [ ] 2.3 模型逐块校验：对每块判断中文译文是否与 word/词性/definition 相符；对「不符」与「空」生成修正中文简释，累积补丁 `{index: newTranslation}`；记录旧→新到 `qa/`

## 3. 回写与重生成

- [ ] 3.1 写确定性补丁脚本：按 index 仅改 `oxford_5000.json` 的 `translation`，其它字段/键序不动；改后 `JSON.parse` 校验
- [ ] 3.2 应用补丁；`git diff` 抽查若干条（含 app- 簇、空译样本）
- [ ] 3.3 `npx tsx scripts/generate-dict.ts` 重建 `public/data/dictionary-core.json.gz` + `version.json`，确认 `version` 提升

## 4. 验证与提交

- [ ] 4.1 数据完整性单测转 Green；全量 `npm test` + `npm run build` 通过；出 `qa/qa-report.md`（覆盖范围、改动条数、未扫部分说明）
- [ ] 4.2 手动：加载新 dist，读含 appear/apple/appeared 的页面 → 显示正确释义；空译词有释义
- [ ] 4.3 提交（Conventional Commits，中文正文；可分块多次提交，末次含 gz/version 重生成）

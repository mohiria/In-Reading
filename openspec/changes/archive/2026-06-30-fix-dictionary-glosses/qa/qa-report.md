# QA 报告 — fix-dictionary-glosses

## 范围

修复核心词库 `oxford_5000.json` 的中文 `translation` 字段错位/空译。`word/type/cefr/phon_*/definition/example` 此前均正确，**英文 definition 作为校验标准答案**。

## 执行证据

| 项 | 结果 |
| --- | --- |
| 修正条数 | 305 条 `translation`（chunk-00=143、01=100，其余 10 块共 62；错位集中早字母区）|
| 字段隔离 | 仅 `translation` 变动；`word/type/cefr/definition/example/phon_br/phon_n_am` 共 0 处变更（逐键 diff 校验）|
| 词身一致 | 305 个被改 index 在 HEAD 与分块快照中 `word` 全等（0 mismatch），排除分块陈旧/错位 |
| 空译 | 由 101→0；额外删除 1 个空词残键 `definition`（生成伪条目）|
| 重生成 | `dictionary-core.json.gz` 4954 条；`version.json` version 已提升（触发既有安装 IndexedDB 重导）|

## TDD 证据（数据完整性断言）

- 测试：`src/test/unit/dictionary-data.test.ts`
- **D1 无空译**：初始 Red（101 空）→ Green（0 空）
- **D2 错位锚点**：初始 Red（appear→「食欲」）→ Green（appear=出现、apple=苹果、appetite=食欲）
- 锚点旧→新实证：appear「食欲」→「出现」；apple「申请」→「苹果」；appetite「苹果」→「食欲」（典型移位错位）

## 全量执行

- `npx vitest run`：17 文件 / 56 用例全通过
- `npm run build`：通过（dictionary-core.json.gz 676.78 kB）

## 分工与可审性

- codex（本机，已认证）只读分块、产出 `{index,corrected}`，**不写仓库**；最终改动由确定性脚本 `apply-fixes.cjs` 按 index 仅改 translation 产生，`git diff` 可逐条审。
- 抽样人工复核 codex 译文（appear/apple/appetite 锚点 + chunk-01 前 8 条空译填充）均与 definition 相符、简明准确。

## 附带修复：词库重导竞态（致页面不刷新）

排查「页面 appear 仍显示旧译」时定位到 `dictionary-service.ts:11` 的 `checkAndUpdateDictionary()` 为 fire-and-forget：版本提升后，`content/index.tsx` 的首次 `runScan` 跑在重导（clear + 重写 ~5k 词）之前，读到旧 IndexedDB 数据。改为 `await`，首次扫描即用新数据；版本未变时仅多一次 version.json 拉取，开销可忽略；失败仍降级到既有库。非 TDD 例外：jsdom 无 IndexedDB / 无 `chrome.runtime.getURL` fetch，竞态属集成时序，靠 5.2 手动（重载扩展+页面一次，appear 显示「出现」）验证。

## 剩余风险 / 未决

- 4.2 手动验证（加载 dist 实读页面）待用户确认。
- codex 仅修「错/空」，未改判为「正确」的译文（5639 条未改）未逐条人工复核；D2 锚点 + 抽样作为质量门，未发现系统性误判。

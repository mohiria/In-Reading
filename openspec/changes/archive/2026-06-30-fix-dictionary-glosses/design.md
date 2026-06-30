## Context

`oxford_5000.json`（5944 条，键为 "0".."N"）→ `scripts/generate-dict.ts` 按 word 分组、用 `short_translation`/`translation` 组装 `meaning` → `public/data/dictionary-core.json.gz` → IndexedDB（`indexed-db.ts` 按 `version.json` 的 `version` 判断是否重导）。实测：仅 `translation` 在若干区段错位（app- 簇等）+ 101 空译；`word/type/cefr/phon_*/definition/example` 均正确。882 个"重复 word"是多词性条目，正常。

## Goals / Non-Goals

**Goals:** 让每条中文译文与其 word/词性/英文 definition 一致、无空译；重生成产物并提升 version；保留已正确译文；过程可复核。

**Non-Goals:** 改词形还原；运行时在线/LLM 回填；动 confusion-map；改 `meaning` 组装格式。

## Decisions

- **以英文 definition 为标准答案，模型校验**：导出紧凑三元组 `index | word | type | definition | translation`，模型逐条判断中文译文是否与 word/词性/definition 相符；**仅对「不符」与「空」生成修正中文简释**（风格与现有一致：简洁、必要时带极简括注），保留相符的。无需外部 API。
- **分块校验**：5944 条 ≈ 163K 字符，分多块导出/读取/判定，产出累积的修正补丁 `{index: newTranslation}`。
- **回写用补丁脚本（确定性）**：一个脚本读补丁、按 index 写回 `oxford_5000.json` 的 `translation`，不动其它字段；避免手改大 JSON 出错。
- **重生成**：`npx tsx scripts/generate-dict.ts` 重建 gz + `version.json`（其 `version` 用 `Date.now()`，天然递增 → 触发客户端重导）。
- **可复核**：把"改了哪些 index / 旧→新"写进 `qa/` 便于人工抽查。

执行加速（可选）：规模较大，可用多智能体 workflow 并行校验各块——**需用户显式确认**后才启用；否则模型内联分块完成。

## Risks / Trade-offs

- [模型校验误判：把正确的判成错、或新译不准] → 只改「明显不符/空」，保守保留；对 app- 等已知簇与抽样做人工复核（QA 记录旧→新）。
- [全量人工/模型逐条成本高] → 分块；优先必改的空译(101) + 已发现错位簇，再扫其余；记录覆盖范围，未扫部分显式说明。
- [回写破坏 JSON 结构] → 补丁脚本只改 `translation` 字段值、保留键序与其它字段；改完 `JSON.parse` 校验 + `git diff` 抽查。
- [version 未提升导致客户端不刷新] → 重跑 generate-dict 必产生新 `version`（Date.now()）；验证 version.json 变化。

## Migration Plan

数据修正 + 重生成，向后兼容。客户端在 `checkAndUpdateDictionary` 比对到更高 `version` 后自动重导。可分块多次提交（每块修正可独立 commit），最后一次重生成 gz/version 并提交。

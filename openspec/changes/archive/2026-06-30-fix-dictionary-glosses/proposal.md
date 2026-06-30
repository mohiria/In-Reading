## Why

本地核心词库 `oxford_5000.json`（生成 `public/data/dictionary-core.json.gz`，供行内注解与划词查词）的中文 `translation` 字段在若干区段**错位**，导致行内显示错误翻译：`appear→"食欲"`、`apple→"申请"`、`appetite→"苹果"`、`appearance→"喝彩"`…；另有 **101 条空译文**。错误翻译比缺失翻译更伤害体验。

关键事实：每条记录的 `word/type/cefr/phon_br/phon_n_am/definition/example` 都**正确对齐**（实测确认），仅 `translation`（中文）错位。因此**英文 `definition` 可作为标准答案**，据它校验并重写中文译文，可靠且无需猜测。

## What Changes

- 以 `word + 词性(type) + 英文 definition` 为准，**逐条校验**每个词条的中文 `translation` 是否匹配；**只重写「不匹配」与「空」的条目，保留已正确的**。校验/重写由模型完成，不引入外部 LLM API。
- 修正写回 `oxford_5000.json`；重跑 `scripts/generate-dict.ts` 生成新的 `public/data/dictionary-core.json.gz` 与 `version.json`（`version` 变化触发 IndexedDB 重新导入）。
- 校验记录（哪些被改、改成什么）落入 change 的 QA 工件，便于复核。

注意：882 个"重复 word"是**多词性条目**（如 `about` 的 adverb + preposition 各一条），属正常结构，不处理。

非目标：不改词形还原逻辑（`getLookupCandidates`/`analyzeText`）；不引入在线/LLM 运行时回填（后续 Change）；不动 confusion-map。

## Capabilities

### New Capabilities
- `core-dictionary`: 本地核心词库（Oxford）条目的释义正确性——中文译文须与该词条的词性/英文释义一致，且无空译。

### Modified Capabilities
<!-- 无 -->

## Impact

- 数据：`oxford_5000.json`（修正 translation）、`public/data/dictionary-core.json.gz` + `public/data/version.json`（重生成）。
- 代码：可能新增/调整辅助脚本（导出待校验三元组、回写修正补丁）；`scripts/generate-dict.ts` 重跑（不一定改）。
- 运行时无代码逻辑变化；用户端 IndexedDB 在 `version` 提升后自动重导新词库。
- 规模：5944 条，全量校验分块进行。

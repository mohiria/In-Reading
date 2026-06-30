## Why

收藏生词目前没有回报：`Popup.tsx` 的生词页只显示前 20 条（`vocabulary.slice(0, 20)`）、只能删，Options 页根本没有生词模块，保存的词除了在页面重新高亮之外无法被查看、整理或复习。对一个以「记住薄弱点」为卖点的阅读插件，这条循环是空的。本变更把生词本做到「全量可见 + 按时间分类 + 搜索 + 导出」，并把真正的间隔重复复习交给 Anki（导出 CSV 即可导入）。

## What Changes

- **全量管理移到 Options**：在 `src/options/Options.tsx` 新增「生词本」区，展示全部已保存生词（不再有 20 条上限）；`src/popup/Popup.tsx` 的 VocabTab 去掉 `slice(0, 20)`，并加「查看全部」入口跳转 options 页。复用 `useVocabulary`/`getVocabulary`（`src/common/storage/vocabulary.ts`）。
- **按添加时间分类**：用 `SavedWord.timestamp`（已存在）把生词分组为「今天 / 本周 / 本月 / 更早」，组内按时间倒序；提供搜索框按 `word`/`meaning` 过滤。
- **导出 CSV（Anki/Excel 通用）**：新增导出工具，生成 UTF-8 带 BOM 的 CSV，列为 `word,ipa,meaning,context,sourceUrl,date`；通过 `Blob` + `<a download>` 触发下载。该 CSV 可被 Excel 直接打开，也可在 Anki `File→Import` 中映射字段导入（中文不乱码）。

非目标：不做内置卡片/SRS 复习（复习交给 Anki）；不涉及云端同步；不改动行内注解/翻译引擎。

## Capabilities

### New Capabilities
- `vocabulary-management`: 已保存生词的本地查看、按添加时间分类、搜索，以及导出为 Anki/Excel 可用的 CSV。

### Modified Capabilities
<!-- 无：现有 specs（inline-annotation / text-to-speech / confusion-dictionary）均不涉及生词管理。 -->

## Impact

- 代码：`src/options/Options.tsx`（新增生词本区）、`src/popup/Popup.tsx`（VocabTab 去上限 + 入口）、新增 `src/common/utils/export.ts`（CSV 生成）。
- 复用：`src/common/storage/vocabulary.ts`、`src/common/hooks/useVocabulary.ts`、`src/common/utils/format.ts`（`formatIPA`）。
- 数据结构：复用 `SavedWord`（`word/ipa/meaning/context/sourceUrl/timestamp`），无 schema 变更。
- 无新依赖、无 manifest/权限变更、不涉及网络。

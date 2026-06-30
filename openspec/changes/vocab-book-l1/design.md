## Context

生词数据已存在两处：`chrome.storage.local` 的 `vocabulary`（`SavedWord[]`，含 `word/ipa/meaning/context/sourceUrl/timestamp`）与 IndexedDB `user_words`（供 scanner 查词）。读写封装在 `src/common/storage/vocabulary.ts`，UI 通过 `useVocabulary`（`src/common/hooks/useVocabulary.ts`）消费。当前仅 `Popup.tsx` 的 VocabTab 展示前 20 条且只能删。本变更是纯前端展示/导出，不改数据结构、不碰网络。

## Goals / Non-Goals

**Goals:**
- 全量可见、按时间分组、可搜索、可导出 CSV（Anki/Excel 通用）。
- 复用既有 hook/storage/格式化工具，最小新增。

**Non-Goals:**
- 不做卡片/SRS 复习（交给 Anki）；不做云端同步；不改行内注解/翻译引擎；不改 `SavedWord` 结构。

## Decisions

- **全量管理放 Options，Popup 保留预览**：Options 页（`src/options/Options.tsx`）有足够空间承载分组列表 + 搜索 + 导出；Popup（`src/popup/Popup.tsx`）VocabTab 去掉 `slice(0,20)`、加「查看全部」按钮 `chrome.runtime.openOptionsPage()`。避免在窄 popup 里塞复杂管理。
- **时间分组用纯函数**：基于 `SavedWord.timestamp` 计算「今天/本周/本月/更早」边界并分组；组内按 timestamp 倒序。边界计算下沉为可单测的纯函数（放 `src/common/utils/`），避免在组件里写时间逻辑。
- **搜索为内存过滤**：对 `word`/`meaning` 做大小写不敏感 `includes` 过滤；数据量小（本地生词），无需索引。
- **导出 CSV 用 Blob + `<a download>`**：新增 `src/common/utils/export.ts`，输出 UTF-8 **BOM**（`﻿`）+ `word,ipa,meaning,context,sourceUrl,date`；字段做 CSV 转义（含逗号/引号/换行的值用双引号包裹并转义内部引号）。`date` 由 `timestamp` 格式化为 `YYYY-MM-DD`。`ipa` 复用 `formatIPA`（`src/common/utils/format.ts`）。CSV 同时被 Excel 与 Anki `File→Import` 识别，BOM 保证中文不乱码。

## Risks / Trade-offs

- [Anki 导入需用户手动映射字段] → 文档/提示说明列含义；CSV 首行表头即字段名，Anki 可按列映射。
- [CSV 转义遗漏导致行错位] → 对所有文本字段统一走转义函数，并对含特殊字符的值单测。
- [本周/本月边界的时区与「周起始」歧义] → 约定本地时区、周一为周起始（或自然周），在纯函数里固定并单测边界值（昨天 vs 上周、月初等）。
- [popup 去上限后长列表性能] → 生词量级小；若极端多，popup 预览可仍限量并引导去 options，options 走分组渲染。

## Migration Plan

纯前端、向后兼容，无数据迁移。构建后加载 dist 在 Options 验证；可分两步实现（先 storage/utils + 单测，再接 UI），每步 `npm test`。

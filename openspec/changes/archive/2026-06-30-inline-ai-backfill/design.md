## Context

`scanAndHighlight`（`scanner.ts`）渲染后异步执行：收集 `candidates`（正则 `\b[a-zA-Z]{3,}\b`）→ `batchLookupWords`（含 `getLookupCandidates` 词形还原）建 `combinedDict` → 分块 `processTextNode`→`analyzeText` 包注解。划词翻译在 `background/index.ts` 的 `handleTranslationRequest`（`engine==='llm'` 时走 `fetchFromLLM`，单词）。IndexedDB（`indexed-db.ts`）已有 words/user/meta 多 store + 版本化导入。难度门在 `analyzeText.checkDifficulty`，依赖 CEFR。

## Goals / Non-Goals

**Goals:** 开 AI + 在线时行内覆盖未收录词与连字符复合词；不挡加载；按词缓存趋近离线；离线/未开 AI 行为不变。

**Non-Goals:** 改本地词库内容（`fix-dictionary-glosses`）；改难度模型；动 confusion-map；做 SRS；加新设置项（复用 `engine:'llm'`）。

## Decisions

- **触发门复用 `engine:'llm'`**：`shouldBackfill = settings.engine==='llm' && !!settings.llm.apiKey && navigator.onLine`。
- **候选分词含连字符**：候选正则扩展为同时匹配 `[A-Za-z]{3,}` 与 `[A-Za-z]+(?:-[A-Za-z]+)+`；连字符词整体进 `candidates`，本地查不到则入回填。
- **unknownHard 判定**：`candidates` 中「`getLookupCandidates` 任一键都不在 `combinedDict`」且「不在常见词频表」且「长度≥4」且「非疑似专名（句中首字母大写且非句首，跳过）」。无 CEFR 的未收录词默认视为"够难"（本就是超出核心词的进阶词）。
- **分阶段**：Phase1 现状不变（本地注解）。Phase2：`shouldBackfill` 时，对 unknownHard 先查 `ai_cache`；未命中者按 batch（带句子语境）发 background；返回后写 `ai_cache` 并对相应文本节点做**二次注解**（复用 `createWordContainer` fade-in）。二次注解需记录 word→节点位置或重扫这些 block。
- **批量 handler**：`background/index.ts` 新增 `BACKFILL_WORDS`：收 `[{word, sentence}]`，调 `background/llm` 新增 `fetchBatchFromLLM`（一次 prompt 解释 N 词，返回 `{word:{meaning, ipa_us, ipa_uk}}`）。单次扫描限批大小（如 ≤40 词/请求）与并发（≤1-2 请求）。
- **缓存**：`indexed-db.ts` 加 `ai_cache` store（keyPath 'word'，小写），`getAiCache(words)`/`putAiCache(entries)`。命中即用，跨页复用。
- **降级**：离线/未开 AI 不触发；LLM 失败 catch 后该批不注解、不报错（与现有 `dbLookup().catch(()=>({}))` 风格一致）。

## Risks / Trade-offs

- [二次注解的 DOM 定位] → Phase2 对包含 unknownHard 的 block 重跑 `processTextNode`（带含回填结果的 dict），复用现有 MutationObserver 自身 mutation 过滤，避免循环。
- [回填请求风暴/费用] → 仅 opt-in；批量 + 限并发 + 按词缓存；可加单次扫描 unknownHard 上限（超出的下次扫描/滚动再处理）并 `log`。
- [按词缓存丢失语境多义] → 已选"按词缓存"（用户决定）：复用率优先；多义词只存首次语境义，可接受。
- [连字符正则误伤] → 仅匹配字母-字母，连字符两侧均为字母；不匹配数字/范围；本地优先（复合词若本地有则直接用）。
- [SPA 重扫重复回填] → 缓存命中即时；MutationObserver 500ms 防抖。

## Migration Plan

向后兼容、纯增量；未开 AI/离线零变化。可分阶段实现：先连字符候选 + unknownHard 筛选（纯函数可单测）→ 缓存 store → 批量 handler/LLM → Phase2 二次注解编排。每步 `npm test`；构建后手动验证开/关 AI、在线/离线、缓存命中。

## 1. 候选筛选 + 连字符（纯逻辑，QA 前置）

- [x] 1.1 出 `qa/test-design.md`：测试点 = 连字符复合词成候选、unknownHard 筛选（未命中本地 + 长度 + 排除疑似专名）
- [x] 1.2 写 Red 单测（`backfill.test.ts`）：`extractCandidates` 含 `life-threatening`；`selectUnknownHard` 命中/排除用例（已贴断言级 Red）
- [x] 1.3 实现 `src/content/engine/backfill.ts`（`extractCandidates` 连字符整体+拆分；`selectUnknownHard`=未命中本地+长度≥4+everLower 排除专名）并接入 `scanner.ts` 候选收集；单测 Green。注：不引入独立词频表——常见词本就在本地词库、由 isResolved 排除

## 2. AI 缓存 store

- [x] 2.1 `indexed-db.ts` 新增 `ai_cache` store（keyPath 'word'）；`getAiCache(words)`/`putAiCache(entries)`；DB_VERSION 3→4 + upgrade 建 store
- [x] 2.2 键统一小写逻辑内联于 get/put（jsdom 无 IndexedDB → DB 读写集成留手动 5.2）

## 3. 批量 LLM 回填

- [x] 3.1 `background/llm/index.ts` 抽 `callLLMRaw` 复用 provider 路由；新增 `fetchBatchFromLLM(items,settings)`：一次 prompt 解释 N 词（带句子语境），返回 `{word:{meaning,ipa_us,ipa_uk}}`
- [x] 3.2 `background/index.ts` 新增 `BACKFILL_WORDS` handler：收 `[{word,sentence}]` → 查 LLM → 返回；失败/未开 AI 返回空、不抛
- [x] 3.3 批大小 `BATCH_LIMIT=40`（fetchBatchFromLLM 内 slice）；并发 ≤2 在 scanner 编排（顺序分批）

## 4. scanner Phase2 编排

- [x] 4.1 `shouldBackfill` 在 `content/index.tsx` 算（engine==='llm' && apiKey && navigator.onLine），仅此时注入 `backfillFn`；不注入则 scanner Phase2 直接 return，与今天完全一致
- [x] 4.2 Phase2 `runBackfill`：unknownHard 先查 `ai_cache` → 未命中批量发 `BACKFILL_WORDS` → 写 `ai_cache` → 以「仅回填词」dict + 空 vocabulary 二次 `annotateBlocks`（复用 createWordContainer fade-in）；现有 MutationObserver isOurMutation 过滤已防循环
- [x] 4.3 `MAX_BACKFILL=80` 上限 + 超限 `console.log` 丢弃数；缓存/批量/写库均 catch 静默降级

## 5. 验证与提交

- [x] 5.1 全量 `npx vitest run` 56/56 + `npm run build` 通过；出 `qa/qa-report.md`
- [ ] 5.2 手动：开 AI+在线读真实文章 → 本地词秒标、进阶词 ~1-2s 渐显、life-threatening 整体注解；断网/关 AI → 仅本地无报错；重复访问命中缓存即时（待用户验证）
- [x] 5.3 提交（Conventional Commits，中文正文）

## 1. 候选筛选 + 连字符（纯逻辑，QA 前置）

- [ ] 1.1 出 `qa/test-design.md`：测试点 = 连字符复合词成候选、unknownHard 筛选（未命中本地 + 非常见词 + 长度 + 排除句中专名）
- [ ] 1.2 写 Red 单测：候选分词含 `life-threatening`；`selectUnknownHard(candidates, combinedDict, commonSet)` 命中/排除用例
- [ ] 1.3 实现连字符候选正则（`scanner.ts` 候选收集）+ `selectUnknownHard` 纯函数 + 常见词频表资源；单测转 Green

## 2. AI 缓存 store

- [ ] 2.1 `indexed-db.ts` 新增 `ai_cache` store（keyPath 'word'）；`getAiCache(words)`/`putAiCache(entries)`；DB_VERSION 升级 + upgrade 建 store
- [ ] 2.2 单测/集成校验读写（jsdom 无 IndexedDB → 纯键逻辑单测，DB 集成留手动）

## 3. 批量 LLM 回填

- [ ] 3.1 `background/llm/index.ts` 新增 `fetchBatchFromLLM(items, settings)`：一次 prompt 解释 N 词（带句子语境），返回 `{word:{meaning,ipa_us,ipa_uk}}`；复用各 provider 端点/解析
- [ ] 3.2 `background/index.ts` 新增 `BACKFILL_WORDS` handler：收 `[{word,sentence}]` → 查 LLM → 返回；失败返回空、不抛
- [ ] 3.3 限批大小(≤40)/并发(≤2)

## 4. scanner Phase2 编排

- [ ] 4.1 `scanAndHighlight`：`shouldBackfill = engine==='llm' && apiKey && navigator.onLine`；为 false 时与今天完全一致
- [ ] 4.2 Phase2：unknownHard 先查 `ai_cache` → 未命中批量发 `BACKFILL_WORDS` → 写 `ai_cache` → 对含这些词的 block 二次 `processTextNode`（带回填 dict），复用 fade-in；MutationObserver 自身 mutation 过滤防循环
- [ ] 4.3 单次扫描 unknownHard 上限 + `log` 丢弃数；离线/失败静默降级

## 5. 验证与提交

- [ ] 5.1 全量 `npm test` + `npm run build`；出 `qa/qa-report.md`
- [ ] 5.2 手动：开 AI+在线读真实文章 → 本地词秒标、进阶词 ~1-2s 渐显、life-threatening 整体注解；断网/关 AI → 仅本地无报错；重复访问命中缓存即时
- [ ] 5.3 提交（Conventional Commits，中文正文）

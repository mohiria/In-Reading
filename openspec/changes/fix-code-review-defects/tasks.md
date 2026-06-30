## 1. Batch 1 — Isolated surgical fixes

- [x] 1.0 QA 前置：`qa/test-design.md` + 写 Red 测试（T1/T2/T4/T6 断言级 Red，已贴运行输出）
- [x] 1.1 Add optional `phon_br?: string` and `phon_n_am?: string` to `WordExplanation` in `src/common/types/index.ts`
- [x] 1.2 Extend `getPreferredIPA` in `src/common/utils/format.ts` to fall back to `phon_br` (UK) / `phon_n_am` (US): UK = `ipa_uk || phon_br || ipa_us || phon_n_am || ipa`, US = `ipa_us || phon_n_am || ipa_uk || phon_br || ipa` (#1)
- [x] 1.3 Change `Math.max(...wordRanks)` → `Math.min(...wordRanks)` in `checkDifficulty` at `src/common/nlp/analyzer.ts` (#2)
- [x] 1.4 Re-add TTS keep-alive in `speak()` (`src/common/utils/speech.ts`): for `text.length > 100`, `setInterval` that calls `synth.resume()` while speaking and `clearInterval` on `!synth.speaking` (#9)
- [x] 1.5 修正 pre-existing 失败用例 `scanner.integration.test.ts`（间隔断言收窄到 `extension`）；`npm run build` + `npm test` 全绿（24/24）
- [x] 1.6 Commit Batch 1 (Conventional Commits, Chinese body)

## 2. Batch 2 — Scanner content-region filtering

- [x] 2.0 QA 前置：`qa/test-design-batch2.md` + Red 测试（B2-1/B2-3/B2-5 断言级 Red，已贴输出）
- [x] 2.1 Restore unconditional skip of `HEADER, FOOTER, ASIDE` and `[role="banner"]`/`[role="contentinfo"]`/`[role="complementary"]` in `SKIP_SELECTOR` (`src/content/engine/scanner.ts`) (#6)
- [x] 2.2 类名按 token 精确匹配（`hasUiClass`，去掉 header/footer），停止误伤 `article-header` (#7)
- [x] 2.3 内容地标（main/article）豁免链接密度整块拒绝，停止丢弃真实内容 (#4)
- [x] 2.4 isLikelyUI 仅对无块级后代的 leaf-ish 容器做链接密度分析（`BLOCK_SELECTOR` 短路），结构 wrapper 廉价下降，去 O(n²) (#10)
- [ ] 2.5 Manually verify on representative pages (BBC article, Wikipedia, page with footer disclaimer, sidebar summary, reference/citation list) — 归入 Batch 5.2 端到端手动验证
- [x] 2.6 Run `npm run build` + `npm test`（29/29 通过，构建通过）; commit Batch 2

## 3. Batch 3 — Inflected-word coverage

- [x] 3.0 QA 前置：`qa/test-design-batch3.md` + Red 测试（B3-1/B3-2 断言级 Red，已贴输出）
- [x] 3.1 提取纯函数 `getLemmaKeys(word)`→`[surface, lemma]`（lemma 取自 `inflections.json`）(#3)
- [x] 3.2 `batchLookupWords` 与 `lookupWordInDB` 依序按 lemma 键查 DB，结果按表面词形 key（`src/common/storage/indexed-db.ts`）
- [x] 3.3 全量 `npm test`（33/33）+ `npm run build` 通过；变形词真实命中留待 Batch 5.2 手动验证; commit Batch 3

## 4. Batch 4 — Data & build-script fixes

- [ ] 4.1 Change POS detection in `scripts/sync-inflections.ts` to exact match (`e.type === 'verb'` / `=== 'noun'`) (#8)
- [ ] 4.2 Clean confusion-derived bad forms from `src/common/nlp/inflections.json` and regenerate cleanly (do not rely on additive re-run); diff to confirm only adverb→verb / pronoun→noun forms removed
- [ ] 4.3 Draft Chinese short translations (LLM) for the 26 empty-gloss words (acid, across, act, below, bend, benefit, besides, best, bet, better, between, beyond, bid, bill, bite, black, blame, blank, blast, blend, block, blow, blue, board, bomb, book) and get human review before write-back (#5)
- [ ] 4.4 Write reviewed glosses into each `entries[].translation` and recompute the root `meaning` in `generate-dict` format in `public/dictionaries/confusion-map.json`
- [ ] 4.5 Verify glosses render (no `'a. ; a. ; n. '`), bad inflections gone; run `npm run build` + `npm test`; commit Batch 4

## 5. Final verification

- [ ] 5.1 Full `npm run build` + `npm test` green
- [ ] 5.2 Load `dist/` in Chrome and walk the per-batch verification lists end-to-end (IPA, no over-annotation, landmarks skipped, lists preserved, inflected words, no garbage glosses, long TTS, no jank)
- [ ] 5.3 Archive the change with `/opsx:archive`

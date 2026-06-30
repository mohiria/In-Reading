# QA Test Report — fix-inline-inflection-coverage

## Scope

行内词形还原一致性 + 已保存按基础词高亮 + Popup 搜索。需求源 `specs/inline-annotation`、`specs/vocabulary-management`。设计见 `qa/test-design.md`。

## TDD 证据（Red → Green）

| 测试点 | Red（桩/旧逻辑，断言级失败） | Green |
| --- | --- | --- |
| C1 屈折形候选含基础词 | `expected ['victims'] to include 'victim'` | PASS |
| C3 -ies→y | `expected ['cities'] to include 'city'` | PASS |
| S1 存基础词后变形被标注 | `expected undefined to be defined`（victims 未标注） | PASS |

守卫：C2（`getLookupCandidates('building')[0]==='building'` 表面优先）、C4（`'apple'`→`['apple']`）——桩阶段即 PASS，确认不误还原有独立条目的词。

## 实现要点

- `getLookupCandidates(word)`（`indexed-db.ts`）：表面 → `inflections` lemma → 后缀候选（`-ies→y`/`-es`/`-s`/`-ed→ø,-e`/`-ing→ø,+e`），去重有序。`batchLookupWords`/`lookupWordInDB` 统一按它顺序查 USER/WORDS（表面最先、命中即止），结果按表面词为键。
- `analyzer.ts`：`isSavedWord` 增加按解析词条基础词 `explanation.word` 匹配——保存 `victim` 后 `victims` 也判为已保存。
- `Popup.tsx` VocabTab 加搜索框（按 `word`/`meaning` 大小写不敏感过滤），过滤后仍可删除。

## 执行证据

- `indexed-db.test.ts` + `analyzer.test.ts`：相关用例 Red→Green。
- 全量 `npm test`：**49 passed / 0 failed（15 文件）**，无回归（既有 `getLemmaKeys`、tear/rose、difficulty、scanner、vocab/export 全绿）。
- 构建 `npm run build`（tsc + vite）：通过。

## 回归与安全

- 「表面优先」实测保护：building/meeting/meaning/news/series 均有独立条目 → 命中表面、不触发还原，无 `building→build` 错义。
- 残余：未收录且还原后词义漂移的冷僻词只近似；`-ing`/双写还原不完美者未命中即不标注（不给错义）——这类与复合词留 LLM 按语境（后续 Change）。
- 风险 Low。

## Non-TDD 例外（手动验证，5.2）

`batchLookupWords` 真实 IndexedDB 命中、Popup 搜索渲染 → 手动：读含 victims/suffered/threatening 的页面行内显示翻译；存 victim → victims 高亮；building 仍显示自身释义；popup 搜索可用。

## 结论

核心逻辑 Red→Green，全量与构建通过，无回归。质量门通过；行内真实命中与 UI 留手动验证（5.2）。

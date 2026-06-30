# QA Test Report — Batch 1

## Scope

OpenSpec change `fix-code-review-defects`, Batch 1（孤立外科修复）：
- #1 `getPreferredIPA` 从 confusion-map 的 `phon_br`(UK)/`phon_n_am`(US) 解析 IPA
- #2 `checkDifficulty` 按最易义项（`Math.max` → `Math.min`）
- #9 `speak()` 长句(>100)TTS keep-alive

需求来源：本 change `specs/inline-annotation`、`specs/text-to-speech`。设计见 `qa/test-design.md`。

## TDD 证据（Red → Green）

| 测试点 | 测试 | Red（实现前，断言级失败） | Green（实现后） |
| --- | --- | --- | --- |
| T1 #1 | `format.test.ts` | `expected '' to be '/əˈbaʊt/'` | PASS |
| T2 #1 | `format.test.ts` | `expected '' to be '/ˈskɛdʒuːl/'` | PASS |
| T4 #2 | `difficulty.test.ts` | `expected { word: 'novel', … } to be undefined` | PASS |
| T6 #9 | `speech.test.ts` | `expected "vi.fn()"(resume) to be called at least once` | PASS |

四项均为**断言级** Red（非编译/导入/环境失败），符合 constitution Mandatory TDD Rule。类型 stub（`WordExplanation` 加可选 `phon_br?/phon_n_am?`）为签名级 compilable stub，无行为。

守卫/回归点（实现前即应通过，验证不引入回归）：T3（Oxford `ipa_us` 路径不变）、T5（全难义项词仍标注）、T7（语音结束清除 keep-alive）——Red 阶段即 3 PASS。

## 执行证据

- 目标测试 `format/difficulty/speech.test.ts`：实现后 **7 passed / 0 failed**。
- 全量 `npm test`：**24 passed / 0 failed（10 文件）**。
- 构建 `npm run build`（tsc + vite）：通过（仅 icon 覆盖与 chunk 体积告警，均为既有、无关）。

## 失败分类与处理

`src/test/integration/scanner.integration.test.ts` 在本批前**已失败**（pre-existing）。证据：stash 本批生产改动后于干净代码运行，`p2` 仍为 `' (d. 一; n. 一; p. )'` ≠ `''`。

- 分类：**测试设计问题**（非生产回归）。该用例用 `mockDict={extension}` 并断言 `p2` 整段为空，但 `scanAndHighlight`→`analyzeText` 同时查真实 `defaultConfusionMap`，其中 `one`(a1) 对 A1 用户合法标注。
- 我的 #1 改动只是给这条既有标注补上了 IPA（`(d. 一…)` → `(/wʌn/ · d. 一…)`），未改变其通过/失败。
- 处理（Requirement Conflict Gate：旧测试不正确）：把间隔强化断言从「整段 `.ll-translation` 为空」收窄为「`extension` 容器在 p2/p4 不存在」（`data-word="extension"`），保留原测试意图且对真实词库稳健；隔离断言（header/footer/h1）未动。未削弱断言。

## 回归范围

- 受影响：Tooltip/SelectionPopup/scanner 的 IPA 显示、analyzer 难度阈值、划词朗读。
- 已重跑：`analyzer.test.ts`（tear/rose 仍 PASS——max→min 在 A1 下不改变这两词标注）、`SelectionPopup.test.tsx`、全量套件。
- 风险：Low；无需独立回归分析。

## 覆盖闭合与剩余风险

- 在范围内可执行测试点 T1–T7 全部覆盖并执行（Design）。
- Non-TDD 例外：端到端朗读时长在 jsdom 无法真放，记为例外，留待 Batch 5.2 Chrome 手动实测长句不被截断；单元层已验证 `resume()` 周期调用。
- 剩余风险：低。confusion-map 中 `translation` 为空的词（#5）此刻仍渲染占位（如 `p. ` 空译），属 Batch 4 范围，非本批回归。

## 结论

Batch 1 三处修复均 Red→Green 验证通过，全量套件与构建通过，pre-existing 失败用例已按测试正确性修正。质量门通过。

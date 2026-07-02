# Lightweight Test Design — Batch 1

## Context

- Requirement / Spec: `openspec/changes/fix-code-review-defects/specs/inline-annotation/spec.md`（IPA resolution、Difficulty gating）、`specs/text-to-speech/spec.md`（Uninterrupted long-utterance playback）
- Change summary: Batch 1 三处孤立修复 —— #1 `getPreferredIPA` 从 `phon_br/phon_n_am` 解析 IPA；#2 `checkDifficulty` 按最易义项（`Math.min`）；#9 `speak()` 长句 TTS keep-alive。
- Target modules: `src/common/utils/format.ts`、`src/common/nlp/analyzer.ts`（`checkDifficulty`）、`src/common/utils/speech.ts`、`src/common/types/index.ts`（类型 stub）
- Test environment: vitest + jsdom，测试在 `src/test/unit/`

## Input Sources Checked

- [x] Active Spec（本 change 的 specs）
- [x] Existing behavior baseline：`src/test/unit/analyzer.test.ts`（tear/rose）、code review verified evidence
- [x] Data model / field rules：confusion-map 根条目字段 `phon_br`(UK)/`phon_n_am`(US)
- [x] Code structure / changed code：format/analyzer/speech
- [x] Existing tests：analyzer.test.ts（不被本批断言削弱）
- [x] Test data：confusion-map 真实条目形状（about/schedule/novel）

## Requirement Authority / Conflict Gate

| Behavior | Existing baseline | New requirement source | Relationship | Decision authority | Result |
| --- | --- | --- | --- | --- | --- |
| confusion 词 IPA 解析 | `getPreferredIPA` 仅读 `ipa_*`，rose 测试 `toBeDefined()` 因空串而 vacuous 通过 | spec inline-annotation「IPA resolution across dictionary shapes」 | amends（旧测试断言过弱） | 本 change specs | Proceed（新增更强断言，不削弱旧测试） |
| 难度判定取义项 | `checkDifficulty` 当前 `Math.max` | spec inline-annotation「Difficulty gating by easiest sense」 | supersedes（max 为本批认定的回归） | code review + specs | Proceed |
| 长句 TTS | 旧实现有 keep-alive，重构中被删 | spec text-to-speech | supersedes（恢复被删行为） | code review + specs | Proceed |

旧 `tear`/`rose` 两用例在 max→min 下仍被标注（A1 用户），断言不变、不削弱。

## Pre-Code TDD Gate

- Requirement / task source: Batch 1（tasks.md 1.1–1.4）
- Behavior contract source: 上述 specs
- Ready for production code change: Yes（仅在贴出 Red 运行输出后）
- Gate evidence type: Red（assertion 级）
- 类型 stub 说明：`WordExplanation` 增加可选 `phon_br?`/`phon_n_am?` 属签名级 compilable stub（无行为），使 #1 的 Red 测试可编译；真实解析逻辑在 Green 阶段实现。

## Test Points

| # | Test point | Source | Method | Layer | Input / precondition | Expected result | Assertion target | Priority | Coverage artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | getPreferredIPA 从 phon_n_am 解析 US IPA | spec IPA resolution | 等价类 | Unit | 仅含 `phon_br/phon_n_am` 的条目，pron=US | 返回 `/ˈnɑːvl/`（非空） | 返回值 | P0 | `src/test/unit/format.test.ts` |
| T2 | UK/US 偏好选对字段 | spec IPA resolution | 决策表 | Unit | phon_br≠phon_n_am，分别 UK/US | UK→phon_br，US→phon_n_am | 返回值 | P0 | 同上 |
| T3 | 既有 ipa_us 路径不回归 | spec IPA resolution | 回归 | Unit | 含 `ipa_us` 的 Oxford 形状 | 仍返回该 IPA | 返回值 | P1 | 同上 |
| T4 | 常用词带罕见难义项不过度标注 | spec Difficulty gating | 边界值 | Unit | `novel` cefr[a2,c1]，用户 CEFR_B1 | 不在 analyzeText 结果中 | results | P0 | `src/test/unit/difficulty.test.ts` |
| T5 | 真正难词仍标注 | spec Difficulty gating | 边界值 | Unit | 全义项高于用户档 | 在结果中 | results | P1 | 同上 |
| T6 | 长句(>100)触发 TTS keep-alive | spec text-to-speech | 状态/计时 | Unit | mock synth，speaking=true，>100 字符 | 5s 后 `synth.resume()` 被调用 | resume 调用 | P1 | `src/test/unit/speech.test.ts` |
| T7 | 语音结束清除 keep-alive | spec text-to-speech | 状态 | Unit | mock synth，speaking=false | clearInterval，后续不再 resume | resume 不再调用 | P2 | 同上 |

## Test Data Plan

| Test point | Required data state | Business realism basis | Setup | Isolation | Cleanup | Blocker |
| --- | --- | --- | --- | --- | --- | --- |
| T1–T3 | 真实词的真实 IPA：about `/əˈbaʊt/`、schedule US `/ˈskɛdʒuːl/`/UK `/ˈʃɛdʒuːl/`、novel | confusion-map 根条目实际形状（minimal-data 例外不适用，需真实 IPA 串） | inline 字面量 | 纯函数无状态 | 无 | Ready |
| T4–T5 | novel cefr[a2,c1]、释义「小说/新颖的」 | 真实英语多义词 + 近似 CEFR 分级 + 中文释义（产品语言） | mockConfusionMap | mock inflections 为空 | 无 | Ready |
| T6–T7 | >100 字符英文句，US 在线语音 | 划词朗读长句场景 | vi.stubGlobal mock synth + Utterance + fake timers | 每用例重置 mock | 还原 globals | Ready |

## TDD Candidates

| Test point | Initial failing test | Why fail before impl | Expected Red reason | Minimal pass |
| --- | --- | --- | --- | --- |
| T1/T2 | format.test.ts | getPreferredIPA 不读 phon_* | `expected '/ˈnɑːvl/' got ''` | UK/US 回退加 phon_br/phon_n_am |
| T4 | difficulty.test.ts | 当前 Math.max 标注 novel | `expected undefined, got <match>` | max→min |
| T6 | speech.test.ts | 当前无 keep-alive | `resume not called` | 重加 setInterval(resume) |

## Regression Impact

| Changed item | Impacted behavior | Tests to rerun | Risk | Separate analysis? |
| --- | --- | --- | --- | --- |
| getPreferredIPA | Tooltip/SelectionPopup/scanner IPA、analyzer rose/tear | `analyzer.test.ts`、`SelectionPopup.test.tsx`、全量 `npm test` | Low | No |
| checkDifficulty | 所有词的标注阈值 | `analyzer.test.ts` | Low | No |
| speak() | 划词朗读 | 无既有 speech 测试（本批新增） | Low | No |

## Non-TDD Exceptions

| Scope | Reason | Alternative validation | Residual risk |
| --- | --- | --- | --- |
| 端到端朗读时长 | 计时/浏览器音频在 jsdom 无法真放 | Chrome 实测长句朗读不被截断（E2E 手动，Batch 5.2） | 低（单元已验证 resume 被周期调用） |

## Coverage Closure

- Ready for code change: Yes（Red 运行输出贴出后）
- Red evidence / exception exists for TDD candidates: Yes（T1/T2/T4/T6 Red；时长 E2E 记为 Non-TDD 例外）
- E2E enumerated: Yes（统一在 tasks 5.2 手动验证）
- Test data plan has realism basis: Yes
- Initial regression impact recorded: Yes
- Uncovered / blockers: 无

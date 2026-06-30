# QA Test Report — Batch 4 (数据 + 构建脚本)

## Scope

OpenSpec change `fix-code-review-defects`，Batch 4：
- #8 `scripts/sync-inflections.ts` POS 判定改精确匹配 + 外科式清理既有坏变形，重生成 `inflections.json`。
- #5 为 26 个曾空译文词填入用户校对的中文释义，按现有格式重算 `meaning`。

需求源 `specs/confusion-dictionary`。设计见 `qa/test-design-batch4.md`。

## TDD 证据（Red → Green）

| 测试点 | Red（实现前） | Green |
| --- | --- | --- |
| B4-1 26 词每个 sense 译文非空 | `expected ['acid','across',…(23)] to equal []` | PASS |
| B4-2 无 confusion 条目全空译文 | `expected ['acid','across',…(23)] to equal []` | PASS |
| B4-3 adverb/prep 词无动词/复数坏形 | `expected ['acrossed','acrossing',…(6)] to equal []` | PASS |

守卫：B4-4（books→book、acted→act 保留）stub 阶段即 PASS。

## #8 重生成核对（diff 证据）

- `npx tsx scripts/sync-inflections.ts`：**+53 added, -340 removed**。
- 移除项全部为 POS-substring 坏形（abouts/acrossed/acrossing/betweened/beyonded/besidesed/hers/thats… 即 adverb/prep/pronoun 词的动词或复数误生成形）。
- **安全判据生效**：动词形态(ed/ing/d) 仅当本词非动词才删；复数形态仅当本词非名词才删。核验真实名词复数保留：`ways→way`、`homes→home`、`books→book` 全部保留（首版未加判据时曾误删 `ways`，已修正）。
- 取舍记录：纯功能词（adverb/det/pronoun，无 noun/verb）的复数被删，如 `lots→lot`、`others→other`——这些为 A1/A2 级常用词，几乎不触发注解，词形还原损失可忽略。

## #5 数据核对

- 26 词每个 `entries[].translation` 填入校对后的短译；`meaning` 重算为现有格式，样例：`across`→`"a. 横过; p. 穿过"`、`better`→`"a. 更好的; a. 更好地; n. 更好的事物"`。
- 全库 all-empty / partial-empty 译文条目均为 **0**。

## 执行证据

- `confusion-data.test.ts`：4/4。
- 全量 `npm test`：**37 passed / 0 failed（13 文件）**，无回归。
- 构建 `npm run build`：通过。

## 追加（新发现，用户校对后已修复）

扫描 `meaning` 发现 **7 个词 stored meaning 有悬空词性符**：`do`("v. 做; a. ")、`have`、`latter`、`need`、`one`、`that`、`to`。性质同 #5（用户可见悬空 `a.`/`p.`），但其 `entries[].translation` 实际非空、是 stored `meaning` 过时，且原 entries 译文冗长，需单独撰写短译。

处置（同 26 词的 human-review 流程）：
- 加强断言 **B4-5**「无 stored meaning 含悬空词性符」→ Red（7 词命中）。
- 用户校对 7 词短译后写入 `entries[].translation`（按词性顺序），重算 `meaning`，如 `one`→`"d. 一; num. 一; p. （代词）一个"`、`to`→`"i. （不定式标志）; p. 到，向"`。abbr 补 `num.`(number)/`i.`(particle)/`c.`(conjunction)。
- Green：B4-5 通过；全量 **38 passed**、构建通过。

## 结论

Batch 4（#8 + #5 的 26 词 + 追加 7 词悬空 meaning）Red→Green，全量套件与构建通过，inflections 重生成 diff 已核对、真实名词复数无误删。全库 0 个全空译文、0 个悬空词性符。质量门通过。

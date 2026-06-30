# 轻量测试设计 — compound-cache-selection-fixes

## 需求权威来源

`specs/inline-annotation`（A）、`specs/core-dictionary`（B）、`specs/selection-translation`（C）的 Scenario。与 `docs/product-spec.md`/`README.md` 无冲突（仍是「只对认知边界生词原位注解」，本次只修分词粒度与缓存）。

## 测试点与分层

| # | 测试点（来源 Scenario） | 层 | TDD |
| --- | --- | --- | --- |
| A1 | 整词命中 → `analyzeText('… anti-migrant …', dict={anti-migrant})` 返回 1 个 match，`word==='anti-migrant'`、`length===12` | 单元 | Red→Green |
| A2 | 仅含部件 → dict 只含 `migrant` 时，对 `anti-migrant` 返回 0 个 match（不拆注解部件） | 单元 | Red→Green |
| A3 | 普通词不回归 → 单独 `migrant` 仍匹配 1 个 | 单元 | Red→Green |
| C1 | `getAiCache` 命中 → 选词即时渲染该释义，且**不**调用 `chrome.runtime.sendMessage`、不进 loading | 组件 | Red→Green |
| C2 | 本地全 miss → 仍发 `TRANSLATE_WORD`（不回归） | 组件 | 复用现有/断言 |
| B1 | `resetDictionaryCache` 清 WORDS+AI_CACHE+version_info、不动 USER | 集成 | 手动（jsdom 无 IndexedDB） |
| B2 | onInstalled 重置 → 重载扩展后下次扫描重导最新词库 | 集成 | 手动 |
| B3 | Options 按钮 → 清+重导即时生效；生词本仍在 | 集成 | 手动 |

## TDD 红/异常证据

- A、C 为纯逻辑/组件，先写断言级 Red（运行失败：A 现状把 anti-migrant 拆为两 match；C 现状未查 ai_cache → 会发消息）再实现。
- B 为 IndexedDB/SW 时序，jsdom 无 `indexedDB`、无 `chrome.runtime.onInstalled`，记为非 TDD 例外，备选验证 = 手动（见 4.2）+ 代码审查；剩余风险记入 qa-report。

## 测试数据

- A：内联最小 dict `{ 'anti-migrant': {word, meaning, cefr:[]}, 'migrant': {...} }`（满足注解条件即可）。
- C：mock `getAiCache` 返回 `{ <word>: {word, meaning, ipa_us, ipa_uk, source} }`；mock `lookupWordInDB` 返回 undefined（强制走 ai_cache 分支）。

## 回归范围

- analyzer 现有用例（普通词、词形还原、难度）须仍绿。
- scanner 集成用例（main/footer 隔离、间隔重复）须仍绿（正则放宽不应影响非连字符文本）。
- SelectionPopup 现有用例须仍绿。

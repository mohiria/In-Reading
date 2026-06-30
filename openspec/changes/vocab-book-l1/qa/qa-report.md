# QA Test Report — vocab-book-l1

## Scope

生词本 L1：全量可见（去 popup 20 上限）、按添加时间分组、搜索、CSV(Anki/Excel) 导出。需求源 `specs/vocabulary-management`。设计见 `qa/test-design.md`。

## TDD 证据（Red → Green）

核心纯函数（`src/common/utils/vocab.ts` 的 `groupByAddedTime`、`src/common/utils/export.ts` 的 `toCSV`）走严格 Red→Green：

| 测试点 | Red（桩实现，断言级失败） | Green |
| --- | --- | --- |
| T1 时间分组归位 | `expected undefined to deeply equal ['today1']` | PASS |
| T4 CSV BOM+表头 | `expected false to be true`（无 BOM） | PASS |
| T5 逗号/引号/换行转义 | `expected '' to contain '"a, b"'` | PASS |

守卫：T2（空组省略）、T3（组内倒序）、T6（中文保留 + date 格式）——实现后 PASS。

## 执行证据

- `vocab.test.ts` + `export.test.ts`：6/6。
- 全量 `npm test`：**44 passed / 0 failed（15 文件）**，无回归。
- 构建 `npm run build`（tsc + vite）：通过。

## 实现要点

- `groupByAddedTime`（本地时区、周一为周起始）→ 今天/本周/本月/更早，组内 timestamp 倒序，空组省略。
- `toCSV` → UTF-8 BOM + 表头 `word,ipa,meaning,context,sourceUrl,date`，逐字段转义（含 `,"`/换行的值双引号包裹、内部引号翻倍），`ipa` 走 `formatIPA`、`date` 由 timestamp 格式化为 `YYYY-MM-DD`；`downloadCSV` 用 Blob + `<a download>`。
- `Options.tsx` 新增「生词本」区：分组渲染全量、搜索框（word/meaning 大小写不敏感）、导出按钮（空列表禁用）、逐条删除。
- `Popup.tsx` VocabTab 去掉 `slice(0,20)`，加「查看全部 / 导出」入口 `chrome.runtime.openOptionsPage()`。

## 回归范围

- 仅生词展示/导出；不动 `SavedWord` 结构、存储、注解逻辑。已重跑全量套件无回归。
- 风险 Low。

## Non-TDD 例外（手动验证兜底，任务 5.2）

| Scope | Reason | 手动验证 |
| --- | --- | --- |
| `downloadCSV`、Options/Popup 组件 | jsdom 不便稳定断言下载/渲染 | 保存 >20 词 → Options 看全量/分组/搜索；导出 CSV 用 Excel 打开中文不乱码、Anki `File→Import` 按字段映射导入 |

## 结论

核心逻辑 Red→Green，全量套件与构建通过，无回归。UI/下载留手动验证（5.2）。质量门通过。

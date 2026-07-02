# Privacy Policy — In Reading

_Last updated: 2026-07-01_

**In Reading** is a browser extension that adds inline, level-aware annotations to
foreign-language text while you read. This policy explains what data the extension
handles and how.

## Summary

- The developer operates **no server** and **collects no personal data**. There is no
  analytics, no advertising, and no tracking.
- Everything the extension stores stays in **your browser's extension storage**.
- Text you ask to translate is sent **directly to the third-party translation / AI
  service you choose**, using **your own API key** — never to the developer.

## What data is processed

**1. Page text you choose to have annotated / translated.**
When annotation is enabled (or when you select a word), the extension reads text from
the current page and, to produce a translation, may send the relevant word(s) and the
surrounding sentence for context to the translation or AI service **you have
configured**:

- Built-in dictionaries / machine translation: Google Translate, Youdao, iCIBA.
- Optional AI engine (only if you enable it and enter an API key): Google Gemini,
  OpenAI, Anthropic, DeepSeek, Moonshot (Kimi), Zhipu (GLM), Alibaba Qwen, or a
  custom OpenAI-compatible endpoint you specify.

These requests go **directly from your browser to that provider**, authenticated with
**your own API key**. The developer is not an intermediary and does not receive this
data. Each provider processes the data under its own privacy policy.

**2. Your settings and word lists (stored locally in the browser).**
- Proficiency level, pronunciation, engine choice, and your **API key**.
- Your **vocabulary book** and **known-words** list.

These are saved with the browser extension storage APIs. Where your browser supports
extension sync (e.g. Chrome with a Google account, Edge with a Microsoft account), this
data syncs across your own signed-in devices through the browser's own sync service.
The developer has no access to it. You can export/import these lists as CSV, and clear
them at any time from the options page.

## Permissions and why they are needed

- **storage** — save your settings and word lists.
- **activeTab** and the content script (`<all_urls>`) — read text on the page you are
  reading so it can be annotated in place.
- **Host permissions** for the translation / AI API domains — so the extension can send
  translation requests to those services.
- **Optional host permission** (`https://*/*`) — requested only if you configure a
  *custom* AI endpoint, so the extension may call the URL you entered. It is requested
  at that moment and can be revoked in the browser's extension settings.

## Data sharing and retention

- The developer stores nothing and shares nothing.
- Data sent to a provider you configured is handled by **that provider**; refer to their
  privacy policy for retention and usage.

## Children's privacy

The extension is not directed to children and collects no personal information.

## Changes

Material changes to this policy will be reflected here with an updated date.

## Contact

Questions: open an issue at https://github.com/mohiria/In-Reading

---

## 隐私政策（简要中文）

**In Reading** 不设服务器、不收集任何个人数据,无统计、无广告、无追踪。设置与生词
本仅存于浏览器扩展存储(经浏览器账号在你自己的设备间同步)。你请求翻译时,相关单词
及其句子上下文**直接**发送给**你自行配置的**第三方翻译/AI 服务(Google/Youdao/iCIBA
或你填入 API Key 的 LLM 供应商),用**你自己的 API Key**,开发者不经手、不接收。权限
仅用于:读取当前页文本以原位注解、向所配置的翻译/AI 域名发请求;自定义 AI 地址会在你
配置时单独请求可选权限。

# Store Listing Copy — In Reading (Edge Add-ons / Chrome Web Store)

Reusable text for both stores. Paste into Partner Center (Edge) and the Chrome Web
Store Developer Dashboard. Screenshots/logo/privacy-policy URL must be supplied
separately (see checklist at the end).

## Name

In Reading — immersive reading assistant

## Category

Education (alt: Productivity)

## Short description (≤132 chars)

Read foreign-language pages naturally: only the words above your level get a tiny inline gloss (IPA + short meaning).

## Long description

In Reading keeps you in the flow while reading native content. Instead of translating
whole pages, it annotates only the vocabulary at your personal level boundary (the
"i+1" idea) with a compact inline gloss — IPA plus a short meaning — so you keep reading
and acquire words naturally.

Features
- Level-aware annotation: pick your level (A1–C2 / CET-4 / CET-6…) and only genuinely
  new words get annotated; words you already know stay untouched.
- Select-to-translate: select any word or phrase for an instant definition, and save it.
- Vocabulary book & "known words" list, with CSV import/export, and cross-device sync
  (where your browser supports extension sync).
- Optional AI engine: bring your own API key (OpenAI, Anthropic/Claude, Google Gemini,
  DeepSeek, Moonshot/Kimi, Zhipu/GLM, Alibaba Qwen, or any OpenAI-compatible endpoint)
  for higher-quality glosses. Works fully offline-of-AI with the built-in dictionary too.
- Text-to-speech pronunciation, US/UK.
- Privacy-first: no developer server, no tracking. Translation requests go directly from
  your browser to the service you choose, with your own key.

Toggle on/off per tab with the toolbar icon or Alt+A.

## Single-purpose statement (Chrome requires this)

The extension has a single purpose: to help language learners read foreign-language web
pages by adding inline, level-appropriate vocabulary annotations and on-demand
word translation.

## Permission justifications

- **storage** — Persist the user's settings, vocabulary book, and known-words list.
- **activeTab** — Act on the page the user is currently reading when they toggle the
  extension on.
- **Content script on `<all_urls>`** — The core feature is annotating vocabulary on
  whatever article/page the user is reading; it must be able to run on any site the user
  chooses to read. It only reads text to render annotations; it sends nothing anywhere by
  itself.
- **Host permissions** (`translate.googleapis.com`, `dict.youdao.com`, `*.iciba.com`,
  `generativelanguage.googleapis.com`, `api.openai.com`, `api.anthropic.com`,
  `api.deepseek.com`, `api.moonshot.cn`, `open.bigmodel.cn`, `dashscope.aliyuncs.com`) —
  Send translation/definition requests to the dictionary and AI providers the user
  selects, using the user's own credentials.
- **optional_host_permissions** (`https://*/*`) — Requested only at runtime if the user
  configures a *custom* OpenAI-compatible endpoint, so the extension may call that URL.

## Data-use disclosures (Chrome "Privacy practices")

- Does the extension collect or use data? Yes, but only to provide the feature; nothing is
  sent to the developer.
- Data handled: website content (the words being read/translated) and user-provided
  authentication information (the API key the user enters).
- The developer does **not** sell data, does **not** use it for anything unrelated to the
  single purpose, and does **not** transfer it to the developer. Translation data goes
  directly to the third-party provider the user configured.
- Privacy policy URL: https://github.com/mohiria/In-Reading/blob/main/PRIVACY_POLICY.md

## Assets checklist (must be produced separately)

- Store logo (Edge: 300×300 PNG; Chrome uses the 128×128 icon).
- Screenshots 1280×800 (or 640×400), 1–5: annotated article, select-to-translate popup,
  toolbar popup, options page.
- (Chrome, optional) small promo tile 440×280.
- Public privacy-policy URL: https://github.com/mohiria/In-Reading/blob/main/PRIVACY_POLICY.md (live on main).
- Support contact (email or repo issues URL).

## Edge Partner Center — 隐私表单答案(可直接粘贴)

**单一用途**

> In Reading 是一款外语网页阅读助手:在用户阅读的页面上,只对高于其当前水平的生词做原位注解(音标 + 简短释义),并支持对选中的单词或句子按需翻译。

**权限理由**

- **storage** — 用于保存用户的设置、生词本、已掌握词列表,以及本地词库/AI 缓存。数据仅存于本地,插件本身不会外发。
- **activeTab** — 仅在用户主动开启插件时(点击工具栏图标或按 Alt+A),作用于用户当前正在阅读的页面。
- **Host 权限**(涵盖 `<all_urls>` 内容脚本 + API 域名) — 内容脚本运行在用户选择阅读的网页上,用于识别并原位注解生词(仅读取页面文本以渲染注解)。所列 host 域名——Google 翻译、有道、iCIBA,以及可选的 AI 服务(Google Gemini、OpenAI、Anthropic、DeepSeek、Moonshot/Kimi、智谱/GLM、阿里通义千问)——用于把翻译/查词请求发送到用户所选择的词典/AI 服务,使用用户自己的 API Key。可选的 `https://*/*` 权限仅在用户配置自定义 OpenAI 兼容端点时于运行时申请。

**你在使用远程代码吗? — 否**

> 所有可执行代码(JavaScript/WASM)均随插件包一起发布。插件不会加载、注入或 eval 任何远程脚本;它只通过网络请求向翻译/词典 API 获取翻译**数据**(文本/JSON),这些数据仅被解析并展示,绝不作为代码执行。

**你计划收集哪些用户数据?**

- 个人身份信息 / 健康信息 / 财务和付款信息 / 个人通信 / 位置 / Web 历史记录 / 用户活动 → **均不勾选(否)**
- **身份认证信息 → 勾选(是)** — 用户自行填写的第三方翻译/AI 服务 API Key;仅存储于本地(local/sync,可随浏览器账号同步),仅用于代表用户向其所选服务发起请求;绝不发送给开发者。
- **网站内容 → 勾选(是)** — 为实现原位注解,插件会读取当前页面文本;划词/整句翻译时会把选中的文本(及少量上下文)发送到用户所选的翻译/AI 服务。绝不发送给开发者,也不留存于任何开发者服务器。

**数据使用认证(均符合,可勾选)**

- 不将数据用于与单一用途无关的目的:符合。
- 不将数据用于判断信用状况或放贷:符合。
- 不出售或转让数据给第三方:符合(向用户**自己选择**的翻译/AI 服务发送文本,是实现核心功能所必需的“已批准用途”,不属于出售或转让)。

**隐私策略 URL**:https://github.com/mohiria/In-Reading/blob/main/PRIVACY_POLICY.md

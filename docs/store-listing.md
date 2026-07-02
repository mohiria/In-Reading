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

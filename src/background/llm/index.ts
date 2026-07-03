import { UserSettings } from '../../common/types'
import { formatIPA } from '../../common/utils/format'

interface LLMResponse {
  word: string
  ipa: string
  ipa_us?: string
  ipa_uk?: string
  meaning: string
  context: string
  source: string
}

export interface BatchItem {
  word: string
  sentence: string
}

export interface BatchGloss {
  meaning: string
  ipa_us?: string
  ipa_uk?: string
}

const BATCH_LIMIT = 40

const buildSinglePrompt = (word: string, contextSentence: string): string => `
You are an expert linguist and dictionary assistant.
Your task is to explain the English word "${word}" based on the provided context sentence.
Context: "${contextSentence}"

### CRITICAL INSTRUCTION FOR PRONUNCIATION:
- You MUST provide BOTH American (US) and British (UK) IPA.
- They OFTEN differ (e.g., r-colored vowels in US, different vowel heights).
- Example "schedule": ipa_us: "/ˈskɛdʒuːl/", ipa_uk: "/ˈʃɛdʒuːl/"
- Example "water": ipa_us: "/ˈwɔːtər/", ipa_uk: "/ˈwɔːtə/"
- Ensure "ipa_us" and "ipa_uk" fields are accurate for their respective regions.

Output ONLY a valid JSON object with this structure:
{
  "word": "${word}",
  "ipa_us": "IPA for US (General American)",
  "ipa_uk": "IPA for UK (Received Pronunciation)",
  "meaning": "Concise Chinese meaning fitting the context",
  "context": "Brief explanation of why this meaning applies here (in Chinese)"
}
`

const buildBatchPrompt = (items: BatchItem[]): string => {
  const list = items
    .map((it, i) => `${i + 1}. "${it.word}" — context: "${it.sentence}"`)
    .join('\n')
  return `
You are an expert linguist and dictionary assistant.
Explain each of the following English words based on its context sentence.

${list}

### CRITICAL INSTRUCTION FOR PRONUNCIATION:
- Provide BOTH American (US) and British (UK) IPA for every word; they often differ.

Output ONLY a single valid JSON object whose keys are the lowercased words and whose values
have this exact structure (no extra keys, no commentary):
{
  "<word>": {
    "ipa_us": "IPA for US (General American)",
    "ipa_uk": "IPA for UK (Received Pronunciation)",
    "meaning": "Concise Chinese meaning fitting the context"
  }
}
`
}

// Full-text translation prompt for phrase/sentence selections. Unlike the
// single-word prompt, it asks for a complete, faithful translation (no
// summarizing/paraphrasing) so clauses aren't dropped, and returns plain text.
const buildSentencePrompt = (text: string): string => `You are a professional English-to-Chinese translator.
Translate the text below into natural, fluent Simplified Chinese.
Translate the ENTIRE text faithfully — every clause and every parenthetical aside. Do NOT summarize, omit, merge, or paraphrase away any part.
Output ONLY the Chinese translation as plain text: no quotes, no pinyin, no explanation, no original English.

Text:
${text}`

// Hard ceiling on any single LLM call. Without it a slow "thinking" model (or a
// hung connection) leaves the selection popup stuck on "Translating…" forever;
// on timeout the call rejects and the orchestrator falls back to machine translation.
const LLM_TIMEOUT_MS = 20000

const fetchJson = async (url: string, init: RequestInit): Promise<any> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

// Sends a prompt to the configured provider and returns the raw model text.
const callLLMRaw = async (prompt: string, settings: UserSettings): Promise<string> => {
  const { provider, apiKey, baseUrl, model } = settings.llm

  if (!apiKey) {
    throw new Error('API Key is required for AI features')
  }

  // 1. Google Gemini
  if (provider === 'gemini') {
    const host = baseUrl ? baseUrl.replace(/\/$/, '') : 'https://generativelanguage.googleapis.com'
    const url = `${host}/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`
    const data = await fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
    if (data.error) throw new Error(data.error.message)
    return data.candidates[0].content.parts[0].text
  }

  // 2. Anthropic native (claude without a custom baseUrl)
  if (provider === 'claude' && !baseUrl) {
    const data = await fetchJson('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'Claude-Sonnet-4.6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (data.error) throw new Error(data.error.message)
    return data.content[0].text
  }

  // 3. OpenAI / Deepseek / Moonshot / Zhipu / Qwen / Custom / Claude-proxy (OpenAI compatible)
  let endpoint = ''
  let modelName = model || 'gpt-4o-mini'

  if (provider === 'openai') {
    endpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : 'https://api.openai.com/v1/chat/completions'
  } else if (provider === 'deepseek') {
    endpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : 'https://api.deepseek.com/chat/completions'
    modelName = model || 'deepseek-chat'
  } else if (provider === 'moonshot') {
    // Default to the fast, non-thinking model: the kimi-k2.x "thinking" models
    // reject temperature and take ~30s+ per call (too slow for an inline popup).
    endpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : 'https://api.moonshot.cn/v1/chat/completions'
    modelName = model || 'moonshot-v1-8k'
  } else if (provider === 'zhipu') {
    // glm-4-flash is the reliable free non-thinking model; glm-4.x-flash "thinking"
    // variants are slow and the flagship free model is frequently rate-limited (429).
    endpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
    modelName = model || 'glm-4-flash'
  } else if (provider === 'qwen') {
    endpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    modelName = model || 'qwen3.5-flash'
  } else if (provider === 'custom') {
    if (!baseUrl) throw new Error('Base URL is required for Custom Provider')
    endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`
  } else if (provider === 'claude') {
    endpoint = `${baseUrl!.replace(/\/$/, '')}/chat/completions`
  } else if (baseUrl) {
    endpoint = `${baseUrl}/chat/completions`
  }

  // No `temperature`: some "thinking" models (e.g. kimi-k2.x) reject anything other
  // than 1 with a 400 ("only 1 is allowed for this model"); omitting it works everywhere.
  const data = await fetchJson(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: 'You are a helpful dictionary assistant. Output valid JSON only.' },
        { role: 'user', content: prompt }
      ]
    })
  })

  if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message)
  const msg = data.choices?.[0]?.message
  // Non-thinking models return the answer in `content`; some thinking models leave
  // `content` empty and put the text in `reasoning_content`.
  return msg?.content || msg?.reasoning_content || ''
}

const sourceLabel = (settings: UserSettings): string => {
  const { provider, baseUrl } = settings.llm
  if (provider === 'gemini') return 'Gemini'
  if (provider === 'openai') return 'GPT'
  if (provider === 'deepseek') return 'DeepSeek'
  if (provider === 'moonshot') return 'Kimi'
  if (provider === 'zhipu') return 'GLM'
  if (provider === 'qwen') return 'Qwen'
  if (provider === 'custom') return 'Custom'
  if (provider === 'claude') return baseUrl ? 'Claude (Proxy)' : 'Claude'
  return 'AI'
}

export const fetchFromLLM = async (
  word: string,
  contextSentence: string,
  settings: UserSettings
): Promise<LLMResponse> => {
  const text = await callLLMRaw(buildSinglePrompt(word, contextSentence), settings)
  return parseLLMJson(text, sourceLabel(settings), settings.pronunciation)
}

// Translates a phrase/sentence selection in full and returns the translation in
// `meaning` (no IPA/POS) — rendered by the long-text card in SelectionPopup.
export const translateTextLLM = async (
  text: string,
  settings: UserSettings
): Promise<LLMResponse> => {
  const raw = await callLLMRaw(buildSentencePrompt(text), settings)
  const meaning = raw.replace(/```/g, '').trim()
  return { word: text, ipa: '', meaning, context: '', source: `AI (${sourceLabel(settings)})` }
}

// Explains up to BATCH_LIMIT words in one request. Returns a map keyed by the
// lowercased word; words the model omits are simply absent. Throws on a hard
// failure (no key / network / unparsable) so the caller can degrade silently.
export const fetchBatchFromLLM = async (
  items: BatchItem[],
  settings: UserSettings
): Promise<Record<string, BatchGloss>> => {
  if (items.length === 0) return {}
  const slice = items.slice(0, BATCH_LIMIT)
  const text = await callLLMRaw(buildBatchPrompt(slice), settings)
  const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
  const json = JSON.parse(cleanText)
  const out: Record<string, BatchGloss> = {}
  for (const [key, raw] of Object.entries(json as Record<string, any>)) {
    if (!raw || typeof raw !== 'object') continue
    const meaning = String(raw.meaning || '').trim()
    if (!meaning) continue
    out[key.toLowerCase()] = {
      meaning,
      ipa_us: raw.ipa_us ? formatIPA(raw.ipa_us) : undefined,
      ipa_uk: raw.ipa_uk ? formatIPA(raw.ipa_uk) : undefined
    }
  }
  return out
}

const parseLLMJson = (text: string, source: string, pronunciation: 'UK' | 'US'): LLMResponse => {
  try {
    // Cleanup markdown code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const json = JSON.parse(cleanText)
    return {
      word: json.word,
      ipa_us: formatIPA(json.ipa_us),
      ipa_uk: formatIPA(json.ipa_uk),
      ipa: formatIPA(pronunciation === 'US' ? (json.ipa_us || json.ipa) : (json.ipa_uk || json.ipa)),
      meaning: json.meaning,
      context: json.context,
      source: `AI (${source})`
    }
  } catch (e) {
    console.error('Failed to parse LLM response', text)
    throw new Error('Invalid AI response format')
  }
}

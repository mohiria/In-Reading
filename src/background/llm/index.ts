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
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    return data.candidates[0].content.parts[0].text
  }

  // 2. Anthropic native (claude without a custom baseUrl)
  if (provider === 'claude' && !baseUrl) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
    const data = await response.json()
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
    endpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : 'https://api.moonshot.cn/v1/chat/completions'
    modelName = model || 'kimi-k2.5'
  } else if (provider === 'zhipu') {
    endpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
    modelName = model || 'glm-4.7-flash'
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

  const response = await fetch(endpoint, {
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
      ],
      temperature: 0.3
    })
  })

  const data = await response.json()
  if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message)
  return data.choices[0].message.content
}

const sourceLabel = (settings: UserSettings): string => {
  const { provider, baseUrl } = settings.llm
  if (provider === 'gemini') return 'Gemini'
  if (provider === 'openai') return 'GPT'
  if (provider === 'deepseek') return 'Deepseek'
  if (provider === 'custom') return 'Custom AI'
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

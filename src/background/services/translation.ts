import { getPreferredIPA } from '../../common/utils/format'

/**
 * Youdao Dictionary Lookup (Single Word)
 */
export async function fetchFromYoudao(word: string, preferredPron: 'UK' | 'US') {
  try {
    const suggestUrl = `https://dict.youdao.com/suggest?q=${encodeURIComponent(word)}&num=1&doctype=json`
    const suggestRes = await fetch(suggestUrl)
    const suggestData = await suggestRes.json()
    
    let meaning = ''
    if (suggestData?.data?.entries?.[0]) {
      meaning = suggestData.data.entries[0].explain
    }

    const ipa_us = await fetchIpaFromYoudao(word, 'US')
    const ipa_uk = await fetchIpaFromYoudao(word, 'UK')

    if (meaning || ipa_us || ipa_uk) {
       const exp = { word, ipa_us, ipa_uk }
       return {
         ...exp,
         ipa: getPreferredIPA(exp as any, preferredPron),
         meaning: meaning || 'View details in dictionary'
       }
    }
  } catch (e) {
    console.error('Youdao fetch failed:', e)
  }
  return null
}

/**
 * Youdao Machine Translation (Phrases/Sentences)
 */
export async function fetchFromYoudaoMT(text: string) {
  const url = `https://fanyi.youdao.com/translate?&doctype=json&type=AUTO&i=${encodeURIComponent(text)}`
  const response = await fetch(url)
  const data = await response.json()
  if (data?.translateResult?.[0]) {
    const meaning = data.translateResult[0].map((r: any) => r.tgt).join('')
    return { word: text, meaning, source: 'Youdao MT' }
  }
  throw new Error('Youdao MT failed')
}

/**
 * iCIBA (Jinshan) Dictionary Lookup
 */
export async function fetchFromIciba(word: string) {
  try {
    const url = `https://dict-mobile.iciba.com/interface/index.php?c=word&m=getsuggest&nums=1&is_need_mean=1&word=${encodeURIComponent(word)}`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data?.message?.[0]) {
      const entry = data.message[0]
      const exp = { word, ipa: entry.symbol || '' }
      return {
        word: word,
        meaning: entry.paraphrase || '',
        ipa: getPreferredIPA(exp as any, 'US'), // iCIBA usually US-centric
        source: 'iCIBA'
      }
    }
  } catch (e) {
    console.error('iCIBA fetch failed:', e)
  }
  return null
}

/**
 * iCIBA Machine Translation
 */
export async function fetchFromIcibaMT(text: string) {
  const url = `https://ifanyi.iciba.com/index.php?c=trans&m=fy&client=6&auth_user=key_web_fanyi&sign=22222&pid=21007&q=${encodeURIComponent(text)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `from=auto&to=zh&q=${encodeURIComponent(text)}`
  })
  const data = await response.json()
  if (data?.content?.out) {
    return { word: text, meaning: data.content.out, source: 'iCIBA MT' }
  }
  throw new Error('iCIBA MT failed')
}

/**
 * Google Translate Fallback
 */
export async function fetchFromGoogle(text: string) {
  const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`
  const response = await fetch(googleUrl)
  const data = await response.json()
  
  if (data?.[0]?.[0]?.[0]) {
    return {
      word: text,
      meaning: data[0][0][0],
      ipa: '', 
      source: 'Google'
    }
  }
  throw new Error('Google Translate failed')
}

/**
 * Internal Helper for Youdao IPA
 */
async function fetchIpaFromYoudao(word: string, preferredPron: 'UK' | 'US') {
  try {
    const fullUrl = `https://dict.youdao.com/fsearch?client=deskdict&q=${encodeURIComponent(word)}&pos=-1&doctype=xml&xmlVersion=3.2`
    const fullRes = await fetch(fullUrl)
    const xml = await fullRes.text()
    
    if (preferredPron === 'UK') {
      const ukPhonetic = xml.match(/<uk-phonetic-symbol>(.*?)<\/uk-phonetic-symbol>/) || xml.match(/<uk-phonetic><!\[CDATA\[(.*?)\]\]><\/uk-phonetic>/)
      if (ukPhonetic) return ukPhonetic[1]
    } else {
      const usPhonetic = xml.match(/<us-phonetic-symbol>(.*?)<\/us-phonetic-symbol>/) || xml.match(/<us-phonetic><!\[CDATA\[(.*?)\]\]><\/us-phonetic>/)
      if (usPhonetic) return usPhonetic[1]
    }
    
    const phoneticMatch = xml.match(/<phonetic-symbol>(.*?)<\/phonetic-symbol>/) || xml.match(/<phonetic><!\[CDATA\[(.*?)\]\]><\/phonetic>/)
    return phoneticMatch ? phoneticMatch[1] : ''
  } catch (e) {
    return ''
  }
}

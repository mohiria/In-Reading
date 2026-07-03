import React, { useEffect, useState, useRef } from 'react'
import { useSettings } from '../../common/hooks/useSettings'
import { useVocabulary } from '../../common/hooks/useVocabulary'
import { useKnownWords } from '../../common/hooks/useKnownWords'
import { lookupWordInDB, getAiCache, putAiCache } from '../../common/storage/indexed-db'
import { WordExplanation } from '../../common/types'
import { BookOpen, Plus, Minus, Check, X } from 'lucide-react'
import { VoiceIcon } from './VoiceIcon'
import { getPreferredIPA } from '../../common/utils/format'
import { llmProviderLabel } from '../../common/config'
import { isAiSource } from '../engine/backfill'
import confusionMap from '../../../public/dictionaries/confusion-map.json'

export const SelectionPopup = () => {
  const { settings } = useSettings()
  const { vocabulary, addWord, removeWord } = useVocabulary()
  const { knownWords, addKnown, removeKnown } = useKnownWords()
  const [loading, setLoading] = useState(false)
  const [tabEnabled, setTabEnabled] = useState(false)
  // Monotonic request generation: bumped on every selection change (including
  // close). An async local lookup or a network response whose captured gen no
  // longer matches has been superseded and MUST NOT touch the popup state.
  const genRef = useRef(0)
  const [selection, setSelection] = useState<{
    text: string
    rect: DOMRect
    explanation: WordExplanation | null
    isSaved: boolean
  } | null>(null)

  useEffect(() => {
    const checkState = () => {
      // The 2s interval outlives the extension context after a reload; a chrome.*
      // call from the dead context throws "Extension context invalidated."
      if (!chrome.runtime?.id) return
      try {
        chrome.runtime.sendMessage({ type: 'GET_TAB_STATE' }, (res) => {
          if (chrome.runtime.lastError) return
          setTabEnabled(!!res?.enabled)
        })
      } catch { /* context invalidated */ }
    }
    checkState()

    const handleMessage = (req: any) => {
      if (req.type === 'TOGGLE_TAB_ENABLED') {
        setTabEnabled(req.enabled)
        if (!req.enabled) setSelection(null)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    const interval = setInterval(checkState, 2000)
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const handleSelection = async () => {
      // Every selection/close supersedes any in-flight request for the previous one.
      const gen = ++genRef.current
      if (!tabEnabled) return

      const sel = window.getSelection()
      const text = sel?.toString().trim()
      if (!sel || sel.isCollapsed || !text || text.length > 500 || !/[a-zA-Z]/.test(text)) {
        setSelection(null)
        setLoading(false)
        return
      }

      const rect = sel.getRangeAt(0).getBoundingClientRect()
      const lowerText = text.toLowerCase()

      // Dictionary A (Confusion Map) is now standardized
      const confusionEntry = (confusionMap as Record<string, any>)[lowerText]
      let localExp: WordExplanation | null = confusionEntry || await lookupWordInDB(text)
      if (!localExp) {
        // Reuse a gloss already AI-backfilled on the page (instant, no network).
        // Under AI, a non-AI cached gloss (legacy Youdao pollution / standard-mode
        // leftover) is ignored so the selection re-queries AI instead of serving it.
        const aiHit = (await getAiCache([lowerText]))[lowerText] as WordExplanation | undefined
        const staleNonAi = settings?.engine === 'llm' && aiHit && !isAiSource(aiHit.source)
        if (aiHit && !staleNonAi) localExp = aiHit
      }
      if (gen !== genRef.current) return // superseded during the async local lookup

      const isSaved = vocabulary.some(v => v.word.toLowerCase() === lowerText)

      if (isSaved || localExp) {
        const baseExp = isSaved ? vocabulary.find(v => v.word.toLowerCase() === lowerText)! : localExp!
        const explanation = { ...baseExp, ipa: getPreferredIPA(baseExp, settings?.pronunciation || 'US') }
        setSelection({ text, rect, explanation, isSaved })
        setLoading(false)
        return
      }

      setSelection({ text, rect, explanation: null, isSaved: false })
      setLoading(true)

      if (!chrome.runtime?.id) { setLoading(false); return }
      try {
      chrome.runtime.sendMessage({
        type: 'TRANSLATE_WORD', text, context: text, settings
      }, (res) => {
        if (gen !== genRef.current) return // a newer selection/close superseded this request
        if (chrome.runtime.lastError) { setLoading(false); return }
        setLoading(false)
        if (res?.success) {
          setSelection(prev => prev ? { ...prev, explanation: res.data } : null)
          // Cache single-word results so a repeat selection resolves instantly.
          // AI-only cache: a non-AI fallback (Youdao/iCIBA/Google) is shown but not
          // cached, so a later selection re-attempts AI instead of reusing it.
          if (res.data?.meaning && !/\s/.test(text) && isAiSource(res.data.source)) {
            putAiCache([{
              word: lowerText,
              meaning: res.data.meaning,
              ipa_us: res.data.ipa_us,
              ipa_uk: res.data.ipa_uk,
              source: res.data.source
            }]).catch(() => {})
          }
        }
      })
      } catch { setLoading(false) /* context invalidated */ }
    }

    const onMouseUp = (e: MouseEvent) => {
      if (document.getElementById('ll-extension-host')?.contains(e.target as Node)) return
      setTimeout(handleSelection, 10)
    }

    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [tabEnabled, vocabulary, settings])

  if (!selection && !loading) return null

  const onToggleVocab = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selection?.explanation) return
    if (selection.isSaved) {
      await removeWord(selection.text)
    } else {
      await addWord({ ...selection.explanation, timestamp: Date.now(), sourceUrl: window.location.href })
    }
    setTimeout(() => setSelection(null), 300)
  }

  const onToggleKnown = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selection) return
    const lower = selection.text.toLowerCase()
    if (knownWords.includes(lower)) {
      await removeKnown(selection.text)
    } else {
      await addKnown(selection.text)
    }
    setTimeout(() => setSelection(null), 300)
  }

  const calculatePosition = () => {
    if (!selection) return {}
    const { rect } = selection
    let top = rect.bottom + 10
    if (window.innerHeight - rect.bottom < 150 && rect.top > 150) top = rect.top - 160
    return {
      top: Math.max(10, top),
      left: Math.max(110, Math.min(window.innerWidth - 110, rect.left + rect.width / 2)),
      transform: 'translateX(-50%)',
      position: 'fixed' as const
    }
  }

  const style: React.CSSProperties = {
    ...calculatePosition(),
    backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    padding: '14px', zIndex: 2147483647, fontFamily: 'sans-serif', border: '1px solid #ddd',
    minWidth: '240px', maxWidth: '360px', color: '#333', userSelect: 'none',
    boxSizing: 'border-box', pointerEvents: 'auto'
  }

  if (!selection) return null

  const currentPron = settings?.pronunciation || 'US'
  const exp = selection.explanation
  // Legacy ai_cache entries carry a bare "AI" source (written before provider
  // labeling); show the current provider for them. Already-labeled "AI (X)" and
  // non-AI sources (Youdao, …) are left untouched.
  const displaySource = exp?.source === 'AI' && settings?.llm?.provider
    ? `AI (${llmProviderLabel(settings.llm.provider, settings.llm.baseUrl)})`
    : exp?.source
  const isKnown = knownWords.includes(selection.text.toLowerCase())
  // Vocabulary / known-words are single-word concepts; hide the save buttons for
  // phrase / sentence selections (which only get a translation).
  const isSingleWord = !/\s/.test(selection.text.trim())

  // Any multi-word selection (phrase or sentence) gets a reading-oriented card
  // instead of the word layout: wider, muted original on top, a divider, then the
  // prominent full translation — matching that multi-word selections now return a
  // complete translation rather than a single-word explanation.
  const isLongText = !isSingleWord
  if (isLongText) {
    return (
      <div style={{ ...style, maxWidth: '480px', minWidth: '320px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <BookOpen size={16} color="#4b8bf5" />
          <span style={{ fontSize: '12px', color: '#888', flex: 1 }}>划词翻译</span>
          {displaySource && (
            <span style={{ fontSize: '10px', backgroundColor: '#f5f5f5', color: '#888', padding: '2px 6px', borderRadius: '4px' }}>
              {displaySource}
            </span>
          )}
        </div>
        <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, maxHeight: '5.5em', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
          {selection.text}
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '12px', color: '#999' }}>Translating...</div>
        ) : exp && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee', fontSize: '15px', color: '#202124', lineHeight: 1.7, maxHeight: '50vh', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
            {exp.meaning}
          </div>
        )}
      </div>
    )
  }

  let showSingleHeaderIPA = false
  let headerIPA = ''
  if (exp?.entries) {
    const ipas = exp.entries.map(e => currentPron === 'UK' ? e.phon_br : e.phon_n_am)
    if (new Set(ipas).size === 1) {
      showSingleHeaderIPA = true
      headerIPA = ipas[0]
    }
  } else if (exp?.ipa) {
    showSingleHeaderIPA = true
    headerIPA = exp.ipa
  }

  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <BookOpen size={18} color="#4b8bf5" />
        <span style={{ fontWeight: 'bold', fontSize: '1.1rem', flex: 1 }}>{selection.text}</span>
        {displaySource && (
          <span style={{ fontSize: '10px', backgroundColor: '#f5f5f5', color: '#888', padding: '2px 6px', borderRadius: '4px' }}>
            {displaySource}
          </span>
        )}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '10px', color: '#999' }}>Translating...</div> : exp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          
          {showSingleHeaderIPA && headerIPA && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <span style={{ color: '#1a73e8', fontWeight: 'bold', fontSize: '12px' }}>{currentPron}</span>
              <span style={{ color: '#5f6368', fontSize: '13px' }}>{headerIPA}</span>
              <VoiceIcon 
                word={selection.text} 
                pronunciation={currentPron} 
                size={16} 
              />
            </div>
          )}

          <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#202124' }}>
            {exp.entries ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {exp.entries.map((entry, idx) => (
                  <div key={idx} style={{ 
                    borderTop: idx > 0 ? '1px solid #f0f0f0' : 'none', 
                    paddingTop: idx > 0 ? '8px' : '0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontStyle: 'italic', color: '#1a73e8', fontSize: '12px', fontWeight: 'bold' }}>
                          {entry.type}
                        </span>
                        {!showSingleHeaderIPA && (
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {currentPron === 'UK' ? entry.phon_br : entry.phon_n_am}
                          </span>
                        )}
                      </div>
                      {!showSingleHeaderIPA && (
                        <VoiceIcon 
                          word={selection.text} 
                          pronunciation={currentPron}
                          size={14} 
                          color="#888" 
                        />
                      )}
                    </div>
                    <div style={{ fontWeight: 500 }}>{entry.translation}</div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {!showSingleHeaderIPA && exp.cefr && (
                   <span style={{ fontSize: '10px', backgroundColor: '#e6fffa', color: '#319795', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold', marginBottom: '6px', display: 'inline-block' }}>
                    {String(exp.cefr).toUpperCase()}
                  </span>
                )}
                {exp.definitions?.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {exp.definitions.map((def, idx) => (
                      <div key={idx}>
                        <span style={{ fontStyle: 'italic', color: '#888', marginRight: '8px', fontSize: '12px' }}>{def.type}</span>
                        <span>{def.translation}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>{exp.meaning}</div>
                )}
              </>
            )}
          </div>
          
          {isSingleWord && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={onToggleVocab}
              style={{
                flex: 1, padding: '8px',
                backgroundColor: selection.isSaved ? '#4b8bf5' : 'transparent',
                color: selection.isSaved ? 'white' : '#4b8bf5',
                border: '1px solid #4b8bf5',
                borderRadius: '6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', fontWeight: '500', fontSize: '13px', whiteSpace: 'nowrap'
              }}
            >
              {selection.isSaved ? <><Minus size={14} /> 移出生词本</> : <><Plus size={14} /> 生词本</>}
            </button>

            <button
              onClick={onToggleKnown}
              style={{
                flex: 1, padding: '8px',
                backgroundColor: isKnown ? '#319795' : 'transparent',
                color: isKnown ? 'white' : '#888',
                border: isKnown ? '1px solid #319795' : '1px solid #ddd',
                borderRadius: '6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', fontWeight: '500', fontSize: '13px', whiteSpace: 'nowrap'
              }}
            >
              {isKnown ? <><X size={14} /> 取消已掌握</> : <><Check size={14} /> 已掌握</>}
            </button>
          </div>
          )}
        </div>
      )}
    </div>
  )
}

import React, { useState, useRef } from 'react'
import { ProficiencyLevel, LLMProvider, LLMSettings } from '../common/types'
import { useSettings } from '../common/hooks/useSettings'
import { useVocabulary } from '../common/hooks/useVocabulary'
import { useKnownWords } from '../common/hooks/useKnownWords'
import { LLM_MODELS, LLM_DEFAULT_URLS } from '../common/config'
import { groupByAddedTime } from '../common/utils/vocab'
import { toCSV, downloadCSV, parseVocabCSV, toKnownCSV, parseKnownCSV } from '../common/utils/export'
import { formatIPA } from '../common/utils/format'
import { forceReimportDictionary } from '../common/storage/indexed-db'
import { Cpu, Settings, Globe, Check, BookOpen, Trash2, Download, Upload, RotateCcw } from 'lucide-react'

export const Options = () => {
  const { settings, updateSettings, loading } = useSettings()
  const { vocabulary, addWord, removeWord } = useVocabulary()
  const { knownWords, addKnown, removeKnown } = useKnownWords()
  const [savedStatus, setSavedStatus] = useState(false)
  const [vocabQuery, setVocabQuery] = useState('')
  const [knownQuery, setKnownQuery] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [vocabMsg, setVocabMsg] = useState('')
  const [knownMsg, setKnownMsg] = useState('')
  const vocabFileRef = useRef<HTMLInputElement>(null)
  const knownFileRef = useRef<HTMLInputElement>(null)

  const handleVocabImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return
    try {
      const rows = parseVocabCSV(await file.text())
      const existing = new Set(vocabulary.map(v => v.word.toLowerCase()))
      let added = 0
      for (const w of rows) {
        if (existing.has(w.word.toLowerCase())) continue
        await addWord(w)
        existing.add(w.word.toLowerCase())
        added++
      }
      setVocabMsg(`已导入 ${added} 个（跳过重复 ${rows.length - added}）`)
    } catch {
      setVocabMsg('导入失败，请检查文件格式。')
    } finally {
      setTimeout(() => setVocabMsg(''), 5000)
    }
  }

  const handleKnownImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const words = parseKnownCSV(await file.text())
      const existing = new Set(knownWords.map(w => w.toLowerCase()))
      let added = 0
      for (const w of words) {
        if (existing.has(w)) continue
        await addKnown(w)
        existing.add(w)
        added++
      }
      setKnownMsg(`已导入 ${added} 个（跳过重复 ${words.length - added}）`)
    } catch {
      setKnownMsg('导入失败，请检查文件格式。')
    } finally {
      setTimeout(() => setKnownMsg(''), 5000)
    }
  }

  const handleResetDictCache = async () => {
    setResetting(true)
    setResetMsg('')
    try {
      await forceReimportDictionary()
      setResetMsg('已重置并重导词库，请刷新正在阅读的页面以生效。')
    } catch {
      setResetMsg('重置失败，请重试。')
    } finally {
      setResetting(false)
      setTimeout(() => setResetMsg(''), 5000)
    }
  }

  const handleUpdate = async (updates: any) => {
    await updateSettings(updates)
    setSavedStatus(true)
    setTimeout(() => setSavedStatus(false), 2000)
  }

  const handleLLMUpdate = (updates: Partial<LLMSettings>) => {
    if (!settings) return
    handleUpdate({ llm: { ...settings.llm, ...updates } })
  }

  if (loading || !settings) return <div style={{ padding: '2rem' }}>Loading settings...</div>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', color: '#333', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={32} /> In Reading Settings
        </h1>
        {savedStatus && (
          <span style={{ color: '#4caf50', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Check size={18} /> Saved
          </span>
        )}
      </header>

      <div style={{ display: 'grid', gap: '2rem' }}>
        <section style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={20} /> General
          </h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Proficiency Level</label>
            <select 
              value={settings.proficiency} 
              onChange={(e) => handleUpdate({ proficiency: e.target.value as ProficiencyLevel })}
              style={{ padding: '8px', width: '300px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="CEFR_A1">入门 (A1 - Beginner)</option>
              <option value="CEFR_A2">基础 (A2 - Elementary)</option>
              <option value="CEFR_B1">中级 (B1 - Intermediate)</option>
              <option value="CET4">四级 (CET4) / B2</option>
              <option value="CET6">六级 (CET6) / C1</option>
              <option value="CEFR_C1">高级 (C1+)</option>
              <option value="CEFR_C2">精通 (C2)</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Pronunciation Style</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {['US', 'UK'].map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="pronunciation" checked={settings.pronunciation === p} 
                    onChange={() => handleUpdate({ pronunciation: p as any })}
                  />
                  {p === 'US' ? 'American (US)' : 'British (UK)'}
                </label>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.showIPA} onChange={(e) => handleUpdate({ showIPA: e.target.checked })} />
            Show IPA Pronunciation
          </label>
        </section>

        <section style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} /> AI / LLM Configuration
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Provider</label>
              <select 
                value={settings.llm.provider} 
                onChange={(e) => {
                  const p = e.target.value as LLMProvider
                  handleLLMUpdate({ provider: p, model: p !== 'custom' ? LLM_MODELS[p as keyof typeof LLM_MODELS][0] : '' })
                }}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="claude">Anthropic Claude</option>
                <option value="deepseek">Deepseek</option>
                <option value="moonshot">月之暗面 (Kimi)</option>
                <option value="zhipu">智谱 AI (GLM)</option>
                <option value="qwen">阿里千问 (Qwen)</option>
                <option value="custom">Custom (OpenAI Compatible)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Model</label>
              {settings.llm.provider === 'custom' ? (
                <input 
                  type="text" value={settings.llm.model || ''} 
                  onChange={(e) => handleLLMUpdate({ model: e.target.value })}
                  placeholder="e.g. gpt-4-turbo"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              ) : (
                <select 
                  value={settings.llm.model} 
                  onChange={(e) => handleLLMUpdate({ model: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  {(LLM_MODELS[settings.llm.provider as keyof typeof LLM_MODELS] || []).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>API Key</label>
            <input 
              type="password" value={settings.llm.apiKey} 
              onChange={(e) => handleLLMUpdate({ apiKey: e.target.value })}
              placeholder="sk-..."
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Base URL (Optional)</label>
            <input 
              type="text" value={settings.llm.baseUrl || ''} 
              onChange={(e) => handleLLMUpdate({ baseUrl: e.target.value })}
              placeholder={LLM_DEFAULT_URLS[settings.llm.provider]}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
        </section>

        <section style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={20} /> 生词本 ({vocabulary.length})
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {vocabMsg && <span style={{ fontSize: '0.8rem', color: '#319795' }}>{vocabMsg}</span>}
              <input ref={vocabFileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleVocabImport} />
              <button
                onClick={() => vocabFileRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px',
                  border: '1px solid #ddd', background: 'white', color: '#333', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                <Upload size={14} /> 导入 CSV
              </button>
              <button
                onClick={() => vocabulary.length && downloadCSV(`in-reading-vocab-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(vocabulary))}
                disabled={vocabulary.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px',
                  border: '1px solid #ddd', background: vocabulary.length ? 'white' : '#f0f0f0',
                  color: vocabulary.length ? '#333' : '#aaa', cursor: vocabulary.length ? 'pointer' : 'not-allowed', fontSize: '0.85rem'
                }}
              >
                <Download size={14} /> 导出 CSV
              </button>
            </div>
          </div>

          <input
            type="text"
            value={vocabQuery}
            onChange={(e) => setVocabQuery(e.target.value)}
            placeholder="搜索单词或释义…"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '1rem' }}
          />

          {(() => {
            const q = vocabQuery.trim().toLowerCase()
            const filtered = q
              ? vocabulary.filter(v => v.word.toLowerCase().includes(q) || (v.meaning || '').toLowerCase().includes(q))
              : vocabulary
            const groups = groupByAddedTime(filtered)
            if (groups.length === 0) {
              return <p style={{ color: '#999', textAlign: 'center', margin: '1.5rem 0' }}>{vocabulary.length === 0 ? '还没有收藏生词。' : '没有匹配的生词。'}</p>
            }
            return groups.map(group => (
              <div key={group.key} style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold', marginBottom: '0.5rem' }}>{group.label} ({group.words.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {group.words.map(item => (
                    <div key={item.word} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', background: 'white', borderRadius: '4px', border: '1px solid #eee'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 'bold' }}>{item.word}</span>
                        <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '8px' }}>{formatIPA(item.ipa)} {item.meaning}</span>
                      </div>
                      <button onClick={() => removeWord(item.word)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb' }} title="删除">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </section>

        <section style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={20} /> 已掌握 ({knownWords.length})
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {knownMsg && <span style={{ fontSize: '0.8rem', color: '#319795' }}>{knownMsg}</span>}
              <input ref={knownFileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleKnownImport} />
              <button
                onClick={() => knownFileRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px',
                  border: '1px solid #ddd', background: 'white', color: '#333', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                <Upload size={14} /> 导入 CSV
              </button>
              <button
                onClick={() => knownWords.length && downloadCSV(`in-reading-known-${new Date().toISOString().slice(0, 10)}.csv`, toKnownCSV(knownWords))}
                disabled={knownWords.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px',
                  border: '1px solid #ddd', background: knownWords.length ? 'white' : '#f0f0f0',
                  color: knownWords.length ? '#333' : '#aaa', cursor: knownWords.length ? 'pointer' : 'not-allowed', fontSize: '0.85rem'
                }}
              >
                <Download size={14} /> 导出 CSV
              </button>
            </div>
          </div>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#666' }}>
            标记为已掌握的词不再被注解（仍可划词主动查询）。在阅读时划词点「已掌握」加入。
          </p>

          <input
            type="text"
            value={knownQuery}
            onChange={(e) => setKnownQuery(e.target.value)}
            placeholder="搜索已掌握的词…"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '1rem' }}
          />

          {(() => {
            const q = knownQuery.trim().toLowerCase()
            const filtered = q ? knownWords.filter(w => w.includes(q)) : knownWords
            if (filtered.length === 0) {
              return <p style={{ color: '#999', textAlign: 'center', margin: '1.5rem 0' }}>{knownWords.length === 0 ? '还没有标记已掌握的词。' : '没有匹配的词。'}</p>
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filtered.map(word => (
                  <div key={word} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', background: 'white', borderRadius: '4px', border: '1px solid #eee'
                  }}>
                    <span style={{ fontWeight: 'bold' }}>{word}</span>
                    <button onClick={() => removeKnown(word)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb' }} title="移除（恢复注解）">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )
          })()}
        </section>

        <section style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RotateCcw size={20} /> 维护
          </h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#666' }}>
            清空本地词库缓存并重新导入内置词库（用于词库更新后未自动生效的情况）。不影响生词本。
          </p>
          <button
            onClick={handleResetDictCache}
            disabled={resetting}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px',
              border: '1px solid #ddd', background: resetting ? '#f0f0f0' : 'white',
              color: resetting ? '#aaa' : '#333', cursor: resetting ? 'not-allowed' : 'pointer', fontSize: '0.85rem'
            }}
          >
            <RotateCcw size={14} /> {resetting ? '正在重置…' : '重置词库缓存'}
          </button>
          {resetMsg && <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#319795' }}>{resetMsg}</p>}
        </section>
      </div>
    </div>
  )
}

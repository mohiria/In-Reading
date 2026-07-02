import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// jsdom has no Web Speech API; mock the minimal surface speak() uses.
class MockUtterance {
  text: string
  lang = ''
  rate = 1
  pitch = 1
  volume = 1
  voice: any = null
  constructor(text: string) {
    this.text = text
  }
}

const usVoice = { name: 'Google US English', lang: 'en-US', localService: false }

const longText =
  'This is a deliberately long sentence used to verify that the speech synthesis keep-alive timer resumes playback so the utterance is not cut off around the fifteen second mark.'

let mockSynth: any
let speak: (text: string, lang?: string) => void

beforeEach(async () => {
  vi.useFakeTimers()
  mockSynth = {
    speaking: true,
    cancel: vi.fn(),
    speak: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => [usVoice]),
    onvoiceschanged: null,
  }
  vi.stubGlobal('speechSynthesis', mockSynth)
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance as any)
  vi.resetModules()
  ;({ speak } = await import('../../common/utils/speech'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('speak() — long-utterance TTS keep-alive (#9)', () => {
  it('T6: resumes synthesis periodically for utterances longer than 100 chars', () => {
    expect(longText.length).toBeGreaterThan(100)
    speak(longText, 'en-US')
    vi.advanceTimersByTime(50) // let the queued speak fire
    expect(mockSynth.speak).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(5000) // keep-alive tick
    expect(mockSynth.resume).toHaveBeenCalled()
  })

  it('T7: stops resuming once speech ends', () => {
    speak(longText, 'en-US')
    vi.advanceTimersByTime(50)
    mockSynth.speaking = false // speech finished
    vi.advanceTimersByTime(5000) // tick should clear the interval, not resume
    const callsAfterEnd = mockSynth.resume.mock.calls.length
    vi.advanceTimersByTime(15000) // further ticks must not resume again
    expect(mockSynth.resume.mock.calls.length).toBe(callsAfterEnd)
  })
})

import { useCallback, useEffect, useRef, useState } from 'react'

// Text-to-speech narration with the Web Speech API (SRS 3.1.1.3.b, 3.2.4.1).
// The API can't seek, so 15-second skips restart from an estimated character
// offset (about 15 characters per second of speech).
const CHARS_PER_SECOND = 15
const SEEK_SECONDS = 15

export function useSpeech(text: string, lang = 'en-PH') {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [state, setState] = useState<'stopped' | 'playing' | 'paused'>('stopped')
  const offset = useRef(0)
  const spoken = useRef(0)

  const speakFrom = useCallback(
    (start: number) => {
      if (!supported) return
      window.speechSynthesis.cancel()
      offset.current = Math.max(0, Math.min(start, text.length - 1))
      spoken.current = 0
      const utterance = new SpeechSynthesisUtterance(text.slice(offset.current))
      utterance.lang = lang
      utterance.onboundary = (event) => (spoken.current = event.charIndex)
      utterance.onend = () => setState((s) => (s === 'playing' ? 'stopped' : s))
      window.speechSynthesis.speak(utterance)
      setState('playing')
    },
    [lang, supported, text],
  )

  useEffect(() => () => (supported ? window.speechSynthesis.cancel() : undefined), [supported])

  const position = () => offset.current + spoken.current

  return {
    supported,
    state,
    play: () => {
      if (state === 'paused') {
        window.speechSynthesis.resume()
        setState('playing')
      } else speakFrom(0)
    },
    pause: () => {
      window.speechSynthesis.pause()
      setState('paused')
    },
    stop: () => {
      window.speechSynthesis.cancel()
      setState('stopped')
    },
    forward: () => speakFrom(position() + SEEK_SECONDS * CHARS_PER_SECOND),
    back: () => speakFrom(position() - SEEK_SECONDS * CHARS_PER_SECOND),
  }
}

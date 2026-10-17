import { ChevronDown, Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'

/** Collapsible story card with TTS controls (SRS 3.1.1.3.a-b, 3.2.2.2). */
export function StorySection({ title, text, defaultOpen = false, lang }: { title: string; text: string; defaultOpen?: boolean; lang?: string }) {
  const speech = useSpeech(text, lang)
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-line bg-surface">
      <summary className="touch-target flex cursor-pointer list-none items-center justify-between px-5 py-3">
        <span className="font-bold uppercase tracking-wide text-coral">{title}</span>
        <ChevronDown className="transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-5 pb-5">
        <p className="leading-7">{text}</p>
        {speech.supported && (
          <div className="mt-3 flex items-center gap-2" aria-label={`Listen to ${title}`}>
            <button type="button" onClick={speech.back} aria-label="Back 15 seconds" className="touch-target flex items-center justify-center rounded-full bg-surface-strong">
              <RotateCcw size={18} aria-hidden />
            </button>
            {speech.state === 'playing' ? (
              <button type="button" onClick={speech.pause} aria-label="Pause narration" className="touch-target flex items-center justify-center rounded-full bg-primary text-on-primary">
                <Pause size={20} aria-hidden />
              </button>
            ) : (
              <button type="button" onClick={speech.play} aria-label="Play narration" className="touch-target flex items-center justify-center rounded-full bg-primary text-on-primary">
                <Play size={20} aria-hidden />
              </button>
            )}
            <button type="button" onClick={speech.forward} aria-label="Forward 15 seconds" className="touch-target flex items-center justify-center rounded-full bg-surface-strong">
              <RotateCw size={18} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </details>
  )
}

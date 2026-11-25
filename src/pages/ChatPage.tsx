import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import Markdown from 'react-markdown'
import { useChat, useLandmark } from '@/api/hooks'
import type { ChatMessage, Landmark } from '@/api/types'
import { ArrowBackIcon, ArrowUpIcon, CameraIcon, CheckmarkIcon, CompassIcon } from '@/components/icons/ionicons'
import { LandmarkImage } from '@/components/LandmarkCard'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { focus } from '@/components/TopNavbar'
import { useBack } from '@/hooks/useBack'
import { formatFee } from '@/lib/format'
import { readJson, removeKey, writeJson } from '@/lib/storage'

type Feedback = 'helpful' | 'needs-improvement'
type StoredMessage = ChatMessage & { at: string; feedback?: Feedback }

const PROMPTS = ['Where is this place?', 'Fees & hours?', "What's nearby?"]
const micro = 'text-[0.6875rem] leading-[0.875rem] font-bold tracking-[0.02em]'

const greeting = (name: string): StoredMessage => ({
  role: 'model',
  content: `Maayong adlaw, bai! 👋 I'm your guide at **${name}**. Ask me about its history, architecture, or what to see nearby.`,
  at: new Date().toISOString(),
})

/** "Today, Nov 20" for today's messages, "Nov 19" for older ones. */
function dayLabel(at: string, now = new Date()) {
  const day = new Date(at)
  const date = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return day.toDateString() === now.toDateString() ? `Today, ${date}` : date
}

/** Figma "10 · Ask bAI (AI Guide Chat)" (558:3385 light, 558:3476 dark). Chats are cached per landmark (SRS 3.1.2). */
export default function ChatPage() {
  const { id = '' } = useParams()
  const landmark = useLandmark(id)
  const chat = useChat()
  const back = useBack()
  const storageKey = `chat:${id}`
  const [messages, setMessages] = useState<StoredMessage[]>(() => readJson(storageKey, []))
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const shown = messages.length || !landmark.data ? messages : [greeting(landmark.data.name)]

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [shown.length, chat.isPending])

  const persist = (next: StoredMessage[]) => {
    setMessages(next)
    writeJson(storageKey, next.slice(-60))
  }

  const ask = (text: string) => {
    if (!text || chat.isPending) return
    const next = [...shown, { role: 'user' as const, content: text, at: new Date().toISOString() }]
    persist(next)
    chat.mutate(
      // The greeting is local UI only; the API expects the conversation to start with the user.
      { landmarkId: id, messages: next.filter((m, i) => !(i === 0 && m.role === 'model')).map(({ role, content }) => ({ role, content })) },
      { onSuccess: (result) => persist([...next, { ...result.message, at: new Date().toISOString() }]) },
    )
  }

  const send = (event: FormEvent) => {
    event.preventDefault()
    if (chat.isPending) return
    ask(draft.trim())
    setDraft('')
  }

  // shortcut: feedback stays on this device until the API has an endpoint for it.
  const rate = (index: number, feedback: Feedback) => persist(shown.map((m, i) => (i === index ? { ...m, feedback } : m)))

  const transcript = () =>
    shown.map((m) => `[${new Date(m.at).toLocaleString()}] ${m.role === 'user' ? 'You' : 'bAI'}: ${m.content}`).join('\n\n')

  const exportChat = () => {
    const url = URL.createObjectURL(new Blob([transcript()], { type: 'text/plain' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `laag-ta-bai-${id}-chat.txt` })
    a.click()
    URL.revokeObjectURL(url)
  }

  if (landmark.isPending) return <Loading />
  if (landmark.isError) return <ErrorMessage error={landmark.error} onRetry={() => landmark.refetch()} />

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-ivory px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1">
        <button type="button" onClick={back} aria-label="Go back" className={`touch-target -ml-3.5 flex items-center justify-center rounded-full text-ink ${focus}`}>
          <ArrowBackIcon size={20} />
        </button>
        <h1 aria-label={`Ask bAI about ${landmark.data.name}`} className="min-w-0 truncate rounded-full bg-ivory-deep px-3.5 py-2 text-xs font-bold text-ink">
          {landmark.data.name}
        </h1>
        <div className={`-mr-2 flex items-center text-ink-muted ${micro}`}>
          <TextButton onClick={() => navigator.clipboard?.writeText(transcript())}>Copy</TextButton>
          <span aria-hidden>·</span>
          <TextButton onClick={exportChat}>Export</TextButton>
          <span aria-hidden>·</span>
          <TextButton
            onClick={() => {
              removeKey(storageKey)
              setMessages([])
            }}
          >
            Clear
          </TextButton>
        </div>
      </header>

      <ol className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-4" aria-live="polite">
        {shown.map((m, i) => (
          <Fragment key={i}>
            {(i === 0 || new Date(shown[i - 1].at).toDateString() !== new Date(m.at).toDateString()) && (
              <li className={`text-center font-mono text-ink-muted uppercase ${micro}`}>
                <time dateTime={m.at}>{dayLabel(m.at)}</time>
              </li>
            )}
            {m.role === 'user' ? (
              <li className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl bg-navy px-4 py-3 text-sm whitespace-pre-wrap text-on-navy">
                  <span className="sr-only">You: </span>
                  {m.content}
                </p>
              </li>
            ) : (
              <li className="flex flex-col gap-3">
                <Guide>
                  <div className="markdown text-sm text-ink">
                    <span className="sr-only">bAI: </span>
                    <Markdown>{m.content}</Markdown>
                  </div>
                </Guide>
                {i === 0 ? <SummaryCard landmark={landmark.data} /> : <Rate value={m.feedback} onRate={(f) => rate(i, f)} />}
              </li>
            )}
          </Fragment>
        ))}
        {chat.isPending && (
          <li>
            <Guide>
              <p className="text-sm text-ink-muted">bAI is typing…</p>
            </Guide>
          </li>
        )}
      </ol>
      <div ref={endRef} />
      {chat.isError && <ErrorMessage error={chat.error} />}

      <div className="sticky bottom-0 flex flex-col gap-0.5 bg-ivory px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {PROMPTS.map((prompt) => (
            <button key={prompt} type="button" onClick={() => ask(prompt)} disabled={chat.isPending} className={`group flex min-h-12 shrink-0 items-center rounded-full ${focus}`}>
              <span className="rounded-full border border-ivory-line bg-ivory-surface px-3 py-2 text-xs font-medium text-ink group-disabled:opacity-60">{prompt}</span>
            </button>
          ))}
        </div>
        <form onSubmit={send} className="flex flex-col gap-2.5 rounded-3xl border border-ivory-line bg-ivory-surface py-3 pr-3 pl-4 shadow-card focus-within:border-navy">
          <label className="sr-only" htmlFor="chat-input">
            Message
          </label>
          <input
            id="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            placeholder="Ask about this place…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          />
          <div className="-my-[0.3125rem] flex items-center justify-between">
            {/* shortcut: /v1/chat takes text only, so photos go through Scan; attach them here once the API accepts images. */}
            <Link to="/scan" aria-label="Scan or upload a photo" className={`touch-target -ml-3.5 flex items-center justify-center rounded-full text-ink ${focus}`}>
              <CameraIcon size={20} />
            </Link>
            <button type="submit" aria-label="Send" disabled={!draft.trim() || chat.isPending} className={`group touch-target -mr-[0.3125rem] flex items-center justify-center rounded-full ${focus}`}>
              <span className="flex size-[2.375rem] items-center justify-center rounded-full bg-navy text-on-navy group-disabled:bg-ivory-deep group-disabled:text-ink-faint">
                <ArrowUpIcon size={18} />
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Guide({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-terracotta-soft text-terracotta-ink">
        <CompassIcon size={15} />
      </span>
      <div className="min-w-0 flex-1 pt-1">{children}</div>
    </div>
  )
}

function SummaryCard({ landmark }: { landmark: Landmark }) {
  return (
    <Link to={`/landmarks/${landmark.id}`} className={`flex items-center gap-3 rounded-2xl border border-ivory-line bg-ivory-surface p-3 ${focus}`}>
      <LandmarkImage src={landmark.imageUrl} alt="" className="size-13 shrink-0 rounded-xl" />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-display text-xl leading-[1.625rem] font-bold tracking-[-0.005em] text-ink">{landmark.name}</span>
        <span className={`font-mono whitespace-pre-wrap text-ink-muted ${micro}`}>
          {[formatFee(landmark.admissionFee), landmark.rating.toFixed(1), landmark.district, `${landmark.estimatedVisitMinutes} min`].join('  ·  ')}
        </span>
      </span>
    </Link>
  )
}

function Rate({ value, onRate }: { value?: Feedback; onRate: (value: Feedback) => void }) {
  const option = (feedback: Feedback, label: string) => (
    <button
      type="button"
      aria-pressed={value === feedback}
      onClick={() => onRate(feedback)}
      // The ::before box is the 48 px tap target, so the row keeps Figma's 16 px line height.
      className={`relative flex min-w-12 items-center justify-center gap-1 rounded-full px-1 before:absolute before:inset-x-0 before:-inset-y-4 ${value === feedback ? 'font-bold text-navy' : ''} ${focus}`}
    >
      {value === feedback && <CheckmarkIcon size={14} />}
      {label}
    </button>
  )
  return (
    <div className="flex flex-wrap items-center gap-y-4 text-xs font-medium text-ink-muted">
      <span className="pr-1.5">Does this look right?</span>
      {option('helpful', 'Helpful')}
      <span aria-hidden>·</span>
      {option('needs-improvement', 'Needs improvement')}
    </div>
  )
}

function TextButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={`${children} chat`} className={`min-h-12 min-w-12 rounded-full px-1 ${focus}`}>
      {children}
    </button>
  )
}

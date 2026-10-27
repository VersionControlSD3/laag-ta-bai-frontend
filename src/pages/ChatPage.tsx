import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import Markdown from 'react-markdown'
import { useChat, useLandmark } from '@/api/hooks'
import type { ChatMessage } from '@/api/types'
import { LandmarkImage } from '@/components/LandmarkCard'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { TopNavbar } from '@/components/TopNavbar'
import { AlertCircleOutlineIcon, CameraOutlineIcon, SendIcon } from '@/components/icons/ionicons'
import { FOLLOW_UPS } from '@/features/chat/followUps'
import { env } from '@/lib/env'
import { readJson, removeKey, writeJson } from '@/lib/storage'

type StoredMessage = ChatMessage & { at: string }

const greeting = (name: string): StoredMessage => ({
  role: 'model',
  content: `Maayong adlaw, bai! 👋 I'm your guide at **${name}**. Ask me a follow-up question about its history, architecture, or what to see nearby.`,
  at: new Date().toISOString(),
})

/**
 * Conversational AI guide seeded with the landmark (SRS 3.1.2), for follow-up questions after a
 * scan. Bubbles and composer follow the Figma ChatBubble / ChatComposer specs. Chats are cached
 * per landmark.
 */
export default function ChatPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const landmark = useLandmark(id)
  const chat = useChat()
  const storageKey = `chat:${id}`
  const [messages, setMessages] = useState<StoredMessage[]>(() => readJson(storageKey, []))
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const asked = useRef(false)

  const shown = messages.length || !landmark.data ? messages : [greeting(landmark.data.name)]
  const last = shown.at(-1)

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [shown.length, chat.isPending])

  const persist = (next: StoredMessage[]) => {
    setMessages(next)
    writeJson(storageKey, next.slice(-60))
  }

  const request = (conversation: StoredMessage[]) =>
    chat.mutate(
      // The greeting is local UI only; the API expects the conversation to start with the user.
      { landmarkId: id, messages: conversation.filter((m, i) => !(i === 0 && m.role === 'model')).map(({ role, content }) => ({ role, content })) },
      { onSuccess: (result) => persist([...conversation, { ...result.message, at: new Date().toISOString() }]) },
    )

  const ask = (text: string) => {
    const question = text.trim()
    if (!question || chat.isPending) return
    const next = [...shown, { role: 'user' as const, content: question, at: new Date().toISOString() }]
    persist(next)
    setDraft('')
    request(next)
  }

  // A follow-up chip on the landmark screen opens the chat with its question.
  const pending = (location.state as { ask?: string } | null)?.ask
  useEffect(() => {
    if (!pending || asked.current || !landmark.data) return
    asked.current = true
    ask(pending)
    // Ask once, as soon as the landmark (and so the greeting) is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, landmark.data])

  const send = (event: FormEvent) => {
    event.preventDefault()
    ask(draft)
  }

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

  const unanswered = last?.role === 'user' && !chat.isPending
  const suggestions = FOLLOW_UPS.filter((q) => !shown.some((m) => m.role === 'user' && m.content === q))
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-linear-to-b from-ivory to-ivory-deep text-ink">
      <TopNavbar title="Ask bAI" className="sticky top-0" />

      <div className="flex items-center gap-3 px-6 pt-4">
        <LandmarkImage src={landmark.data.imageUrl} alt="" className="size-10 shrink-0 rounded-full" />
        <p className="min-w-0 flex-1 truncate text-sm text-ink-muted">
          Talking about <span className="font-bold text-ink">{landmark.data.name}</span>
        </p>
      </div>
      <div className="flex gap-1 px-4 pt-1 text-sm font-bold text-terracotta-ink">
        <TextButton onClick={() => navigator.clipboard?.writeText(transcript())}>Copy</TextButton>
        <TextButton onClick={exportChat}>Export</TextButton>
        <TextButton
          onClick={() => {
            removeKey(storageKey)
            setMessages([])
          }}
        >
          Clear
        </TextButton>
      </div>
      {env.mockApi && <p className="px-6 text-xs text-ink-muted">Demo mode: answers come from sample data.</p>}

      <ol className="flex flex-1 flex-col gap-4 px-6 py-4" aria-live="polite" aria-label="Conversation">
        {shown.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {chat.isPending && <Typing />}
        <div ref={endRef} />
      </ol>

      {chat.isError && unanswered && (
        <div role="alert" className="mx-6 mb-3 flex items-center gap-3 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger">
          <AlertCircleOutlineIcon size={20} />
          <p className="flex-1">{chat.error instanceof Error ? chat.error.message : 'bAI couldn’t answer.'}</p>
          <button type="button" onClick={() => request(shown)} className="min-h-12 rounded-full px-3 font-bold underline">
            Try again
          </button>
        </div>
      )}

      {last?.role === 'model' && !chat.isPending && suggestions.length > 0 && (
        <div className="px-6 pb-3">
          <p className="mb-2 text-xs font-bold tracking-[0.1em] text-terracotta-ink uppercase">Follow-up questions</p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((question) => (
              <li key={question}>
                <button
                  type="button"
                  onClick={() => ask(question)}
                  className="min-h-12 rounded-full bg-sage-soft px-4 text-sm font-medium whitespace-nowrap text-sage-deep focus-visible:outline-2 focus-visible:outline-navy"
                >
                  {question}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        onSubmit={send}
        className="sticky bottom-0 flex items-center gap-2 border-t border-ivory-line bg-ivory-surface px-4 pt-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <Link to="/scan" aria-label="Scan another landmark" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sage-soft text-sage-deep">
          <CameraOutlineIcon size={22} />
        </Link>
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <input
          id="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Ask a follow-up question…"
          className="h-12 min-w-0 flex-1 rounded-full border border-line-strong bg-ivory px-4 text-ink placeholder:text-ink-muted focus:border-navy focus:outline-2 focus:outline-navy"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim() || chat.isPending}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-navy text-on-navy disabled:bg-ivory-deep disabled:text-ink-muted"
        >
          <SendIcon size={20} />
        </button>
      </form>
    </div>
  )
}

/** The guide speaks from a surface bubble with the logo as avatar; the traveller answers in navy. */
function Bubble({ message }: { message: StoredMessage }) {
  const user = message.role === 'user'
  return (
    <li className={`flex items-end gap-2 ${user ? 'flex-row-reverse' : ''}`}>
      {!user && <img src="/brand/logo-icon.png" alt="" className="size-8 shrink-0 rounded-full bg-sage-soft object-contain p-1" />}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${user ? 'rounded-br-md bg-navy text-on-navy' : 'rounded-bl-md border border-ivory-line bg-ivory-surface text-ink-body'}`}
      >
        <p className="sr-only">{user ? 'You said:' : 'bAI said:'}</p>
        <div className="markdown text-base leading-6">
          <Markdown>{message.content}</Markdown>
        </div>
        <time className={`mt-1 block text-right text-xs ${user ? 'text-on-navy/75' : 'text-ink-muted'}`} dateTime={message.at}>
          {new Date(message.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
    </li>
  )
}

/** Loading state while bAI writes an answer. The dots stay still with reduced motion. */
function Typing() {
  return (
    <li className="flex items-end gap-2" role="status">
      <img src="/brand/logo-icon.png" alt="" className="size-8 shrink-0 rounded-full bg-sage-soft object-contain p-1" />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-ivory-line bg-ivory-surface px-4 py-4">
        <span className="sr-only">bAI is typing…</span>
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="size-2 rounded-full bg-ink-muted motion-safe:animate-bounce" style={{ animationDelay: `${delay}ms` }} aria-hidden />
        ))}
      </div>
    </li>
  )
}

function TextButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="min-h-12 rounded-full px-2 focus-visible:outline-2 focus-visible:outline-navy">
      {children}
    </button>
  )
}

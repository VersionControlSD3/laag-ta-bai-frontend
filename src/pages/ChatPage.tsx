import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import Markdown from 'react-markdown'
import { Copy, Download, Send, Trash2 } from 'lucide-react'
import { useChat, useLandmark } from '@/api/hooks'
import type { ChatMessage } from '@/api/types'
import { PageHeader } from '@/components/PageHeader'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { readJson, removeKey, writeJson } from '@/lib/storage'

type StoredMessage = ChatMessage & { at: string }

const greeting = (name: string): StoredMessage => ({
  role: 'model',
  content: `Maayong adlaw, bai! 👋 I'm your guide at **${name}**. Ask me about its history, architecture, or what to see nearby.`,
  at: new Date().toISOString(),
})

/** Conversational AI guide seeded with the landmark (SRS 3.1.2). Chats are cached per landmark. */
export default function ChatPage() {
  const { id = '' } = useParams()
  const landmark = useLandmark(id)
  const chat = useChat()
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

  const send = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || chat.isPending) return
    const next = [...shown, { role: 'user' as const, content: text, at: new Date().toISOString() }]
    persist(next)
    setDraft('')
    chat.mutate(
      // The greeting is local UI only; the API expects the conversation to start with the user.
      { landmarkId: id, messages: next.filter((m, i) => !(i === 0 && m.role === 'model')).map(({ role, content }) => ({ role, content })) },
      { onSuccess: (result) => persist([...next, { ...result.message, at: new Date().toISOString() }]) },
    )
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

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        back
        title="Ask bAI"
        subtitle={landmark.data.name}
        action={
          <div className="flex">
            <IconButton label="Copy chat" onClick={() => navigator.clipboard?.writeText(transcript())} icon={<Copy size={18} />} />
            <IconButton label="Export chat" onClick={exportChat} icon={<Download size={18} />} />
            <IconButton
              label="Clear chat"
              onClick={() => {
                removeKey(storageKey)
                setMessages([])
              }}
              icon={<Trash2 size={18} />}
            />
          </div>
        }
      />

      <ol className="flex-1 space-y-4 px-5 pb-4" aria-live="polite">
        {shown.map((m, i) => (
          <li key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <span
              aria-hidden
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${m.role === 'user' ? 'bg-coral text-white' : 'bg-gold text-maroon'}`}
            >
              {m.role === 'user' ? 'You' : 'bAI'}
            </span>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-primary text-on-primary' : 'border border-line bg-surface'}`}>
              <div className="markdown text-sm leading-6">
                <Markdown>{m.content}</Markdown>
              </div>
              <time className="mt-1 block text-[10px] opacity-60" dateTime={m.at}>
                {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
          </li>
        ))}
        {chat.isPending && <li className="text-sm text-muted">bAI is typing…</li>}
        <div ref={endRef} />
      </ol>
      {chat.isError && <ErrorMessage error={chat.error} />}

      <form onSubmit={send} className="sticky bottom-0 flex gap-2 border-t border-line bg-bg px-5 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <label className="sr-only" htmlFor="chat-input">Message</label>
        <input
          id="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Ask about this place…"
          className="h-12 flex-1 rounded-2xl border border-line bg-surface px-4 outline-none"
        />
        <button type="submit" aria-label="Send" disabled={!draft.trim() || chat.isPending} className="touch-target flex items-center justify-center rounded-2xl bg-primary text-on-primary disabled:opacity-50">
          <Send size={20} aria-hidden />
        </button>
      </form>
    </div>
  )
}

function IconButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="touch-target flex items-center justify-center rounded-full">
      {icon}
    </button>
  )
}

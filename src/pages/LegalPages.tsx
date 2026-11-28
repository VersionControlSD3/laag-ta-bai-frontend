import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useT } from '@/i18n'

/**
 * Terms and Privacy routes (PR #17 review: the sign-up checkboxes used to link
 * to 404s). They open in a new tab from the sign-up form so the filled-in
 * fields are not lost.
 *
 * The wording is deliberately short and factual for this educational project —
 * the team should review it before release. The text is in `src/i18n/messages/legal.ts`.
 */

const REPO_URL = 'https://github.com/VersionControlSD3/laag-ta-bai-frontend/issues'

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  const t = useT().legal
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-sm font-bold tracking-[0.2em] text-primary">Laag ta b<span className="text-crimson">AI</span></Link>
        <Link to="/register" className="text-sm underline">{t.backToSignUp}</Link>
      </header>
      <h1 className="text-3xl font-extrabold text-primary">{title}</h1>
      {t.referenceNote && <p className="mt-2 text-xs italic">{t.referenceNote}</p>}
      <div className="mt-6 space-y-5 text-sm leading-relaxed">
        {children}
      </div>
    </main>
  )
}

/** Renders a section body, turning `{repo}` into the project-repository link. */
function Sections({ sections }: { sections: { heading: string; body: string }[] }) {
  const t = useT().legal
  return sections.map(({ heading, body }) => {
    const [before, after] = body.split('{repo}')
    return (
      <section key={heading}>
        <h2 className="text-base font-bold">{heading}</h2>
        <p className="mt-1">
          {before}
          {after !== undefined && (
            <>
              <a className="font-semibold underline" href={REPO_URL} target="_blank" rel="noreferrer">{t.repository}</a>
              {after}
            </>
          )}
        </p>
      </section>
    )
  })
}

export function TermsPage() {
  const t = useT().legal.terms
  return (
    <LegalLayout title={t.title}>
      <Sections sections={t.sections} />
    </LegalLayout>
  )
}

export function PrivacyPage() {
  const t = useT().legal.privacy
  return (
    <LegalLayout title={t.title}>
      <Sections sections={t.sections} />
    </LegalLayout>
  )
}

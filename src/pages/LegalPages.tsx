import type { ReactNode } from 'react'
import { Link } from 'react-router'

/**
 * Terms and Privacy routes (PR #17 review: the sign-up checkboxes used to link
 * to 404s). They open in a new tab from the sign-up form so the filled-in
 * fields are not lost.
 *
 * The wording is deliberately short and factual for this educational project —
 * the team should review it before release.
 */

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-sm font-bold tracking-[0.2em] text-primary">Laag ta b<span className="text-crimson">AI</span></Link>
        <Link to="/register" className="text-sm underline">Back to sign up</Link>
      </header>
      <h1 className="text-3xl font-extrabold text-primary">{title}</h1>
      <div className="mt-6 space-y-5 text-sm leading-relaxed">
        {children}
      </div>
    </main>
  )
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold">{heading}</h2>
      <p className="mt-1">{children}</p>
    </section>
  )
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Use">
      <Section heading="Acceptance">
        By creating an account or using Laag ta bAI you agree to these terms. If you do not agree, do not use the app.
      </Section>
      <Section heading="Your account and eligibility">
        You must be 18 years of age or older to register and create an account. You are responsible for the information you provide at sign-up and for keeping your credentials secure. Tell us if you believe your account has been accessed by someone else.
      </Section>
      <Section heading="Acceptable use">
        Use the app for personal travel and learning. Do not attempt to disrupt the service, misuse the AI guide, or submit content you do not have the right to share.
      </Section>
      <Section heading="AI-generated content">
        Landmark stories and AI answers are generated and may be incomplete or inaccurate. Verify important details (opening hours, fees, safety) with official sources before you travel.
      </Section>
      <Section heading="Educational project">
        Laag ta bAI is a student project provided "as is", without warranties. To the extent permitted by law, the team is not liable for decisions made using the app.
      </Section>
      <Section heading="Questions">
        Open an issue in the <a className="font-semibold underline" href="https://github.com/VersionControlSD3/laag-ta-bai-frontend/issues" target="_blank" rel="noreferrer">project repository</a> and we will respond.
      </Section>
    </LegalLayout>
  )
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <Section heading="What we collect">
        Account details you enter at sign-up (name, email, nationality and optional bio), your progress such as XP, streaks and quest completions, and the landmarks you save for offline reading.
      </Section>
      <Section heading="Age requirement and date of birth">
        You must be 18 or older to register. In accordance with the Data Privacy Act proportionality principle, date of birth is collected solely to verify you meet the 18+ age requirement and is not stored or sent to our servers.
      </Section>
      <Section heading="Location and camera">
        Location is used only while you use the nearby or check-in features to sort landmarks by distance. Photos are used only when you run a scan, to identify the landmark. Neither is collected in the background.
      </Section>
      <Section heading="Where it is stored">
        Accounts are hosted by Supabase; app data is served by our API; the site is hosted on Vercel. Your preferences, bookmarks and offline stories are stored in your browser's local storage and are removed when you clear site data or use "Clear offline cache" in settings.
      </Section>
      <Section heading="AI processing">
        Scanned images and chat messages are sent to our API, which forwards them to its AI provider to answer you. They are not used to identify you.
      </Section>
      <Section heading="Sharing">
        We do not sell your data. We only share what is necessary to run the service with the hosting, authentication and AI providers above.
      </Section>
      <Section heading="Your choices">
        You can edit your profile at any time and delete your account from the Profile screen. For any request about your data, open an issue in the <a className="font-semibold underline" href="https://github.com/VersionControlSD3/laag-ta-bai-frontend/issues" target="_blank" rel="noreferrer">project repository</a>.
      </Section>
    </LegalLayout>
  )
}

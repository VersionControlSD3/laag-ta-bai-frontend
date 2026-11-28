import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { renderRoutes } from '@/test/render'

const { supabaseAuth, callback } = vi.hoisted(() => ({
  callback: { pending: false },
  supabaseAuth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
  },
}))
vi.mock('@/lib/supabase', () => ({ supabase: { auth: supabaseAuth }, get hasRecoveryCallback() { return callback.pending } }))

describe('reset password route', () => {
  const session = {
    user: { id: 'traveler' },
    access_token: `header.${btoa(JSON.stringify({ session_id: 'recovery-session' }))}.signature`,
  } as Session

  it('waits for the recovery event before showing an invalid-link message', async () => {
    callback.pending = true
    supabaseAuth.getSession.mockResolvedValueOnce({ data: { session } })
    renderRoutes(routes, '/reset-password')
    expect(await screen.findByText('Checking your reset link…')).toBeInTheDocument()
    expect(screen.queryByText('This reset link is invalid or expired.')).not.toBeInTheDocument()
    const notify = supabaseAuth.onAuthStateChange.mock.lastCall?.[0] as (event: AuthChangeEvent, session: Session) => void
    await act(async () => notify('PASSWORD_RECOVERY', session))
    expect(await screen.findByLabelText('New password', { exact: true })).toBeInTheDocument()
    callback.pending = false
  })

  it('stops loading if session initialization rejects', async () => {
    supabaseAuth.getSession.mockRejectedValueOnce(new Error('Storage unavailable'))
    renderRoutes(routes, '/reset-password')
    expect(await screen.findByText('This reset link is invalid or expired.')).toBeInTheDocument()
  })

  it('restores recovery after a reload and saves the confirmed password', async () => {
    const user = userEvent.setup()
    supabaseAuth.getSession.mockResolvedValueOnce({ data: { session } })
    const original = renderRoutes(routes, '/reset-password')

    expect(await screen.findByText('This reset link is invalid or expired.')).toBeInTheDocument()
    expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument()

    const notify = supabaseAuth.onAuthStateChange.mock.lastCall?.[0] as (event: AuthChangeEvent, session: Session) => void
    act(() => notify('PASSWORD_RECOVERY', session))
    expect(screen.getByLabelText('New password', { exact: true })).toBeInTheDocument()

    original.unmount()
    const refreshed = { ...session, access_token: session.access_token.replace('.signature', '.refreshed') }
    supabaseAuth.getSession.mockResolvedValueOnce({ data: { session: refreshed } })
    renderRoutes(routes, '/reset-password')

    const password = await screen.findByLabelText('New password', { exact: true })
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show new password' }))
    expect(password).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide new password' }))
    expect(password).toHaveAttribute('type', 'password')
    await user.type(password, 'NewPassword123')
    const confirmation = screen.getByLabelText('Confirm new password')
    expect(confirmation).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show confirm new password' }))
    expect(confirmation).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('New password', { exact: true })).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Hide confirm new password' }))
    expect(confirmation).toHaveAttribute('type', 'password')
    await user.type(confirmation, 'DifferentPassword123')
    await user.click(screen.getByRole('button', { name: 'Update Password' }))
    expect(screen.getByRole('alert')).toHaveTextContent('The passwords must match.')
    expect(confirmation).toHaveAttribute('aria-invalid', 'true')
    expect(confirmation).toHaveAttribute('aria-describedby', 'reset-password-error')
    expect(confirmation).toHaveFocus()
    expect(password).toHaveAttribute('aria-invalid', 'false')
    expect(supabaseAuth.updateUser).not.toHaveBeenCalled()

    await user.clear(confirmation)
    await user.type(confirmation, 'NewPassword123')
    await user.click(screen.getByRole('button', { name: 'Update Password' }))
    expect(supabaseAuth.updateUser).toHaveBeenCalledWith({ password: 'NewPassword123' })
    expect(await screen.findByRole('status')).toHaveTextContent('Your password has been updated.')
  })

  it('enforces sign-up password rules (length, uppercase, and digit), announces rule state, and links errors to the field', async () => {
    const user = userEvent.setup()
    writeJson('password-recovery-session', 'recovery-session')
    supabaseAuth.getSession.mockResolvedValueOnce({ data: { session } })
    renderRoutes(routes, '/reset-password')

    const passwordInput = await screen.findByLabelText('New password', { exact: true })
    const confirmationInput = screen.getByLabelText('Confirm new password')
    const submitBtn = screen.getByRole('button', { name: 'Update Password' })
    const rulesLiveRegion = document.getElementById('reset-password-rules')
    expect(rulesLiveRegion).toHaveTextContent(
      'At least 8 characters: required. One uppercase letter: required. One number: required.',
    )

    // Repro #14: lowercase-only 8+ char password must be blocked.
    await user.type(passwordInput, 'abcdefgh')
    expect(rulesLiveRegion).toHaveTextContent(
      'At least 8 characters: met. One uppercase letter: required. One number: required.',
    )
    await user.type(confirmationInput, 'abcdefgh')
    await user.click(submitBtn)
    expect(screen.getByRole('alert')).toHaveTextContent('Include at least one uppercase letter and one digit.')
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
    expect(passwordInput).toHaveAttribute('aria-describedby', 'reset-password-error reset-password-rules')
    expect(passwordInput).toHaveFocus()
    expect(confirmationInput).toHaveAttribute('aria-invalid', 'false')
    expect(supabaseAuth.updateUser).not.toHaveBeenCalled()

    // Missing uppercase letter only.
    await user.clear(passwordInput)
    await user.clear(confirmationInput)
    await user.type(passwordInput, 'abcdefgh1')
    await user.type(confirmationInput, 'abcdefgh1')
    await user.click(submitBtn)
    expect(screen.getByRole('alert')).toHaveTextContent('Include at least one uppercase letter.')
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
    expect(passwordInput).toHaveFocus()
    expect(supabaseAuth.updateUser).not.toHaveBeenCalled()

    // Missing digit only.
    await user.clear(passwordInput)
    await user.clear(confirmationInput)
    await user.type(passwordInput, 'Abcdefgh')
    await user.type(confirmationInput, 'Abcdefgh')
    await user.click(submitBtn)
    expect(screen.getByRole('alert')).toHaveTextContent('Include at least one digit.')
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
    expect(passwordInput).toHaveFocus()
    expect(supabaseAuth.updateUser).not.toHaveBeenCalled()

    // Too short.
    await user.clear(passwordInput)
    await user.clear(confirmationInput)
    await user.type(passwordInput, 'Abc1')
    await user.type(confirmationInput, 'Abc1')
    await user.click(submitBtn)
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 8 characters.')
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
    expect(passwordInput).toHaveFocus()
    expect(supabaseAuth.updateUser).not.toHaveBeenCalled()
  })

  it('rejects a different session for the same account', async () => {
    writeJson('password-recovery-session', 'recovery-session')
    const other = {
      ...session,
      access_token: `header.${btoa(JSON.stringify({ session_id: 'ordinary-session' }))}.signature`,
    }
    supabaseAuth.getSession.mockResolvedValueOnce({ data: { session: other } })
    renderRoutes(routes, '/reset-password')

    expect(await screen.findByText('This reset link is invalid or expired.')).toBeInTheDocument()
    expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument()
  })
})

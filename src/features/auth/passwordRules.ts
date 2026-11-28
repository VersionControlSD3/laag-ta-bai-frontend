export type PasswordRule = readonly [label: string, valid: boolean]

/** Shared password strength rules used by both sign-up and password reset. */
export function getPasswordRules(password: string): readonly PasswordRule[] {
  return [
    ['At least 8 characters', password.length >= 8],
    ['One uppercase letter', /[A-Z]/.test(password)],
    ['One number', /\d/.test(password)],
  ]
}

export function passwordValidationError(password: string): string | null {
  const [[, hasLength], [, hasUpper], [, hasDigit]] = getPasswordRules(password)
  if (!hasLength) return 'Use at least 8 characters.'
  if (!hasUpper && !hasDigit) return 'Include at least one uppercase letter and one digit.'
  if (!hasUpper) return 'Include at least one uppercase letter.'
  if (!hasDigit) return 'Include at least one digit.'
  return null
}

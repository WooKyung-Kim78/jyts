const DEFAULT_PATH = '/'

// Only same-origin absolute paths are allowed to prevent open redirects.
export function getSafeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return DEFAULT_PATH
  }

  if ([...value].some((char) => char.charCodeAt(0) < 0x20)) return DEFAULT_PATH
  if (value === '/login' || value.startsWith('/login?') || value.startsWith('/login/')) {
    return DEFAULT_PATH
  }

  return value
}

export function buildLoginPath(redirectPath: string): string {
  const safePath = getSafeRedirectPath(redirectPath)
  return safePath === DEFAULT_PATH ? '/login' : `/login?redirect=${encodeURIComponent(safePath)}`
}

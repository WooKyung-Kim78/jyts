import { describe, expect, it } from 'vitest'

import { buildLoginPath, getSafeRedirectPath } from './redirect'

describe('getSafeRedirectPath', () => {
  it.each([
    ['/equipment', '/equipment'],
    ['/equipment?page=2#top', '/equipment?page=2#top'],
  ])('keeps internal path %s', (input, expected) => {
    expect(getSafeRedirectPath(input)).toBe(expected)
  })

  it.each([
    null,
    undefined,
    '',
    'equipment',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '/equipment\nSet-Cookie: x',
    '/login',
    '/login?redirect=/admin',
  ])('falls back to / for %s', (input) => {
    expect(getSafeRedirectPath(input)).toBe('/')
  })
})

describe('buildLoginPath', () => {
  it('omits the redirect parameter for the default path', () => {
    expect(buildLoginPath('/')).toBe('/login')
  })

  it('encodes the redirect path', () => {
    expect(buildLoginPath('/equipment?page=2')).toBe('/login?redirect=%2Fequipment%3Fpage%3D2')
  })
})

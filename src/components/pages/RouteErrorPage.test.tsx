import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderRoute } from '@/test/render'
import { RouteErrorPage } from './RouteErrorPage'

function ThrowingPage(): never {
  throw new Error('internal detail: relation "secret_table" does not exist')
}

describe('RouteErrorPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a generic message without exposing internal error details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderRoute('/', {
      routeObjects: [{ path: '/', element: <ThrowingPage />, errorElement: <RouteErrorPage /> }],
    })

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('화면을 표시하지 못했습니다')).toBeInTheDocument()
    expect(screen.queryByText(/secret_table/)).not.toBeInTheDocument()
  })
})

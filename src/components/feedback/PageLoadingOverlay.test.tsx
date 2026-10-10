import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { activeAuth } from '@/test/auth'
import { renderRoute } from '@/test/render'

const api = vi.hoisted(() => ({ getInspections: vi.fn() }))

vi.mock('@/features/inspections/api/inspections', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/inspections/api/inspections')>(),
  getInspections: api.getInspections,
}))

describe('page loading overlay', () => {
  it('covers the screen while page data loads and disappears when it is loaded', async () => {
    let resolve: (value: unknown) => void = () => {}
    api.getInspections.mockReturnValue(new Promise((done) => { resolve = done }))
    renderRoute('/inspections', { auth: activeAuth('USER') })

    expect(await screen.findByTestId('page-loading-overlay')).toHaveClass('fixed', 'inset-0', 'backdrop-blur-sm')

    resolve({ items: [], meta: { current_page: 1, last_page: 1, per_page: 100, total: 0 } })

    expect(await screen.findByText('등록된 정기점검이 없습니다.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('page-loading-overlay')).not.toBeInTheDocument())
  })
})

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { createAuthValue } from '@/test/auth'
import { renderRoute } from '@/test/render'

const menuLabels = ['대시보드', '고객사', '장비', '장비 마스터', '정기점검 입력', '정기점검', '점검일지 마스터', '직원 관리', 'A/S', '관리']

describe('application routes', () => {
  it('renders the dashboard inside the layout with the main navigation', async () => {
    renderRoute('/')

    expect(await screen.findByRole('heading', { level: 1, name: '대시보드' })).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: '주 메뉴' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(menuLabels)
    expect(within(nav).getByRole('link', { name: '대시보드' })).toHaveAttribute('aria-current', 'page')
  })

  it.each([
    ['/service-requests', 'A/S'],
    ['/admin', '관리'],
  ])('renders a coming-soon placeholder for %s', async (path, title) => {
    renderRoute(path)

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByText('준비 중')).toBeInTheDocument()
  })

  it('opens the equipment registration and master pages', async () => {
    renderRoute('/equipment')
    expect(await screen.findByRole('heading', { level: 1, name: '장비' })).toBeInTheDocument()
    expect(screen.queryByLabelText('장비명')).not.toBeInTheDocument()

    renderRoute('/equipment/new')
    expect(await screen.findByRole('heading', { level: 1, name: '장비 등록' })).toBeInTheDocument()

    renderRoute('/equipment/master')
    expect(await screen.findByRole('heading', { level: 1, name: '장비 마스터' })).toBeInTheDocument()

    renderRoute('/inspections/master')
    expect(await screen.findByRole('heading', { level: 1, name: '점검일지 마스터' })).toBeInTheDocument()

    renderRoute('/employees')
    expect(await screen.findByRole('heading', { level: 1, name: '직원 관리' }, { timeout: 10000 })).toBeInTheDocument()
  }, 30000)

  it('opens the customer page and does not expose a separate site route', async () => {
    renderRoute('/organizations')

    expect(await screen.findByRole('heading', { level: 1, name: '고객사' })).toBeInTheDocument()
    expect(screen.queryByText('준비 중')).not.toBeInTheDocument()

    renderRoute('/sites')
    expect(await screen.findByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' })).toBeInTheDocument()
  })

  it('renders the not found page for unknown paths', async () => {
    renderRoute('/does-not-exist')

    expect(
      await screen.findByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '대시보드로 이동' })).toHaveAttribute('href', '/')
  })

  it('renders the login page without the application navigation when signed out', async () => {
    renderRoute('/login', { auth: createAuthValue({ status: 'signed-out' }) })

    expect(await screen.findByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '주 메뉴' })).not.toBeInTheDocument()
  })

  it('opens the mobile menu and closes it after navigating', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await screen.findByRole('heading', { level: 1, name: '대시보드' })

    await user.click(screen.getByRole('button', { name: '메뉴 열기' }))

    const dialog = await screen.findByRole('dialog')
    const mobileNav = within(dialog).getByRole('navigation', { name: '모바일 메뉴' })
    await user.click(within(mobileNav).getByRole('link', { name: '장비' }))

    expect(await screen.findByRole('heading', { level: 1, name: '장비' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

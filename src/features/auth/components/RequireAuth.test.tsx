import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { activeAuth, createAuthValue } from '@/test/auth'
import { renderRoute } from '@/test/render'

describe('authentication guard', () => {
  it('redirects signed-out users to the login page and keeps the target path', async () => {
    const { router } = renderRoute('/equipment?page=2', {
      auth: createAuthValue({ status: 'signed-out' }),
    })

    expect(await screen.findByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe(`?redirect=${encodeURIComponent('/equipment?page=2')}`)
    expect(screen.queryByRole('navigation', { name: '주 메뉴' })).not.toBeInTheDocument()
  })

  it('redirects signed-out users to login without disabling sign in', async () => {
    renderRoute('/', { auth: createAuthValue({ status: 'signed-out' }) })

    expect(await screen.findByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인' })).toBeEnabled()
  })

  it('blocks inactive users from business screens', async () => {
    const auth = createAuthValue({ status: 'inactive', email: 'inactive@example.test' })
    const user = userEvent.setup()
    renderRoute('/equipment', { auth })

    expect(
      await screen.findByRole('heading', { level: 1, name: '계정이 비활성 상태입니다' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '주 메뉴' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '장비' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '로그아웃' }))
    expect(auth.signOut).toHaveBeenCalledOnce()
  })

  it('shows a retryable error when the profile cannot be loaded', async () => {
    const auth = createAuthValue({ status: 'error', email: 'user@example.test' })
    const user = userEvent.setup()
    renderRoute('/', { auth })

    expect(await screen.findByText('사용자 정보를 불러오지 못했습니다')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '주 메뉴' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(auth.retry).toHaveBeenCalledOnce()
  })

  it('shows a loading state while the session is being resolved', async () => {
    renderRoute('/', { auth: createAuthValue({ status: 'loading' }) })

    expect(await screen.findByText('로그인 정보를 확인하는 중입니다…')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '주 메뉴' })).not.toBeInTheDocument()
  })
})

describe('role based access', () => {
  it('hides the admin menu and blocks admin pages for USER', async () => {
    renderRoute('/employees', { auth: activeAuth('USER') })

    expect(await screen.findByRole('heading', { level: 1, name: '접근 권한이 없습니다' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: '주 메뉴' })
    expect(within(nav).queryByRole('button', { name: '관리' })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: '직원 관리' })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: '장비' })).toBeInTheDocument()
  })

  it('allows ADMIN to open the admin menu', async () => {
    renderRoute('/employees', { auth: activeAuth('ADMIN') })

    expect(await screen.findByRole('heading', { level: 1, name: '직원 관리' }, { timeout: 10000 })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: '주 메뉴' })
    expect(within(nav).getByRole('button', { name: '관리' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(nav).getByRole('link', { name: '직원 관리' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows the signed-in user and role, and signs out from the header', async () => {
    const auth = activeAuth('USER')
    const user = userEvent.setup()
    renderRoute('/', { auth })

    await screen.findByRole('heading', { level: 1, name: '대시보드' })
    const menuButton = screen.getByRole('button', { name: '테스트 사용자' })
    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument()

    await user.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('권한: 사용자')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '비밀번호 변경' })).toHaveAttribute('href', '/account/password')

    await user.click(screen.getByRole('button', { name: '로그아웃' }))
    expect(auth.signOut).toHaveBeenCalledOnce()
  })
})

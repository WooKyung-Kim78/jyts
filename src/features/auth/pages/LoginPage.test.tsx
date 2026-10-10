import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { activeAuth, createAuthValue } from '@/test/auth'
import { renderRoute } from '@/test/render'

async function fillAndSubmit(username: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('아이디'), username)
  await user.type(screen.getByLabelText('비밀번호'), password)
  await user.click(screen.getByRole('button', { name: '로그인' }))
}

describe('LoginPage', () => {
  it('validates a five-letter username and password without calling sign in', async () => {
    const auth = createAuthValue({ status: 'signed-out' })
    const user = userEvent.setup()
    renderRoute('/login', { auth })

    await user.click(await screen.findByRole('button', { name: '로그인' }))
    expect(await screen.findByText('아이디는 영문 5자로 입력하세요.')).toBeInTheDocument()
    expect(screen.getByText('비밀번호를 입력하세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('아이디')).toHaveAttribute('aria-invalid', 'true')

    await user.type(screen.getByLabelText('아이디'), 'abcd')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText('아이디는 영문 5자로 입력하세요.')).toBeInTheDocument()

    expect(auth.signIn).not.toHaveBeenCalled()
  })

  it('lowercases username before submitting credentials', async () => {
    const auth = createAuthValue({ status: 'signed-out' })
    renderRoute('/login', { auth })

    await fillAndSubmit('ABCDE', 'test-password-1')

    expect(auth.signIn).toHaveBeenCalledWith('abcde', 'test-password-1')
  })

  it('shows a generic message for invalid credentials', async () => {
    const auth = createAuthValue({ status: 'signed-out' })
    auth.signIn = vi.fn(async () => ({ ok: false as const, error: 'invalid-credentials' as const }))
    renderRoute('/login', { auth })

    await fillAndSubmit('abcde', 'wrong-password')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '아이디 또는 비밀번호가 올바르지 않습니다.',
    )
  })

  it('shows a generic message for unexpected errors', async () => {
    const auth = createAuthValue({ status: 'signed-out' })
    auth.signIn = vi.fn(async () => ({ ok: false as const, error: 'unknown' as const }))
    renderRoute('/login', { auth })

    await fillAndSubmit('abcde', 'test-password-1')

    expect(await screen.findByRole('alert')).toHaveTextContent('로그인 중 문제가 발생했습니다.')
  })

  it('sends signed-in users to the requested page', async () => {
    const { router } = renderRoute(`/login?redirect=${encodeURIComponent('/equipment')}`, {
      auth: activeAuth(),
    })

    expect(await screen.findByRole('heading', { level: 1, name: '장비' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/equipment')
  })

  it('ignores external redirect targets', async () => {
    const { router } = renderRoute(`/login?redirect=${encodeURIComponent('//evil.example')}`, {
      auth: activeAuth(),
    })

    expect(await screen.findByRole('heading', { level: 1, name: '대시보드' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })
})

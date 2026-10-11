import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activeAuth } from '@/test/auth'
import { renderRoute } from '@/test/render'

const api = vi.hoisted(() => ({ changePasswordRequest: vi.fn() }))

vi.mock('@/features/auth/api/session', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/auth/api/session')>(),
  changePasswordRequest: api.changePasswordRequest,
}))

describe('change password page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.changePasswordRequest.mockResolvedValue(undefined)
  })

  it('validates and changes the signed-in user password', async () => {
    const user = userEvent.setup()
    renderRoute('/account/password', { auth: activeAuth('USER') })

    await user.type(await screen.findByLabelText('현재 비밀번호'), 'current-pass')
    await user.type(screen.getByLabelText('새 비밀번호 (8자 이상)'), 'short')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'short')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))
    expect(await screen.findByText('새 비밀번호는 8자 이상 입력하세요.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('새 비밀번호 (8자 이상)'))
    await user.type(screen.getByLabelText('새 비밀번호 (8자 이상)'), 'new-pass1')
    await user.clear(screen.getByLabelText('새 비밀번호 확인'))
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'new-pass2')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))
    expect(await screen.findByText('새 비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
    expect(api.changePasswordRequest).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText('새 비밀번호 확인'))
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'new-pass1')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => expect(api.changePasswordRequest).toHaveBeenCalled())
    expect(api.changePasswordRequest.mock.calls[0]?.[0]).toEqual({
      current_password: 'current-pass',
      password: 'new-pass1',
      password_confirmation: 'new-pass1',
    })
    expect(await screen.findByText(/비밀번호를 변경했습니다/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '테스트 사용자' }))
    expect(screen.getByRole('link', { name: '비밀번호 변경' })).toHaveAttribute('href', '/account/password')
  })
})

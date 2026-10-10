import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activeAuth } from '@/test/auth'
import { renderRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  createEmployee: vi.fn(),
  getEmployees: vi.fn(),
  restoreEmployee: vi.fn(),
  terminateEmployee: vi.fn(),
  updateEmployee: vi.fn(),
}))

vi.mock('@/features/employees/api/employees', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/employees/api/employees')>(),
  ...api,
}))

const admin = { id: '1', username: 'admin', email: 'admin@example.test', name: '관리자', role: 'ADMIN' as const, active: true }
const employee = { id: '2', username: 'abcde', email: 'user@example.test', name: '직원', role: 'USER' as const, active: true }
const inactiveEmployee = { ...employee, active: false }

describe('employee management page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    api.getEmployees.mockResolvedValue([admin])
    api.createEmployee.mockResolvedValue(employee)
    api.updateEmployee.mockResolvedValue(employee)
    api.terminateEmployee.mockResolvedValue(inactiveEmployee)
    api.restoreEmployee.mockResolvedValue(employee)
  })

  it('creates an employee with a lowercase username and optional email', async () => {
    const user = userEvent.setup()
    renderRoute('/employees', { auth: activeAuth('ADMIN') })

    await screen.findByRole('heading', { name: '직원 관리' })
    await user.type(screen.getByLabelText('아이디 (영문 5자)'), 'ABCDE')
    await user.type(screen.getByLabelText('이름'), '직원')
    await user.type(screen.getByLabelText('임시 비밀번호'), 'temporary-password-123')
    await user.click(screen.getByRole('button', { name: '직원 등록' }))

    expect(api.createEmployee).toHaveBeenCalledWith({
      username: 'abcde',
      email: null,
      name: '직원',
      role: 'USER',
      password: 'temporary-password-123',
    })
  })

  it('allows editing, termination, and restoration from the employee list', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    api.getEmployees
      .mockResolvedValueOnce([admin, employee])
      .mockResolvedValueOnce([admin, employee])
      .mockResolvedValueOnce([admin, inactiveEmployee])
    renderRoute('/employees', { auth: activeAuth('ADMIN') })

    await user.click(await screen.findByRole('button', { name: '직원 수정' }))
    await user.clear(screen.getByLabelText('이름'))
    await user.type(screen.getByLabelText('이름'), '수정 직원')
    await user.click(screen.getByRole('button', { name: '변경 저장' }))
    expect(api.updateEmployee).toHaveBeenCalledWith(employee.id, {
      username: employee.username,
      email: employee.email,
      name: '수정 직원',
      role: 'USER',
    })

    await user.click(await screen.findByRole('button', { name: '직원 퇴사 처리' }))
    expect(api.terminateEmployee).toHaveBeenCalledWith(employee.id)
    await user.click(await screen.findByRole('button', { name: '직원 복원' }))
    expect(api.restoreEmployee).toHaveBeenCalledWith(employee.id)
  })
})

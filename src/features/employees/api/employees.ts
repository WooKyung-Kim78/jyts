import { z } from 'zod'

import { apiRequest } from '@/lib/api/client'
import { APP_ROLES } from '@/features/auth/types'

export const employeeSchema = z.object({
  id: z.string().min(1),
  username: z.string().regex(/^[a-z]{5}$/),
  email: z.email().nullable(),
  name: z.string(),
  role: z.enum(APP_ROLES),
  active: z.boolean(),
})

export const activeEmployeeSchema = employeeSchema.pick({ id: true, name: true })

export const employeeInputSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z]{5}$/),
  email: z.union([z.email().trim().max(254), z.literal('')]).transform((email) => email || null),
  name: z.string().trim().min(1).max(255),
  role: z.enum(APP_ROLES),
})

export type Employee = z.infer<typeof employeeSchema>
export type ActiveEmployee = z.infer<typeof activeEmployeeSchema>
export type EmployeeInput = z.infer<typeof employeeInputSchema>

export async function getEmployees(): Promise<Employee[]> {
  return z.array(employeeSchema).parse(await apiRequest<unknown>('/api/employees'))
}

export async function getActiveEmployees(): Promise<ActiveEmployee[]> {
  return z.array(activeEmployeeSchema).parse(await apiRequest<unknown>('/api/employees/active'))
}

export async function createEmployee(input: EmployeeInput & { password: string }): Promise<Employee> {
  return employeeSchema.parse(await apiRequest<unknown>('/api/employees', {
    method: 'POST',
    body: JSON.stringify(input),
  }))
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<Employee> {
  return employeeSchema.parse(await apiRequest<unknown>(`/api/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }))
}

export async function terminateEmployee(id: string): Promise<Employee> {
  return employeeSchema.parse(await apiRequest<unknown>(`/api/employees/${id}/terminate`, { method: 'POST' }))
}

export async function restoreEmployee(id: string): Promise<Employee> {
  return employeeSchema.parse(await apiRequest<unknown>(`/api/employees/${id}/restore`, { method: 'POST' }))
}

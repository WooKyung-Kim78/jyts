import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Check, Pencil, Plus, UserRoundX, UserRoundCheck } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { APP_ROLES, ROLE_LABELS } from '@/features/auth/types'
import {
  createEmployee,
  getEmployees,
  restoreEmployee,
  terminateEmployee,
  updateEmployee,
  type Employee,
} from '../api/employees'

const employeesQueryKey = ['employees'] as const
const formSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z]{5}$/, '아이디는 영문 5자로 입력하세요.'),
  email: z.string().trim().max(254).refine((email) => email === '' || z.email().safeParse(email).success, '올바른 이메일을 입력하세요.'),
  name: z.string().trim().min(1, '이름을 입력하세요.').max(255),
  role: z.enum(APP_ROLES),
  password: z.string(),
})
type FormValues = z.infer<typeof formSchema>

const emptyValues: FormValues = { username: '', email: '', name: '', role: 'USER', password: '' }

export function EmployeesPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const employees = useQuery({ queryKey: employeesQueryKey, queryFn: getEmployees })
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues,
  })

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => editingEmployee
      ? updateEmployee(editingEmployee.id, { username: values.username, email: values.email || null, name: values.name, role: values.role })
      : createEmployee({ username: values.username, email: values.email || null, name: values.name, role: values.role, password: values.password }),
    onSuccess: async () => {
      setNotice(editingEmployee ? '직원 정보를 수정했습니다.' : '직원을 등록했습니다.')
      setEditingEmployee(null)
      reset(emptyValues)
      await queryClient.invalidateQueries({ queryKey: employeesQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['employees', 'active'] })
    },
    onError: () => setNotice('직원 정보를 저장하지 못했습니다. 이메일 중복이나 입력값을 확인해 주세요.'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ employee, restore }: { employee: Employee; restore: boolean }) => restore
      ? restoreEmployee(employee.id)
      : terminateEmployee(employee.id),
    onSuccess: async (employee) => {
      setNotice(employee.active ? '직원을 복원했습니다.' : '퇴사 처리했습니다.')
      await queryClient.invalidateQueries({ queryKey: employeesQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['employees', 'active'] })
    },
    onError: () => setNotice('상태를 변경하지 못했습니다. 본인 계정 또는 마지막 관리자 계정은 퇴사 처리할 수 없습니다.'),
  })

  if (auth.status !== 'active' || auth.profile.role !== 'ADMIN') {
    return <p role="alert">접근 권한이 없습니다.</p>
  }

  function startEdit(employee: Employee) {
    setEditingEmployee(employee)
    setNotice(null)
    reset({ username: employee.username, email: employee.email ?? '', name: employee.name, role: employee.role, password: '' })
  }

  function submit(values: FormValues) {
    if (!editingEmployee && values.password.length < 8) {
      setNotice('임시 비밀번호는 8자 이상 입력하세요.')
      return
    }
    setNotice(null)
    saveMutation.mutate(values)
  }

  function changeStatus(employee: Employee) {
    const restore = !employee.active
    const prompt = restore
      ? `'${employee.name}' 직원을 복원할까요?`
      : `'${employee.name}' 직원을 퇴사 처리할까요? 기존 장비 담당자 연결은 유지됩니다.`
    if (window.confirm(prompt)) statusMutation.mutate({ employee, restore })
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold">직원 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">직원 계정, 역할 및 재직 상태를 관리합니다.</p>
      </header>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-4 text-lg font-semibold">{editingEmployee ? '직원 정보 수정' : '직원 등록'}</h2>
          <form noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => void handleSubmit(submit)(event)}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="employee-username">아이디 (영문 5자)</Label>
              <Input id="employee-username" maxLength={5} autoComplete="username" readOnly={editingEmployee?.username === 'admin'} {...register('username')} />
              {editingEmployee?.username === 'admin' && <p className="text-xs text-muted-foreground">기존 관리자 아이디는 변경할 수 없습니다.</p>}
              {errors.username && <p className="text-sm text-destructive">아이디는 영문 5자로 입력하세요.</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="employee-email">이메일 (선택)</Label>
              <Input id="employee-email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">올바른 이메일을 입력하세요.</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="employee-name">이름</Label>
              <Input id="employee-name" autoComplete="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">이름을 입력하세요.</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="employee-role">역할</Label>
              <select id="employee-role" className="h-11 rounded-md border border-input bg-background px-3 text-sm md:h-9" {...register('role')}>
                {APP_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
              </select>
            </div>
            {!editingEmployee && <div className="flex flex-col gap-2">
              <Label htmlFor="employee-password">임시 비밀번호</Label>
              <Input id="employee-password" type="password" autoComplete="new-password" {...register('password')} />
              <p className="text-xs text-muted-foreground">8자 이상 입력 후 직원에게 별도 전달하세요. 직원은 로그인 후 비밀번호를 변경할 수 있습니다.</p>
            </div>}
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={saveMutation.isPending}>
                {editingEmployee ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
                {saveMutation.isPending ? '저장 중…' : editingEmployee ? '변경 저장' : '직원 등록'}
              </Button>
              {editingEmployee && <Button type="button" variant="outline" onClick={() => {
                setEditingEmployee(null)
                reset(emptyValues)
              }}>취소</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      {employees.isPending && <p role="status">직원 목록을 불러오는 중입니다.</p>}
      {employees.isError && <p role="alert" className="text-sm text-destructive">직원 목록을 불러오지 못했습니다.</p>}
      {employees.data?.length === 0 && <p className="text-sm text-muted-foreground">등록된 직원이 없습니다.</p>}
      {employees.data && employees.data.length > 0 && (
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">이름</th><th className="px-4 py-3 font-medium">아이디</th><th className="px-4 py-3 font-medium">이메일</th><th className="px-4 py-3 font-medium">역할</th><th className="px-4 py-3 font-medium">상태</th><th className="px-4 py-3 text-right font-medium">관리</th></tr>
            </thead>
            <tbody className="divide-y">
              {employees.data.map((employee) => <tr key={employee.id}>
                <td className="px-4 py-3 font-medium">{employee.name}</td>
                <td className="px-4 py-3">{employee.username}</td>
                <td className="px-4 py-3">{employee.email || '-'}</td>
                <td className="px-4 py-3">{ROLE_LABELS[employee.role]}</td>
                <td className="px-4 py-3">{employee.active ? '재직' : '퇴사'}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Button type="button" variant="ghost" size="icon" title="직원 정보 수정" aria-label={`${employee.name} 수정`} onClick={() => startEdit(employee)}>
                      <Pencil aria-hidden="true" />
                    </Button>
                    {employee.id !== auth.profile.id && (employee.active ? (
                      <Button type="button" variant="ghost" size="icon" title="퇴사 처리" aria-label={`${employee.name} 퇴사 처리`} disabled={statusMutation.isPending} onClick={() => changeStatus(employee)}>
                        <UserRoundX aria-hidden="true" />
                      </Button>
                    ) : (
                      <Button type="button" variant="ghost" size="icon" title="복원" aria-label={`${employee.name} 복원`} disabled={statusMutation.isPending} onClick={() => changeStatus(employee)}>
                        <UserRoundCheck aria-hidden="true" />
                      </Button>
                    ))}
                  </div>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

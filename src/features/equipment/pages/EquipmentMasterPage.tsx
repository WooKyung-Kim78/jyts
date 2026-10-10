import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  deleteEquipmentMasterField,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_LABELS,
  getEquipmentMasterFields,
  saveEquipmentMasterField,
  type EquipmentMasterField,
  type EquipmentMasterFieldInput,
} from '../api/equipment'

const queryKey = ['equipment-master-fields'] as const
const masterFormSchema = z.object({
  label: z.string().trim().min(1).max(120),
  required: z.boolean(),
  sort_order: z.number().int().min(0).max(65535),
})
type MasterFormValues = z.infer<typeof masterFormSchema>

export function EquipmentMasterPage() {
  const auth = useAuth()
  const [category, setCategory] = useState<(typeof EQUIPMENT_CATEGORIES)[number]>('PRECISION_AIR_CONDITIONER')
  const [editing, setEditing] = useState<EquipmentMasterField | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const fields = useQuery({ queryKey, queryFn: () => getEquipmentMasterFields() })
  const saveMutation = useMutation({
    mutationFn: ({ values, id }: { values: EquipmentMasterFieldInput; id?: string }) => saveEquipmentMasterField(values, id),
    onSuccess: async () => {
      setEditing(null)
      setNotice('마스터 항목을 저장했습니다.')
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: () => setNotice('마스터 항목을 저장하지 못했습니다. 입력값을 확인해 주세요.'),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteEquipmentMasterField,
    onSuccess: async () => {
      setNotice('마스터 항목을 삭제했습니다.')
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: () => setNotice('마스터 항목을 삭제하지 못했습니다.'),
  })

  if (auth.status !== 'active' || auth.profile.role !== 'ADMIN') {
    return <p role="alert">접근 권한이 없습니다.</p>
  }

  const visibleFields = fields.data?.filter((field) => field.category === category) ?? []

  return (
    <section className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold">장비 마스터</h1>
        <p className="mt-1 text-sm text-muted-foreground">카테고리별 장비 입력 항목을 정의합니다.</p>
      </header>

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="master-category">카테고리</Label>
        <select id="master-category" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={category} onChange={(event) => {
          setCategory(event.currentTarget.value as (typeof EQUIPMENT_CATEGORIES)[number])
          setEditing(null)
        }}>
          {EQUIPMENT_CATEGORIES.map((value) => <option key={value} value={value}>{EQUIPMENT_CATEGORY_LABELS[value]}</option>)}
        </select>
      </div>

      <MasterFieldForm
        key={`${category}:${editing?.id ?? 'new'}`}
        field={editing}
        busy={saveMutation.isPending}
        onCancel={() => setEditing(null)}
        onSubmit={(values) => saveMutation.mutate({ values: {
          ...values,
          category,
          field_type: 'text',
          options: [],
        }, id: editing?.id })}
      />

      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      {fields.isPending && <p role="status">마스터 항목을 불러오는 중입니다.</p>}
      {fields.isError && <p role="alert" className="text-sm text-destructive">마스터 항목을 불러오지 못했습니다.</p>}
      {visibleFields.length === 0 && !fields.isPending && (
        <Card><CardContent className="py-6 text-sm text-muted-foreground">등록된 항목이 없습니다.</CardContent></Card>
      )}
      {visibleFields.length > 0 && (
        <ul className="divide-y rounded-md border bg-background">
          {visibleFields.map((field) => (
            <li key={field.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{field.label}{field.required && <span className="ml-1 text-destructive">필수</span>}</p>
                <p className="text-sm text-muted-foreground">짧은 문장 · {field.sort_order + 1}번째</p>
              </div>
              <Button type="button" variant="ghost" size="icon" title="항목 수정" aria-label={`${field.label} 수정`} onClick={() => setEditing(field)}>
                <Pencil aria-hidden="true" />
              </Button>
              <Button type="button" variant="ghost" size="icon" title="항목 삭제" aria-label={`${field.label} 삭제`} onClick={() => {
                if (window.confirm(`'${field.label}' 항목을 마스터에서 삭제할까요? 기존 장비의 저장된 값은 유지됩니다.`)) {
                  deleteMutation.mutate(field.id)
                }
              }}>
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function MasterFieldForm({
  field,
  busy,
  onCancel,
  onSubmit,
}: {
  field: EquipmentMasterField | null
  busy: boolean
  onCancel: () => void
  onSubmit: (values: MasterFormValues) => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<MasterFormValues>({
    resolver: zodResolver(masterFormSchema),
    defaultValues: {
      label: field?.label ?? '',
      required: field?.required ?? false,
      sort_order: field?.sort_order ?? 0,
    },
  })

  return (
    <Card>
      <CardContent className="pt-5">
        <form noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="master-label">항목명</Label>
            <Input id="master-label" aria-invalid={Boolean(errors.label)} {...register('label')} />
            {errors.label && <p className="text-sm text-destructive">항목명을 입력하세요.</p>}
          </div>
          <div className="flex items-center gap-2">
            <input id="master-required" type="checkbox" className="size-4 accent-primary" {...register('required')} />
            <Label htmlFor="master-required">필수 항목</Label>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="master-sort-order">표시 순서</Label>
            <Input id="master-sort-order" type="number" min={0} {...register('sort_order', { valueAsNumber: true })} />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={busy}><Plus aria-hidden="true" />{field ? '항목 수정' : '항목 추가'}</Button>
            {field && <Button type="button" variant="outline" onClick={onCancel}>취소</Button>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
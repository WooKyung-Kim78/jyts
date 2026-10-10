import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { ArrowLeft, Plus } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getOrganizations } from '@/features/organizations/api/organizations'
import { ApiError } from '@/lib/api/client'
import {
  copyEquipment,
  createEquipment,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_LABELS,
  getActiveEmployees,
  getEquipmentById,
  getEquipmentMasterFields,
  updateEquipment,
  uploadEquipmentPhoto,
  type Equipment,
  type EquipmentAttribute,
  type EquipmentCategory,
  type EquipmentMasterField,
  type EquipmentInput,
} from '../api/equipment'

type EditorMode = 'create' | 'edit' | 'copy'

const formSchema = z.object({
  organization_id: z.uuid('고객사를 선택하세요.'),
  equipment_code: z.string().trim().min(1, '장비 코드를 입력하세요.').max(60),
  name: z.string().trim().min(1, '장비명을 입력하세요.').max(150),
  category: z.enum(EQUIPMENT_CATEGORIES),
  specifics: z.string().max(20000).nullable(),
  assigned_user_id: z.string(),
  master_values: z.record(z.string(), z.string().nullable()),
  attribute_values: z.record(z.string(), z.string().nullable()),
  custom_fields: z.array(z.object({
    id: z.uuid().optional(),
    label: z.string().trim().min(1).max(120),
    value: z.string().max(2000).nullable(),
  })).max(30),
})
type FormValues = z.infer<typeof formSchema>

const equipmentQueryKey = ['equipment'] as const

export function EquipmentEditorPage({ mode }: { mode: EditorMode }) {
  const auth = useAuth()
  const canWrite = auth.status === 'active' && ['ADMIN', 'USER'].includes(auth.profile.role)
  const { equipmentId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [photos, setPhotos] = useState<File[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const organizations = useQuery({ queryKey: ['organizations'], queryFn: getOrganizations })
  const employees = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: getActiveEmployees,
    enabled: mode !== 'copy',
  })
  const sourceQuery = useQuery({
    queryKey: ['equipment', 'detail', equipmentId],
    queryFn: () => getEquipmentById(equipmentId ?? ''),
    enabled: mode !== 'create' && Boolean(equipmentId),
  })
  const [selectedCategory, setSelectedCategory] = useState<EquipmentCategory>('PRECISION_AIR_CONDITIONER')
  const { register, control, reset, setValue, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organization_id: '',
      equipment_code: '',
      name: '',
      category: 'PRECISION_AIR_CONDITIONER',
      specifics: '',
      assigned_user_id: '',
      master_values: {},
      attribute_values: {},
      custom_fields: [],
    },
  })
  const categoryRegistration = register('category')
  const watchedCategory = useWatch({ control, name: 'category' })
  const category = mode === 'create' ? selectedCategory : watchedCategory
  const masterFields = useQuery({
    queryKey: ['equipment-master-fields', category],
    queryFn: () => getEquipmentMasterFields(category),
    enabled: mode === 'create',
  })

  useEffect(() => {
    const source = sourceQuery.data
    if (!source) return

    reset({
      organization_id: mode === 'copy' ? '' : source.organization_id,
      equipment_code: mode === 'copy' ? '' : source.equipment_code,
      name: source.name,
      category: source.category,
      specifics: source.specifics ?? '',
      assigned_user_id: mode === 'copy' ? '' : source.assigned_user_id ?? '',
      master_values: {},
      attribute_values: Object.fromEntries(source.attributes.map((attribute) => [attribute.id, attribute.value ?? ''])),
      custom_fields: source.attributes
        .filter((attribute) => attribute.master_field_id === null)
        .map((attribute) => ({ id: attribute.id, label: attribute.label, value: attribute.value ?? '' })),
    })
  }, [mode, sourceQuery.data, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => saveEquipment(mode, equipmentId, values, photos, sourceQuery.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: equipmentQueryKey })
      setNotice(mode === 'create' ? '장비를 등록했습니다.' : mode === 'edit' ? '장비 정보를 수정했습니다.' : '고객사에 장비 사본을 등록했습니다.')
      navigate('/equipment')
    },
    onError: (error) => setNotice(getErrorMessage(error)),
  })

  if (!canWrite) return <p role="alert">접근 권한이 없습니다.</p>
  if (mode !== 'create' && sourceQuery.isPending) return <p role="status">장비 정보를 불러오는 중입니다.</p>
  if (mode !== 'create' && (sourceQuery.isError || !sourceQuery.data)) return <p role="alert">장비 정보를 찾을 수 없습니다.</p>

  const source = sourceQuery.data
  const snapshotFields: EquipmentMasterField[] = source?.attributes
    .filter((attribute) => attribute.master_field_id !== null)
    .map((attribute) => toMasterFieldSnapshot(attribute, source.category)) ?? []
  const fields = mode === 'create' ? masterFields.data ?? [] : snapshotFields
  const title = mode === 'create' ? '장비 등록' : mode === 'edit' ? '장비 수정' : '고객사에 복제'
  const options = organizations.data?.filter((organization) => mode !== 'copy' || organization.id !== source?.organization_id) ?? []

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="장비 목록으로 돌아가기"><Link to="/equipment"><ArrowLeft aria-hidden="true" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {source && <p className="mt-1 text-sm text-muted-foreground">원본: {source.organization_name} · {source.name}</p>}
        </div>
      </header>

      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      {mode === 'create' && masterFields.isError && <p role="alert" className="text-sm text-destructive">장비 마스터 항목을 불러오지 못했습니다.</p>}

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form noValidate className="flex flex-col gap-5" onSubmit={(event) => void handleSubmit((values) => saveMutation.mutate(values))(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="equipment-organization">고객사</Label>
                <select id="equipment-organization" className="h-10 rounded-md border border-input bg-background px-3 text-sm" {...register('organization_id')}>
                  <option value="">고객사 선택</option>
                  {options.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
                </select>
                {errors.organization_id && <p className="text-sm text-destructive">고객사를 선택하세요.</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="equipment-category">장비 카테고리</Label>
                {mode === 'create' ? <select id="equipment-category" className="h-10 rounded-md border border-input bg-background px-3 text-sm" {...categoryRegistration} onChange={(event) => {
                  const nextCategory = event.currentTarget.value as EquipmentCategory
                  void categoryRegistration.onChange(event)
                  setSelectedCategory(nextCategory)
                  setValue('category', nextCategory)
                  setValue('master_values', {})
                }}>
                  {EQUIPMENT_CATEGORIES.map((value) => <option key={value} value={value}>{EQUIPMENT_CATEGORY_LABELS[value]}</option>)}
                </select> : <Input id="equipment-category" value={EQUIPMENT_CATEGORY_LABELS[source?.category ?? 'PRECISION_AIR_CONDITIONER']} readOnly />}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="equipment-name">장비명</Label>
                <Input id="equipment-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">장비명을 입력하세요.</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="equipment-code">장비 코드</Label>
                <Input id="equipment-code" aria-invalid={Boolean(errors.equipment_code)} {...register('equipment_code')} />
                {errors.equipment_code && <p className="text-sm text-destructive">장비 코드를 입력하세요.</p>}
              </div>
            </div>

            {mode !== 'copy' && <div className="flex flex-col gap-2 sm:max-w-md">
              <Label htmlFor="equipment-assignee">담당 직원</Label>
              <select id="equipment-assignee" className="h-10 rounded-md border border-input bg-background px-3 text-sm" {...register('assigned_user_id')}>
                <option value="">담당자 미지정</option>
                {source?.assigned_user && !source.assigned_user.active && (
                  <option value={source.assigned_user.id}>{source.assigned_user.name} (퇴사)</option>
                )}
                {(employees.data ?? []).map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
              {employees.isError && <p role="alert" className="text-sm text-destructive">직원 목록을 불러오지 못했습니다.</p>}
            </div>}

            {mode === 'create' && masterFields.isPending && <p role="status">카테고리 항목을 불러오는 중입니다.</p>}
            {mode === 'copy' ? <SnapshotSummary equipment={source} /> : category === 'PRECISION_AIR_CONDITIONER' && fields.length > 0 ? (
              <PrecisionAirConditionerGrid fields={fields} register={register} errors={errors} mode={mode} />
            ) : (
              <StandardAttributeGrid category={category} fields={fields} register={register} errors={errors} mode={mode} />
            )}

            {mode !== 'copy' && <CustomFieldsEditor register={register} control={control} />}
            {mode !== 'copy' && <PhotoSection source={source} photos={photos} onPhotosChange={setPhotos} />}
            {mode !== 'copy' && <div className="flex flex-col gap-2 border-t pt-4">
              <Label htmlFor="equipment-specifics">특이사항</Label>
              <textarea
                id="equipment-specifics"
                rows={5}
                maxLength={20000}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                placeholder="장비 특이사항을 입력하세요."
                {...register('specifics')}
              />
            </div>}

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button asChild type="button" variant="outline"><Link to="/equipment">취소</Link></Button>
              <Button type="submit" disabled={saveMutation.isPending || (mode === 'create' && masterFields.isPending)}>
                <Plus aria-hidden="true" />{saveMutation.isPending ? '저장 중' : title}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

async function saveEquipment(
  mode: EditorMode,
  equipmentId: string | undefined,
  values: FormValues,
  photos: File[],
  source: Equipment | undefined,
): Promise<Equipment> {
  if (mode === 'copy') {
    if (!equipmentId) throw new Error('Missing source equipment id')
    return copyEquipment(equipmentId, {
      organization_id: values.organization_id,
      equipment_code: values.equipment_code,
      name: values.name,
    })
  }

  if (mode === 'create') {
    const input: EquipmentInput = {
      organization_id: values.organization_id,
      equipment_code: values.equipment_code,
      name: values.name,
      category: values.category,
      specifics: values.specifics?.trim() || null,
      assigned_user_id: values.assigned_user_id || null,
      master_values: values.master_values,
      custom_fields: values.custom_fields,
    }
    return createEquipment(input, photos)
  }

  if (!equipmentId || !source) throw new Error('Missing equipment record')
  const customAttributeIds = new Set(source.attributes
    .filter((attribute) => attribute.master_field_id === null)
    .map((attribute) => attribute.id))
  const snapshotValues = Object.fromEntries(
    Object.entries(values.attribute_values).filter(([attributeId]) => !customAttributeIds.has(attributeId)),
  )
  const updated = await updateEquipment(equipmentId, {
    organization_id: values.organization_id,
    equipment_code: values.equipment_code,
    name: values.name,
    specifics: values.specifics?.trim() || null,
    assigned_user_id: values.assigned_user_id || null,
    attribute_values: snapshotValues,
    custom_fields: values.custom_fields,
  })
  for (const photo of photos) await uploadEquipmentPhoto(equipmentId, photo)
  return updated
}

function PrecisionAirConditionerGrid({
  fields,
  register,
  errors,
  mode,
}: {
  fields: EquipmentMasterField[]
  register: ReturnType<typeof useForm<FormValues>>['register']
  errors: ReturnType<typeof useForm<FormValues>>['formState']['errors']
  mode: EditorMode
}) {
  return (
    <section aria-labelledby="precision-fields-heading" className="flex flex-col gap-2">
      <h2 id="precision-fields-heading" className="text-sm font-semibold">항온항습기 사양</h2>
      <div className="grid grid-cols-[minmax(92px,0.7fr)_minmax(0,1.3fr)] overflow-hidden rounded-sm border sm:grid-cols-[minmax(105px,0.7fr)_minmax(0,1.3fr)_minmax(105px,0.7fr)_minmax(0,1.3fr)]">
        {Array.from({ length: Math.ceil(fields.length / 2) }, (_, rowIndex) => [fields[rowIndex * 2], fields[rowIndex * 2 + 1]].map((field, pairIndex) => {
          if (!field) return <div key={`empty-${rowIndex}-${pairIndex}`} className="hidden border-b bg-background sm:block" />
          const valueName = mode === 'create' ? `master_values.${field.id}` as const : `attribute_values.${field.id}` as const
          const error = mode === 'create' ? errors.master_values?.[field.id]?.message : errors.attribute_values?.[field.id]?.message
          return <FieldPair
            key={field.id}
            field={field}
            inputName={valueName}
            register={register}
            error={error}
            bordered={pairIndex === 1}
          />
        }))}
      </div>
    </section>
  )
}

function FieldPair({
  field,
  inputName,
  register,
  error,
  bordered,
}: {
  field: EquipmentMasterField
  inputName: `master_values.${string}` | `attribute_values.${string}`
  register: ReturnType<typeof useForm<FormValues>>['register']
  error: string | undefined
  bordered: boolean
}) {
  return <>
    <Label htmlFor={`equipment-value-${field.id}`} className={`flex min-h-10 items-center border-b bg-[#edf1e2] px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm ${bordered ? 'sm:border-l' : ''}`}>
      {field.label}{field.required && <span className="ml-1 text-destructive">*</span>}
    </Label>
    <div className={`min-w-0 border-b bg-background p-1.5 sm:p-2 ${bordered ? 'sm:border-l' : ''}`}>
      {field.field_type === 'textarea' ? (
        <textarea id={`equipment-value-${field.id}`} rows={2} className="min-h-9 w-full resize-y border-0 bg-transparent px-1 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-invalid={Boolean(error)} {...register(inputName)} />
      ) : field.field_type === 'select' ? (
        <select id={`equipment-value-${field.id}`} className="h-9 w-full min-w-0 border-0 bg-transparent px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-invalid={Boolean(error)} {...register(inputName)}>
          <option value="">선택</option>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : field.field_type === 'checkbox' ? (
        <select id={`equipment-value-${field.id}`} className="h-9 w-full min-w-0 border-0 bg-transparent px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-invalid={Boolean(error)} {...register(inputName)}>
          <option value="">선택</option><option value="1">예</option><option value="0">아니오</option>
        </select>
      ) : (
        <Input id={`equipment-value-${field.id}`} type={field.field_type === 'number' || field.field_type === 'date' ? field.field_type : 'text'} className="h-9 border-0 px-1 shadow-none focus-visible:ring-2" aria-invalid={Boolean(error)} {...register(inputName)} />
      )}
      {error && <p className="mt-1 text-xs text-destructive">값을 확인하세요.</p>}
    </div>
  </>
}

function StandardAttributeGrid({
  category,
  fields,
  register,
  errors,
  mode,
}: {
  category: EquipmentCategory
  fields: EquipmentMasterField[]
  register: ReturnType<typeof useForm<FormValues>>['register']
  errors: ReturnType<typeof useForm<FormValues>>['formState']['errors']
  mode: EditorMode
}) {
  if (!fields.length) return <p className="text-sm text-muted-foreground">이 카테고리에 등록된 마스터 항목이 없습니다.</p>
  return <section className="flex flex-col gap-2">
    <h2 className="text-sm font-semibold">{EQUIPMENT_CATEGORY_LABELS[category]} 사양</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => {
        const name = mode === 'create' ? `master_values.${field.id}` as const : `attribute_values.${field.id}` as const
        const error = mode === 'create' ? errors.master_values?.[field.id]?.message : errors.attribute_values?.[field.id]?.message
        return <FieldPair key={field.id} field={field} inputName={name} register={register} error={error} bordered={false} />
      })}
    </div>
  </section>
}

function CustomFieldsEditor({
  register,
  control,
}: {
  register: ReturnType<typeof useForm<FormValues>>['register']
  control: ReturnType<typeof useForm<FormValues>>['control']
}) {
  const [count, setCount] = useState(0)
  const customFields = useWatch({ control, name: 'custom_fields' })
  return <section className="flex flex-col gap-3 border-t pt-4">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold">직접 추가한 항목</h2>
      <Button type="button" variant="outline" size="sm" onClick={() => setCount((value) => value + 1)}><Plus aria-hidden="true" />항목 추가</Button>
    </div>
    {Array.from({ length: Math.max(count, customFields.length) }, (_, index) => <div key={index} className="grid gap-3 rounded-sm border p-3 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`custom-label-${index}`}>항목명</Label>
        <Input id={`custom-label-${index}`} {...register(`custom_fields.${index}.label`)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`custom-value-${index}`}>값</Label>
        <Input id={`custom-value-${index}`} {...register(`custom_fields.${index}.value`)} />
      </div>
    </div>)}
  </section>
}

function PhotoSection({
  source,
  photos,
  onPhotosChange,
}: {
  source: Equipment | undefined
  photos: File[]
  onPhotosChange: (files: File[]) => void
}) {
  return <section className="flex flex-col gap-2 border-t pt-4">
    <Label htmlFor="equipment-photos">장비 사진 (최대 20장, 각 10MB)</Label>
    <Input id="equipment-photos" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => onPhotosChange(Array.from(event.currentTarget.files ?? []).slice(0, 20))} />
    {photos.length > 0 && <p className="text-sm text-muted-foreground">추가할 사진 {photos.length}장</p>}
    {source && source.photos.length > 0 && <div className="flex flex-wrap gap-2">
      {source.photos.map((photo) => <img key={photo.id} src={photo.url} alt="기존 장비 사진" className="size-20 rounded-sm border object-cover" />)}
    </div>}
  </section>
}

function SnapshotSummary({ equipment }: { equipment: Equipment | undefined }) {
  if (!equipment) return null
  return <section className="flex flex-col gap-2">
    <h2 className="text-sm font-semibold">복제할 항목 스냅샷</h2>
    <dl className="grid gap-x-4 gap-y-2 rounded-sm border bg-muted/20 p-3 sm:grid-cols-2">
      {equipment.attributes.map((attribute) => <div key={attribute.id} className="grid grid-cols-[minmax(110px,0.7fr)_minmax(0,1.3fr)] gap-2 border-b py-2 last:border-b-0">
        <dt className="text-sm text-muted-foreground">{attribute.label}</dt>
        <dd className="break-words text-sm">{attribute.value || '-'}</dd>
      </div>)}
    </dl>
  </section>
}

function toMasterFieldSnapshot(attribute: EquipmentAttribute, category: EquipmentCategory): EquipmentMasterField {
  return {
    id: attribute.id,
    category,
    label: attribute.label,
    field_type: attribute.field_type,
    options: attribute.options,
    required: false,
    sort_order: attribute.sort_order,
    active: true,
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) return '변경 권한이 없습니다.'
  if (error instanceof ApiError && error.status === 422) return '입력 내용을 확인해 주세요. 장비 코드가 중복되었거나 필수 항목이 비어 있습니다.'
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
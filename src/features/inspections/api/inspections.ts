import { z } from 'zod'

import { apiRequest } from '@/lib/api/client'
import { EQUIPMENT_CATEGORIES } from '@/features/equipment/api/equipment'

export const INSPECTION_RESULTS = ['GOOD', 'BAD'] as const
export const INSPECTION_RESULT_LABELS: Record<InspectionResult, string> = { GOOD: '양호', BAD: '불량' }
export const INSPECTION_NUMBER_PATTERN = /^-?\d+(\.\d+)?$/

const inspectionPhotoSchema = z.object({
  id: z.uuid(),
  mime_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
  url: z.string(),
  created_at: z.string().nullable(),
})

export const inspectionItemSchema = z.object({
  id: z.uuid(),
  template_item_id: z.string().nullable(),
  sort_order: z.number().int(),
  inspection_item: z.string(),
  standard: z.string(),
  input_template: z.string(),
  input_types: z.array(z.enum(['text', 'num'])),
  input_values: z.array(z.string()),
  previous_values: z.array(z.string()).nullable(),
  result: z.enum(INSPECTION_RESULTS).nullable(),
  remarks: z.string().nullable(),
  saved_at: z.string().nullable(),
  photos: z.array(inspectionPhotoSchema),
})

export const inspectionSchema = z.object({
  id: z.uuid(),
  equipment_id: z.uuid(),
  equipment: z.object({
    id: z.uuid(),
    name: z.string(),
    equipment_code: z.string(),
    organization_name: z.string().nullable(),
    assigned_user_id: z.string().nullable(),
    assigned_user_name: z.string().nullable(),
  }).nullable(),
  category: z.enum(EQUIPMENT_CATEGORIES),
  status: z.enum(['DRAFT', 'COMPLETED', 'CANCELLED']),
  inspected_on: z.string().nullable(),
  completed_at: z.string().nullable(),
  emailed_at: z.string().nullable(),
  remarks: z.string().nullable(),
  has_bad_result: z.boolean().optional(),
  created_by: z.object({ id: z.string(), name: z.string().nullable() }),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
  items: z.array(inspectionItemSchema).optional(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
})

export type InspectionResult = (typeof INSPECTION_RESULTS)[number]
export type Inspection = z.infer<typeof inspectionSchema>
export type InspectionItem = z.infer<typeof inspectionItemSchema>
export type InspectionPhoto = z.infer<typeof inspectionPhotoSchema>
export type InspectionItemInput = {
  input_values: string[]
  result: InspectionResult | null
  remarks: string | null
}

export const INSPECTION_STATUS_LABELS: Record<Inspection['status'], string> = { DRAFT: '작성 중', COMPLETED: '완료', CANCELLED: '취소' }

export function inspectionStatusLabel(inspection: Pick<Inspection, 'status' | 'emailed_at'>): string {
  return inspection.emailed_at ? '이메일 발송 완료' : INSPECTION_STATUS_LABELS[inspection.status]
}

const inspectionPageSchema = z.object({
  items: z.array(inspectionSchema),
  meta: z.object({
    current_page: z.number().int().positive(),
    last_page: z.number().int().positive(),
    per_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
})

export type InspectionPage = z.infer<typeof inspectionPageSchema>

export type InspectionListFilters = {
  equipment_id?: string
  status?: Inspection['status']
  page?: number
  inspected_from?: string
  inspected_to?: string
}

export async function getInspections(filters: InspectionListFilters): Promise<InspectionPage> {
  const query = new URLSearchParams()
  if (filters.equipment_id) query.set('equipment_id', filters.equipment_id)
  if (filters.status) query.set('status', filters.status)
  if (filters.inspected_from) query.set('inspected_from', filters.inspected_from)
  if (filters.inspected_to) query.set('inspected_to', filters.inspected_to)
  if (filters.page && filters.page > 1) query.set('page', String(filters.page))
  return inspectionPageSchema.parse(await apiRequest<unknown>(`/api/inspections?${query.toString()}`))
}

const MAX_LIST_PAGES = 50

export async function getAllInspections(filters: Omit<InspectionListFilters, 'page'>): Promise<Inspection[]> {
  const first = await getInspections(filters)
  const items = [...first.items]
  const lastPage = Math.min(first.meta.last_page, MAX_LIST_PAGES)
  for (let page = 2; page <= lastPage; page += 1) {
    items.push(...(await getInspections({ ...filters, page })).items)
  }
  return items
}

export async function startInspection(equipmentId: string): Promise<Inspection> {
  return inspectionSchema.parse(await apiRequest<unknown>('/api/inspections', {
    method: 'POST',
    body: JSON.stringify({ equipment_id: equipmentId }),
  }))
}

export async function getInspection(id: string): Promise<Inspection> {
  return inspectionSchema.parse(await apiRequest<unknown>(`/api/inspections/${encodeURIComponent(id)}`))
}

export async function saveInspectionItem(inspectionId: string, itemId: string, input: InspectionItemInput): Promise<InspectionItem> {
  return inspectionItemSchema.parse(await apiRequest<unknown>(
    `/api/inspections/${encodeURIComponent(inspectionId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'PUT', body: JSON.stringify(input) },
  ))
}

export async function updateInspection(id: string, patch: { remarks?: string | null; inspected_on?: string }): Promise<Inspection> {
  return inspectionSchema.parse(await apiRequest<unknown>(`/api/inspections/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  }))
}

export async function updateInspectionRemarks(id: string, remarks: string | null): Promise<Inspection> {
  return updateInspection(id, { remarks })
}

export async function deleteInspection(id: string): Promise<void> {
  await apiRequest(`/api/inspections/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function completeInspection(id: string): Promise<Inspection> {
  return inspectionSchema.parse(await apiRequest<unknown>(`/api/inspections/${encodeURIComponent(id)}/complete`, { method: 'POST' }))
}

export async function uploadInspectionPhoto(inspectionId: string, itemId: string, image: File): Promise<InspectionPhoto> {
  const body = new FormData()
  body.append('image', image)
  return inspectionPhotoSchema.parse(await apiRequest<unknown>(
    `/api/inspections/${encodeURIComponent(inspectionId)}/items/${encodeURIComponent(itemId)}/photos`,
    { method: 'POST', body },
  ))
}

export async function deleteInspectionPhoto(id: string): Promise<void> {
  await apiRequest(`/api/inspection-photos/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

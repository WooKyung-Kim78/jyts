import { z } from 'zod'

import { apiRequest } from '@/lib/api/client'
import type { ActiveEmployee } from '@/features/employees/api/employees'

export const EQUIPMENT_CATEGORIES = [
  'PRECISION_AIR_CONDITIONER',
  'UPS',
  'FIRE_SUPPRESSION',
  'VOICE_ALARM',
] as const

export const EQUIPMENT_CATEGORY_LABELS: Record<(typeof EQUIPMENT_CATEGORIES)[number], string> = {
  PRECISION_AIR_CONDITIONER: '항온항습기',
  UPS: 'UPS',
  FIRE_SUPPRESSION: '소방장비',
  VOICE_ALARM: '음성통보기',
}

export const equipmentMasterFieldSchema = z.object({
  id: z.uuid(),
  category: z.enum(EQUIPMENT_CATEGORIES),
  label: z.string(),
  field_type: z.enum(['text', 'textarea', 'number', 'date', 'select', 'checkbox']),
  options: z.array(z.string()),
  required: z.boolean(),
  sort_order: z.number().int(),
  active: z.boolean(),
})

export const equipmentAttributeSchema = z.object({
  id: z.uuid(),
  master_field_id: z.uuid().nullable(),
  label: z.string(),
  field_type: equipmentMasterFieldSchema.shape.field_type,
  options: z.array(z.string()),
  value: z.string().nullable(),
  sort_order: z.number().int(),
})

export const equipmentPhotoSchema = z.object({
  id: z.uuid(),
  mime_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
  url: z.string(),
  created_at: z.string().nullable(),
})

export const equipmentSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  organization_name: z.string().nullable(),
  organization_contact_name: z.string().nullable(),
  organization_contact_phone: z.string().nullable(),
  organization_address: z.string().nullable(),
  organization_map_image_url: z.string().nullable(),
  copied_from_id: z.uuid().nullable(),
  equipment_code: z.string(),
  name: z.string(),
  category: z.enum(EQUIPMENT_CATEGORIES),
  status: z.enum(['ACTIVE', 'INSPECTION_REQUIRED', 'OUT_OF_SERVICE', 'DISPOSED']),
  specifics: z.string().nullable(),
  assigned_user_id: z.string().nullable(),
  assigned_user: z.object({
    id: z.string(),
    name: z.string(),
    active: z.boolean(),
  }).nullable(),
  attributes: z.array(equipmentAttributeSchema),
  photos: z.array(equipmentPhotoSchema),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
})

export const equipmentMasterFieldInputSchema = z.object({
  category: z.enum(EQUIPMENT_CATEGORIES),
  label: z.string().trim().min(1).max(120),
  field_type: equipmentMasterFieldSchema.shape.field_type,
  options: z.array(z.string().trim().min(1).max(120)).max(100),
  required: z.boolean(),
  sort_order: z.number().int().min(0).max(65535),
})

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]
export type Equipment = z.infer<typeof equipmentSchema>
export type EquipmentAttribute = z.infer<typeof equipmentAttributeSchema>
export type EquipmentPhoto = z.infer<typeof equipmentPhotoSchema>
export type EquipmentMasterField = z.infer<typeof equipmentMasterFieldSchema>
export type EquipmentMasterFieldInput = z.infer<typeof equipmentMasterFieldInputSchema>
export type EquipmentInput = {
  organization_id: string
  equipment_code: string
  name: string
  category: EquipmentCategory
  specifics: string | null
  assigned_user_id: string | null
  master_values: Record<string, string | null>
  custom_fields: Array<{ label: string; value: string | null }>
}

export async function getEquipment(organizationId = ''): Promise<Equipment[]> {
  const query = organizationId ? `?organization_id=${encodeURIComponent(organizationId)}` : ''
  return z.array(equipmentSchema).parse(await apiRequest<unknown>(`/api/equipment${query}`))
}

export async function getEquipmentMasterFields(category?: EquipmentCategory): Promise<EquipmentMasterField[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  return z.array(equipmentMasterFieldSchema).parse(await apiRequest<unknown>(`/api/equipment-master-fields${query}`))
}

export async function getActiveEmployees(): Promise<ActiveEmployee[]> {
  return z.array(z.object({ id: z.string(), name: z.string() })).parse(
    await apiRequest<unknown>('/api/employees/active'),
  )
}

export async function saveEquipmentMasterField(input: EquipmentMasterFieldInput, id?: string): Promise<EquipmentMasterField> {
  return equipmentMasterFieldSchema.parse(await apiRequest<unknown>(
    id ? `/api/equipment-master-fields/${id}` : '/api/equipment-master-fields',
    { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) },
  ))
}

export async function deleteEquipmentMasterField(id: string): Promise<void> {
  await apiRequest(`/api/equipment-master-fields/${id}`, { method: 'DELETE' })
}

export async function createEquipment(input: EquipmentInput, photos: File[] = []): Promise<Equipment> {
  const body = new FormData()
  body.append('organization_id', input.organization_id)
  body.append('equipment_code', input.equipment_code)
  body.append('name', input.name)
  body.append('category', input.category)
  if (input.specifics !== null) body.append('specifics', input.specifics)

  for (const [fieldId, value] of Object.entries(input.master_values)) {
    body.append(`master_values[${fieldId}]`, value ?? '')
  }
  input.custom_fields.forEach((field, index) => {
    body.append(`custom_fields[${index}][label]`, field.label)
    body.append(`custom_fields[${index}][value]`, field.value ?? '')
  })
  photos.forEach((photo) => body.append('photos[]', photo))

  return equipmentSchema.parse(await apiRequest<unknown>('/api/equipment', { method: 'POST', body }))
}

export async function copyEquipment(id: string, input: { organization_id: string; equipment_code: string; name?: string }): Promise<Equipment> {
  return equipmentSchema.parse(await apiRequest<unknown>(`/api/equipment/${id}/copies`, {
    method: 'POST',
    body: JSON.stringify(input),
  }))
}

export async function uploadEquipmentPhoto(id: string, image: File): Promise<EquipmentPhoto> {
  const body = new FormData()
  body.append('image', image)
  return equipmentPhotoSchema.parse(await apiRequest<unknown>(`/api/equipment/${id}/photos`, { method: 'POST', body }))
}

export async function deleteEquipmentPhoto(id: string): Promise<void> {
  await apiRequest(`/api/equipment-photos/${id}`, { method: 'DELETE' })
}

export async function deleteEquipment(id: string): Promise<void> {
  await apiRequest(`/api/equipment/${id}`, { method: 'DELETE' })
}

export async function getEquipmentById(id: string): Promise<Equipment> {
  return equipmentSchema.parse(await apiRequest<unknown>(`/api/equipment/${id}`))
}

export async function updateEquipment(
  id: string,
  input: {
    organization_id: string
    equipment_code: string
    name: string
    specifics: string | null
    assigned_user_id: string | null
    attribute_values: Record<string, string | null>
    custom_fields: Array<{ label: string; value: string | null }>
  },
): Promise<Equipment> {
  return equipmentSchema.parse(await apiRequest<unknown>(`/api/equipment/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }))
}
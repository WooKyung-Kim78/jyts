import { z } from 'zod'

import { apiRequest } from '@/lib/api/client'
import { EQUIPMENT_CATEGORIES, EQUIPMENT_CATEGORY_LABELS, type EquipmentCategory } from '@/features/equipment/api/equipment'

export const HVAC_CATEGORY = 'PRECISION_AIR_CONDITIONER' as const
export const INSPECTION_RESULT_OPTIONS = ['불량', '양호'] as const

export { EQUIPMENT_CATEGORIES, EQUIPMENT_CATEGORY_LABELS }

const inspectionTemplateItemSchema = z.object({
  id: z.uuid(),
  inspection_item: z.string(),
  standard: z.string(),
  input_template: z.string(),
  result_options: z.array(z.enum(INSPECTION_RESULT_OPTIONS)),
  sort_order: z.number().int(),
})

export const inspectionTemplateSchema = z.object({
  id: z.uuid(),
  category: z.enum(EQUIPMENT_CATEGORIES),
  items: z.array(inspectionTemplateItemSchema),
})

const baseInspectionTemplateInputSchema = z.object({
  category: z.enum(EQUIPMENT_CATEGORIES),
  items: z.array(z.object({
    inspection_item: z.string().trim().min(1).max(255),
    standard: z.string().trim().max(2000).optional(),
    input_template: z.string().trim().max(2000).optional(),
  })).min(1).max(100),
})

export const inspectionTemplateInputSchema = baseInspectionTemplateInputSchema.superRefine((input, context) => {
  if (input.category === 'UPS' || input.category === 'FIRE_SUPPRESSION') return

  input.items.forEach((item, index) => {
    if (!item.standard) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'standard'],
        message: '기준치를 입력하세요.',
      })
    }
  })
})

export type InspectionTemplate = z.infer<typeof inspectionTemplateSchema>
export type InspectionTemplateInput = z.infer<typeof inspectionTemplateInputSchema>
export type InspectionTemplateItemInput = InspectionTemplateInput['items'][number]

export type InputFieldType = 'text' | 'num'
export type InputTemplatePart =
  | { kind: 'literal'; text: string }
  | { kind: 'field'; type: InputFieldType; index: number }

export function parseInputTemplate(template: string): InputTemplatePart[] {
  const parts: InputTemplatePart[] = []
  let index = 0
  template.split(/(\{(?:text|num)\})/).forEach((segment) => {
    if (segment === '{text}' || segment === '{num}') {
      parts.push({ kind: 'field', type: segment === '{num}' ? 'num' : 'text', index: index++ })
    } else if (segment) {
      parts.push({ kind: 'literal', text: segment })
    }
  })
  return parts
}

export function countInputFields(template = ''): number {
  return template.match(/\{(?:text|num)\}/g)?.length ?? 0
}

export async function getInspectionTemplates(category: EquipmentCategory): Promise<InspectionTemplate[]> {
  return z.array(inspectionTemplateSchema).parse(await apiRequest<unknown>(
    `/api/inspection-templates?category=${encodeURIComponent(category)}`,
  ))
}

export async function createInspectionTemplate(input: InspectionTemplateInput): Promise<InspectionTemplate> {
  return inspectionTemplateSchema.parse(await apiRequest<unknown>('/api/inspection-templates', {
    method: 'POST',
    body: JSON.stringify(input),
  }))
}
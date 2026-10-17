import { z } from 'zod'

import { apiRequest } from '@/lib/api/client'

export const organizationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  address: z.string().nullable(),
  contact_name: z.string().nullable(),
  contact_phone: z.string().nullable(),
  contact_email: z.string().nullable().default(null),
  map_image_url: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
})

export const organizationInputSchema = z.object({
  name: z.string().trim().min(1).max(150),
  address: z.string().trim().max(500).nullable(),
  contact_name: z.string().trim().max(100).nullable(),
  contact_phone: z.string().trim().max(30).nullable(),
  contact_email: z.string().trim().max(254).refine((value) => value === '' || z.email().safeParse(value).success).nullable(),
})

export type Organization = z.infer<typeof organizationSchema>
export type OrganizationInput = z.infer<typeof organizationInputSchema>

export async function getOrganizations(): Promise<Organization[]> {
  return z.array(organizationSchema).parse(await apiRequest<unknown>('/api/organizations'))
}

export async function saveOrganization(input: OrganizationInput, id?: string): Promise<Organization> {
  return organizationSchema.parse(await apiRequest<unknown>(id ? `/api/organizations/${id}` : '/api/organizations', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(input),
  }))
}

export async function deleteOrganization(id: string): Promise<void> {
  await apiRequest(`/api/organizations/${id}`, { method: 'DELETE' })
}

export async function uploadOrganizationMap(id: string, image: File): Promise<void> {
  const body = new FormData()
  body.append('image', image)
  await apiRequest(`/api/organizations/${id}/map`, { method: 'POST', body })
}

export async function deleteOrganizationMap(id: string): Promise<void> {
  await apiRequest(`/api/organizations/${id}/map`, { method: 'DELETE' })
}

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activeAuth } from '@/test/auth'
import { renderRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  getOrganizations: vi.fn(),
  getEquipment: vi.fn(),
  getEquipmentById: vi.fn(),
}))

vi.mock('@/features/organizations/api/organizations', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/organizations/api/organizations')>(),
  getOrganizations: api.getOrganizations,
}))

vi.mock('@/features/equipment/api/equipment', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/equipment/api/equipment')>(),
  getEquipment: api.getEquipment,
  getEquipmentById: api.getEquipmentById,
}))

const organization = {
  id: '00000000-0000-4000-8000-000000000001',
  name: '예시 고객사',
  address: '서울시 예시구',
  contact_name: '예시 담당자',
  contact_phone: '010-0000-0000',
  map_image_url: '/api/organizations/map',
  created_at: null,
  updated_at: null,
}

function createEquipment(id: string, name: string, code: string) {
  return {
    id,
    organization_id: organization.id,
    organization_name: organization.name,
    organization_contact_name: organization.contact_name,
    organization_contact_phone: organization.contact_phone,
    organization_address: organization.address,
    organization_map_image_url: organization.map_image_url,
    copied_from_id: null,
    equipment_code: code,
    name,
    category: 'UPS' as const,
    status: 'ACTIVE' as const,
    specifics: null,
    assigned_user_id: null,
    assigned_user: null,
    attributes: [],
    photos: [],
    created_at: null,
    updated_at: null,
  }
}

describe('customer equipment history cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getOrganizations.mockResolvedValue([organization])
    api.getEquipment.mockResolvedValue([
      createEquipment('00000000-0000-4000-8000-000000000011', 'UPS 1호기', 'UPS-001'),
      createEquipment('00000000-0000-4000-8000-000000000012', 'UPS 2호기', 'UPS-002'),
    ])
    api.getEquipmentById.mockResolvedValue(null)
  })

  it('shows all linked equipment cards and prints them together', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('print', vi.fn())
    renderRoute(`/organizations/${organization.id}/equipment-history-card`, { auth: activeAuth('USER') })

    expect(await screen.findByRole('heading', { name: '예시 고객사 장비이력카드' })).toBeInTheDocument()
    expect(screen.getByText('UPS 1호기')).toBeInTheDocument()
    expect(screen.getByText('UPS 2호기')).toBeInTheDocument()
    expect(api.getEquipment).toHaveBeenCalledWith(organization.id)

    await user.click(screen.getByRole('button', { name: '전체 장비이력카드 인쇄' }))
    expect(window.print).toHaveBeenCalledOnce()
  })
})
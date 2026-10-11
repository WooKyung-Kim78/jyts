import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activeAuth } from '@/test/auth'
import { renderRoute } from '@/test/render'

const api = vi.hoisted(() => ({ getEquipmentById: vi.fn() }))

vi.mock('./api/equipment', async (importOriginal) => ({
  ...await importOriginal<typeof import('./api/equipment')>(),
  ...api,
}))

const inspectionApi = vi.hoisted(() => ({ getInspections: vi.fn() }))

vi.mock('@/features/inspections/api/inspections', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/inspections/api/inspections')>(),
  ...inspectionApi,
}))

const equipment = {
  id: '00000000-0000-4000-8000-000000000003',
  organization_id: '00000000-0000-4000-8000-000000000001',
  organization_name: '예시 고객사',
  organization_contact_name: '예시 담당자',
  organization_contact_phone: '010-0000-0000',
  organization_address: '서울시 예시구',
  organization_map_image_url: '/api/organizations/00000000-0000-4000-8000-000000000001/map',
  copied_from_id: null,
  equipment_code: 'JY-AC-001',
  name: '항온항습기 1호기',
  category: 'PRECISION_AIR_CONDITIONER' as const,
  status: 'ACTIVE' as const,
  inspection_cycle: 'QUARTERLY' as const,
  specifics: '전산실 우측 설치',
  attributes: [
    { id: '00000000-0000-4000-8000-000000000011', master_field_id: null, label: '제조사', field_type: 'text' as const, options: [], value: 'Danfoss', sort_order: 0 },
    { id: '00000000-0000-4000-8000-000000000012', master_field_id: null, label: '제조년월', field_type: 'text' as const, options: [], value: null, sort_order: 1 },
    { id: '00000000-0000-4000-8000-000000000013', master_field_id: null, label: '차단기-Main', field_type: 'text' as const, options: [], value: 'ABS 63C 60A', sort_order: 2 },
    { id: '00000000-0000-4000-8000-000000000014', master_field_id: null, label: '차단기-Blower', field_type: 'text' as const, options: [], value: 'ABN 53c 50A', sort_order: 3 },
    { id: '00000000-0000-4000-8000-000000000015', master_field_id: null, label: '마그네트-Fan', field_type: 'text' as const, options: [], value: 'MC-12b × 2EA', sort_order: 4 },
    { id: '00000000-0000-4000-8000-000000000016', master_field_id: null, label: 'EOCR-Comp', field_type: 'text' as const, options: [], value: null, sort_order: 5 },
  ],
  photos: [],
  created_at: null,
  updated_at: null,
}

describe('equipment history card', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getEquipmentById.mockResolvedValue(equipment)
    inspectionApi.getInspections.mockResolvedValue({
      items: [{
        id: '00000000-0000-4000-8000-000000000041',
        equipment_id: equipment.id,
        equipment: null,
        category: 'PRECISION_AIR_CONDITIONER',
        status: 'COMPLETED',
        inspected_on: '2026-09-15',
        completed_at: '2026-09-15T10:00:00+09:00',
        emailed_at: null,
        remarks: '습도 센서 확인',
        created_by: { id: '22', name: '점검 직원' },
        can_edit: false,
        can_delete: false,
        created_at: null,
        updated_at: null,
      }],
      meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
    })
    vi.stubGlobal('print', vi.fn())
  })

  it('shows organization details and grouped equipment specifications', async () => {
    renderRoute(`/equipment/${equipment.id}/history-card`, { auth: activeAuth('USER') })

    expect(await screen.findByRole('heading', { name: '장비이력카드' })).toBeInTheDocument()
    expect(screen.getByText('예시 고객사')).toBeInTheDocument()
    expect(screen.getByText('예시 담당자')).toBeInTheDocument()
    expect(screen.getByText('서울시 예시구')).toBeInTheDocument()
    expect(screen.getByText('설치 상태')).toBeInTheDocument()
    expect(screen.getByText('정상')).toBeInTheDocument()
    expect(screen.getByText('점검주기').nextElementSibling).toHaveTextContent('분기')
    expect(screen.getByText('전산실 우측 설치')).toBeInTheDocument()
    expect(screen.getByText('Danfoss')).toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
    expect(screen.getByRole('table', { name: '차단기 사양' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: '마그네트 사양' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'EOCR 사양' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: '유지보수 이력' })).toBeInTheDocument()
    expect(await screen.findByText('2026-09-15')).toBeInTheDocument()
    expect(screen.getByText('습도 센서 확인')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '장비로 돌아가기' })).toHaveAttribute('href', `/equipment/${equipment.id}`)
  })

  it('calls browser print from the print action', async () => {
    const user = userEvent.setup()
    renderRoute(`/equipment/${equipment.id}/history-card`, { auth: activeAuth('USER') })

    await user.click(await screen.findByRole('button', { name: '장비이력카드 인쇄' }))
    expect(window.print).toHaveBeenCalledOnce()
  })
})
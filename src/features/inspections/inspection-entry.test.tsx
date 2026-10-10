import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { equipmentSchema } from '@/features/equipment/api/equipment'
import { activeAuth } from '@/test/auth'
import { renderRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  getEquipment: vi.fn(),
  getInspectionTemplates: vi.fn(),
  getInspections: vi.fn(),
  startInspection: vi.fn(),
  getInspection: vi.fn(),
}))

vi.mock('@/features/inspections/api/inspections', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/inspections/api/inspections')>(),
  getInspections: api.getInspections,
  startInspection: api.startInspection,
  getInspection: api.getInspection,
}))

vi.mock('@/features/equipment/api/equipment', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/equipment/api/equipment')>(),
  getEquipment: api.getEquipment,
}))

vi.mock('@/features/inspections/api/templates', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/inspections/api/templates')>(),
  getInspectionTemplates: api.getInspectionTemplates,
}))

const currentUserId = '00000000-0000-4000-8000-000000000001'

function equipmentFixture(overrides: Record<string, unknown>) {
  return {
    id: '00000000-0000-4000-8000-000000000101',
    organization_id: '00000000-0000-4000-8000-000000000201',
    organization_name: '예시 고객사',
    organization_contact_name: null,
    organization_contact_phone: null,
    organization_address: null,
    organization_map_image_url: null,
    copied_from_id: null,
    equipment_code: 'JY-HVAC-001',
    name: '항온항습기 1호기',
    category: 'PRECISION_AIR_CONDITIONER',
    status: 'ACTIVE',
    specifics: null,
    assigned_user_id: currentUserId,
    assigned_user: { id: currentUserId, name: '테스트 사용자', active: true },
    attributes: [],
    photos: [],
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

const myEquipment = equipmentFixture({})
const otherEquipment = equipmentFixture({
  id: '00000000-0000-4000-8000-000000000102',
  equipment_code: 'JY-UPS-001',
  name: 'UPS 1호기',
  category: 'UPS',
  assigned_user_id: '99',
  assigned_user: { id: '99', name: '다른 직원', active: true },
})

describe('inspection entry page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getInspections.mockResolvedValue({ items: [], meta: { current_page: 1, last_page: 1, per_page: 100, total: 0 } })
    api.getEquipment.mockResolvedValue([myEquipment, otherEquipment])
    api.getInspectionTemplates.mockResolvedValue([{
      id: '00000000-0000-4000-8000-000000000301',
      category: 'PRECISION_AIR_CONDITIONER',
      items: [
        {
          id: '00000000-0000-4000-8000-000000000311',
          inspection_item: '압축기 전류 측정',
          standard: '정격 전류 이내',
          input_template: '1. {text} ~ {text} A',
          result_options: ['불량', '양호'],
          sort_order: 0,
        },
        {
          id: '00000000-0000-4000-8000-000000000312',
          inspection_item: '필터 상태 확인',
          standard: '오염 없음',
          input_template: '',
          result_options: ['불량', '양호'],
          sort_order: 1,
        },
      ],
    }])
  })

  it('accepts assigned users without email in equipment responses', () => {
    expect(equipmentSchema.parse(otherEquipment).assigned_user).toEqual({ id: '99', name: '다른 직원', active: true })
  })

  it('lists my equipment first and marks equipment assigned to others', async () => {
    const user = userEvent.setup()
    renderRoute('/inspections/new', { auth: activeAuth('USER') })

    const myScope = await screen.findByRole('button', { name: '내 장비 (1)' })
    expect(myScope).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /항온항습기 1호기/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /UPS 1호기/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '전체 장비 (2)' }))
    const options = screen.getAllByRole('button', { name: /호기/ })
    expect(options.map((option) => within(option).getByText(/호기$/).textContent)).toEqual(['항온항습기 1호기', 'UPS 1호기'])
    expect(within(options[1]!).getByText(/내 담당 장비 아님 · 담당: 다른 직원/)).toBeInTheDocument()
    expect(within(options[0]!).queryByText(/내 담당 장비 아님/)).not.toBeInTheDocument()
  })

  it('loads the ordered inspection master items for the selected equipment', async () => {
    const user = userEvent.setup()
    renderRoute('/inspections/new', { auth: activeAuth('USER') })

    await user.click(await screen.findByRole('button', { name: /항온항습기 1호기/ }))

    expect(api.getInspectionTemplates).toHaveBeenCalledWith('PRECISION_AIR_CONDITIONER')
    const list = await screen.findByRole('list', { name: '점검항목 목록' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByText(/^\d\. /).textContent)).toEqual(['1. 압축기 전류 측정', '2. 필터 상태 확인'])
    expect(within(items[0]!).getAllByText('입력칸')).toHaveLength(2)
    expect(screen.queryByText(/내 담당 장비가 아닙니다/)).not.toBeInTheDocument()
  })

  it('warns when the selected equipment is assigned to another employee', async () => {
    api.getInspectionTemplates.mockResolvedValue([])
    renderRoute(`/inspections/new?equipment_id=${otherEquipment.id}`, { auth: activeAuth('USER') })

    expect(await screen.findByText(/내 담당 장비가 아닙니다. \(담당: 다른 직원\)/)).toBeInTheDocument()
    expect(api.getInspectionTemplates).toHaveBeenCalledWith('UPS')
    expect(await screen.findByText(/점검일지 마스터가 없습니다/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '점검 시작' })).not.toBeInTheDocument()
  })

  it('starts a new inspection and opens the input page', async () => {
    const user = userEvent.setup()
    const inspectionId = '00000000-0000-4000-8000-000000000401'
    api.startInspection.mockResolvedValue({ id: inspectionId })
    api.getInspection.mockReturnValue(new Promise(() => {}))
    renderRoute(`/inspections/new?equipment_id=${myEquipment.id}`, { auth: activeAuth('USER') })

    await user.click(await screen.findByRole('button', { name: '점검 시작' }))

    expect(api.startInspection).toHaveBeenCalledWith(myEquipment.id)
    expect(await screen.findByText('점검 내용을 불러오는 중입니다.')).toBeInTheDocument()
    expect(api.getInspection).toHaveBeenCalledWith(inspectionId)
  })

  it('offers to resume my draft instead of starting another one', async () => {
    api.getInspections.mockResolvedValue({ items: [{
      id: '00000000-0000-4000-8000-000000000402',
      inspected_on: '2026-10-10',
      created_by: { id: currentUserId, name: '테스트 사용자' },
      can_edit: true,
    }], meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 } })
    renderRoute(`/inspections/new?equipment_id=${myEquipment.id}`, { auth: activeAuth('USER') })

    expect(await screen.findByRole('link', { name: '이어서 작성 (2026-10-10)' }))
      .toHaveAttribute('href', '/inspections/00000000-0000-4000-8000-000000000402')
    expect(screen.queryByRole('button', { name: '점검 시작' })).not.toBeInTheDocument()
    expect(api.getInspections).toHaveBeenCalledWith({ equipment_id: myEquipment.id, status: 'DRAFT' })
  })
})

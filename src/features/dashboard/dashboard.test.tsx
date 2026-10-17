import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activeAuth } from '@/test/auth'
import { renderRoute } from '@/test/render'
import { buildMonthlyRows, inspectionPeriod, shiftMonth } from './monthly-inspections'

const api = vi.hoisted(() => ({ getEquipment: vi.fn(), getAllInspections: vi.fn() }))

vi.mock('@/features/equipment/api/equipment', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/equipment/api/equipment')>(),
  getEquipment: api.getEquipment,
}))

vi.mock('@/features/inspections/api/inspections', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/inspections/api/inspections')>(),
  getAllInspections: api.getAllInspections,
}))

type Cycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ON_REQUEST' | null

function equipment(id: number, name: string, cycle: Cycle, status: 'ACTIVE' | 'DISPOSED' = 'ACTIVE') {
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    organization_id: '00000000-0000-4000-8000-000000000100',
    organization_name: '예시 고객사',
    organization_contact_name: null,
    organization_contact_phone: null,
    organization_address: null,
    organization_map_image_url: null,
    copied_from_id: null,
    equipment_code: `EQ-${id}`,
    name,
    category: 'UPS' as const,
    status,
    inspection_cycle: cycle,
    specifics: null,
    assigned_user_id: null,
    assigned_user: null,
    attributes: [],
    photos: [],
    created_at: null,
    updated_at: null,
  }
}

function inspection(id: number, equipmentId: number, inspectedOn: string, status: 'DRAFT' | 'COMPLETED', hasBad = false) {
  return {
    id: `00000000-0000-4000-8000-${String(500 + id).padStart(12, '0')}`,
    equipment_id: `00000000-0000-4000-8000-${String(equipmentId).padStart(12, '0')}`,
    equipment: null,
    category: 'UPS' as const,
    status,
    inspected_on: inspectedOn,
    completed_at: null,
    emailed_at: null,
    remarks: null,
    has_bad_result: hasBad,
    created_by: { id: '22', name: '점검 직원' },
    can_edit: true,
    can_delete: false,
    can_send_email: false,
    created_at: null,
    updated_at: null,
  }
}

const allEquipment = [
  equipment(1, '월간 완료 장비', 'MONTHLY'),
  equipment(2, '월간 미점검 장비', 'MONTHLY'),
  equipment(3, '분기 장비', 'QUARTERLY'),
  equipment(4, '연간 장비', 'YEARLY'),
  equipment(5, '요청 장비', 'ON_REQUEST'),
  equipment(6, '폐기 장비', 'MONTHLY', 'DISPOSED'),
]
const allInspections = [
  inspection(1, 1, '2026-10-05', 'COMPLETED', true),
  inspection(2, 1, '2026-09-05', 'COMPLETED'),
  inspection(3, 3, '2026-11-02', 'DRAFT'),
  inspection(4, 4, '2026-03-10', 'COMPLETED'),
]

describe('monthly inspection rows', () => {
  it('evaluates quarterly and yearly equipment over their calendar period', () => {
    expect(inspectionPeriod('QUARTERLY', '2026-11')).toMatchObject({ from: '2026-10-01', to: '2026-12-31', label: '4분기 (10~12월)' })
    expect(inspectionPeriod('YEARLY', '2026-02')).toMatchObject({ from: '2026-01-01', to: '2026-12-31' })
    expect(inspectionPeriod('MONTHLY', '2028-02')).toMatchObject({ from: '2028-02-01', to: '2028-02-29' })
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')

    const rows = buildMonthlyRows(allEquipment, allInspections, '2026-10')
    const byName = Object.fromEntries(rows.map((row) => [row.equipment.name, row.inspection?.id ?? null]))
    expect(byName).toEqual({
      '분기 장비': allInspections[2]!.id,
      '연간 장비': allInspections[3]!.id,
      '월간 미점검 장비': null,
      '월간 완료 장비': allInspections[0]!.id,
    })
  })
})

describe('dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getEquipment.mockResolvedValue(allEquipment)
    api.getAllInspections.mockResolvedValue(allInspections)
  })

  it('shows the selected month table with status, bad marker, cycle and search', async () => {
    const user = userEvent.setup()
    renderRoute('/?month=2026-10', { auth: activeAuth('USER') })

    const table = await screen.findByRole('table', { name: '2026년 10월 정기점검' })
    expect(api.getAllInspections).toHaveBeenCalledWith({ inspected_from: '2026-01-01', inspected_to: '2026-12-31' })
    expect(within(table).getAllByRole('row')).toHaveLength(5)

    const completedLink = within(table).getByRole('link', { name: '월간 완료 장비' })
    expect(completedLink).toHaveAttribute('href', `/inspections/${allInspections[0]!.id}/report`)
    const completedRow = completedLink.closest('tr')!
    expect(within(completedRow).getByText('완료')).toBeInTheDocument()
    expect(within(completedRow).getByText('불량')).toBeInTheDocument()
    expect(within(completedRow).getByText('2026-10-05')).toBeInTheDocument()

    const pendingLink = within(table).getByRole('link', { name: '월간 미점검 장비' })
    expect(pendingLink).toHaveAttribute('href', `/inspections/new?equipment_id=${allEquipment[1]!.id}`)
    expect(within(pendingLink.closest('tr')!).getByText('미점검')).toBeInTheDocument()

    const quarterlyRow = within(table).getByRole('link', { name: '분기 장비' }).closest('tr')!
    expect(within(quarterlyRow).getByText('작성 중')).toBeInTheDocument()
    expect(within(quarterlyRow).getByText('4분기 (10~12월)')).toBeInTheDocument()

    await user.type(screen.getByLabelText('검색'), '미점검')
    expect(within(screen.getByRole('table', { name: '2026년 10월 정기점검' })).getAllByRole('row')).toHaveLength(2)
  })

  it('moves to the previous month', async () => {
    const user = userEvent.setup()
    renderRoute('/?month=2026-10', { auth: activeAuth('USER') })

    await screen.findByRole('table', { name: '2026년 10월 정기점검' })
    await user.click(screen.getByRole('button', { name: '이전 달' }))
    const table = await screen.findByRole('table', { name: '2026년 9월 정기점검' })
    const completedRow = within(table).getByRole('link', { name: '월간 완료 장비' }).closest('tr')!
    expect(within(completedRow).getByText('2026-09-05')).toBeInTheDocument()
    expect(within(completedRow).queryByText('불량')).not.toBeInTheDocument()
  })

  it('opens the inspection input page when a row is clicked', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/?month=2026-10', { auth: activeAuth('USER') })

    const table = await screen.findByRole('table', { name: '2026년 10월 정기점검' })
    await user.click(within(table).getByText('EQ-2'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inspections/new'))
    expect(router.state.location.search).toBe(`?equipment_id=${allEquipment[1]!.id}`)
  })

  it('pages the table by thirty rows', async () => {
    const user = userEvent.setup()
    api.getEquipment.mockResolvedValue(Array.from({ length: 31 }, (_, index) => equipment(index + 1, `장비 ${String(index + 1).padStart(2, '0')}`, 'MONTHLY')))
    api.getAllInspections.mockResolvedValue([])
    renderRoute('/?month=2026-10', { auth: activeAuth('USER') })

    const rows = async () => within(await screen.findByRole('table', { name: '2026년 10월 정기점검' })).getAllByRole('row').slice(1)
    expect(await rows()).toHaveLength(30)
    expect(screen.getByText('총 31건 · 1/2 페이지')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(await rows()).toHaveLength(1)
    expect(screen.getByRole('link', { name: '장비 31' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('검색'), '장비 0')
    expect(screen.getByText('총 9건 · 1/1 페이지')).toBeInTheDocument()
  })
})

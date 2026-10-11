import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activeAuth } from '@/test/auth'
import { renderRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  getInspections: vi.fn(),
  getInspection: vi.fn(),
  updateInspectionRemarks: vi.fn(),
  deleteInspection: vi.fn(),
  getEquipmentById: vi.fn(),
}))

vi.mock('@/features/inspections/api/inspections', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/inspections/api/inspections')>(),
  getInspections: api.getInspections,
  getInspection: api.getInspection,
  updateInspectionRemarks: api.updateInspectionRemarks,
  deleteInspection: api.deleteInspection,
}))

vi.mock('@/features/equipment/api/equipment', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/equipment/api/equipment')>(),
  getEquipmentById: api.getEquipmentById,
}))

const inspectionId = '00000000-0000-4000-8000-000000000701'
const equipmentId = '00000000-0000-4000-8000-000000000101'

function inspection(overrides: Record<string, unknown> = {}) {
  return {
    id: inspectionId,
    equipment_id: equipmentId,
    equipment: {
      id: equipmentId,
      name: '항온항습기 1호기',
      equipment_code: 'JY-HVAC-001',
      organization_name: '예시 고객사',
      assigned_user_id: '00000000-0000-4000-8000-000000000001',
      assigned_user_name: '테스트 사용자',
    },
    category: 'PRECISION_AIR_CONDITIONER',
    status: 'COMPLETED',
    inspected_on: '2026-10-10',
    completed_at: '2026-10-10T02:00:00.000Z',
    emailed_at: null,
    remarks: null,
    created_by: { id: '00000000-0000-4000-8000-000000000001', name: '테스트 사용자' },
    can_edit: true,
    can_delete: true,
    items: [
      {
        id: '00000000-0000-4000-8000-000000000711',
        template_item_id: null,
        sort_order: 0,
        inspection_item: '압축기 전류 측정',
        standard: '정격 전류 이내',
        input_template: '{num} ~ {num} A',
        input_types: ['num', 'num'],
        input_values: ['12.5', ''],
        previous_values: null,
        result: 'GOOD',
        remarks: null,
        saved_at: '2026-10-10T01:00:00.000Z',
        photos: [{ id: '00000000-0000-4000-8000-000000000721', mime_type: 'image/png', size_bytes: 10, url: '/api/inspection-photos/00000000-0000-4000-8000-000000000721', created_at: null }],
      },
      {
        id: '00000000-0000-4000-8000-000000000712',
        template_item_id: null,
        sort_order: 1,
        inspection_item: '필터 상태 확인',
        standard: '오염 없음',
        input_template: '',
        input_types: [],
        input_values: [],
        previous_values: null,
        result: 'BAD',
        remarks: '필터 오염',
        saved_at: '2026-10-10T01:00:00.000Z',
        photos: [],
      },
    ],
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

describe('inspection list and report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getInspections.mockResolvedValue({
      items: [{ ...inspection(), items: undefined }],
      meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
    })
    api.getInspection.mockResolvedValue(inspection())
    api.getEquipmentById.mockResolvedValue({
      attributes: [
        { id: '00000000-0000-4000-8000-000000000801', label: '모델명', value: 'JY-100', master_field_id: null, field_type: 'text', options: [], sort_order: 0 },
        { id: '00000000-0000-4000-8000-000000000802', label: '빈 항목', value: null, master_field_id: null, field_type: 'text', options: [], sort_order: 1 },
      ],
    })
  })

  it('shows inspections as a table and opens the report when a row is clicked', async () => {
    const user = userEvent.setup()
    renderRoute('/inspections', { auth: activeAuth('USER') })

    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent))
      .toEqual(['점검일자', '고객사', '장비', '점검자', '점검일지 상태'])
    const row = within(table).getAllByRole('row')[1]!
    expect(within(row).getByText('예시 고객사')).toBeInTheDocument()
    expect(within(row).getByText('완료')).toBeInTheDocument()

    await user.click(within(row).getByText('테스트 사용자'))

    expect(await screen.findByRole('heading', { name: '정기점검 리포트' })).toBeInTheDocument()
    expect(api.getInspection).toHaveBeenCalledWith(inspectionId)
  })

  it('moves between pages of one hundred inspections', async () => {
    const user = userEvent.setup()
    api.getInspections.mockImplementation(async ({ page = 1 }: { page?: number }) => ({
      items: [{ ...inspection({ id: `00000000-0000-4000-8000-00000000090${page}`, inspected_on: `2026-10-0${page}` }), items: undefined }],
      meta: { current_page: page, last_page: 3, per_page: 100, total: 201 },
    }))
    renderRoute('/inspections', { auth: activeAuth('USER') })

    expect(await screen.findByText('총 201건 · 1/3 페이지')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '1 페이지' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByText('총 201건 · 2/3 페이지')).toBeInTheDocument()
    expect(api.getInspections).toHaveBeenLastCalledWith({ page: 2 })
    expect(screen.getByRole('link', { name: '2026-10-02' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '3 페이지' }))
    expect(await screen.findByText('총 201건 · 3/3 페이지')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  it('renders equipment specifications, the inspection table and saves footer remarks', async () => {
    const user = userEvent.setup()
    api.updateInspectionRemarks.mockResolvedValue(inspection({ remarks: '다음 점검 시 필터 교체' }))
    renderRoute(`/inspections/${inspectionId}/report`, { auth: activeAuth('USER') })

    const specs = await screen.findByLabelText('장비 기본 사양')
    expect(Array.from(specs.querySelectorAll('dt')).map((term) => term.textContent))
      .toEqual(['점검일자', '고객사', '장비명', '장비 코드', '장비 종류', '장비 담당 직원'])
    expect(within(specs).getByText('2026-10-10')).toBeInTheDocument()
    expect(api.getEquipmentById).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '자세히' }))
    const dialog = await screen.findByRole('dialog', { name: '장비 상세 사양' })
    expect(await within(dialog).findByText('JY-100')).toBeInTheDocument()
    expect(within(dialog).getByText('빈 항목')).toBeInTheDocument()
    expect(api.getEquipmentById).toHaveBeenCalledWith(equipmentId)
    await user.click(within(dialog).getByRole('button', { name: '닫기' }))

    const table = screen.getByRole('table', { name: '점검 내용' })
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent))
      .toEqual(['No', '점검사항', '기준치', '점검 내용', '결과', '메모', '사진'])
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('12.5 ~ ＿＿ A')
    expect(within(rows[0]!).getByText('양호')).toBeInTheDocument()
    expect(within(rows[0]!).getByRole('img', { name: '1번 항목 사진 1' })).toBeInTheDocument()
    expect(within(rows[1]!).getByText('불량')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('필터 오염')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: '점검일지 수정' })).toHaveAttribute('href', `/inspections/${inspectionId}`)
    const save = screen.getByRole('button', { name: '기타사항 저장' })
    expect(save).toBeDisabled()
    await user.type(screen.getByLabelText('기타사항'), '다음 점검 시 필터 교체')
    await user.click(save)

    expect(api.updateInspectionRemarks).toHaveBeenCalledWith(inspectionId, '다음 점검 시 필터 교체')
    expect(await screen.findByText('기타사항을 저장했습니다.')).toBeInTheDocument()
  })

  it('shows a read-only report when the e-mail has been sent', async () => {
    api.getInspection.mockResolvedValue(inspection({ can_edit: false, can_delete: false, emailed_at: '2026-10-11T00:00:00.000Z', remarks: '발송된 기타사항' }))
    renderRoute(`/inspections/${inspectionId}/report`, { auth: activeAuth('ADMIN') })

    expect(await screen.findByLabelText('기타사항')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('기타사항')).toHaveValue('발송된 기타사항')
    expect(screen.getByText('이메일 발송 완료')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '점검일지 수정' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '기타사항 저장' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '점검일지 삭제' })).not.toBeInTheDocument()
  })

  it('deletes the inspection after confirmation and returns to the list', async () => {
    const user = userEvent.setup()
    api.deleteInspection.mockResolvedValue(undefined)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderRoute(`/inspections/${inspectionId}/report`, { auth: activeAuth('USER') })

    await user.click(await screen.findByRole('button', { name: '점검일지 삭제' }))

    expect(confirm).toHaveBeenCalled()
    await waitFor(() => expect(api.deleteInspection).toHaveBeenCalledWith(inspectionId))
    expect(await screen.findByRole('heading', { level: 1, name: '정기점검 리스트' })).toBeInTheDocument()
    confirm.mockRestore()
  })
})

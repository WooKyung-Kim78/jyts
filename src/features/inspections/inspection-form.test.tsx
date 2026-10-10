import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { parseInputTemplate } from '@/features/inspections/api/templates'
import { activeAuth } from '@/test/auth'
import { renderRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  getInspection: vi.fn(),
  saveInspectionItem: vi.fn(),
  completeInspection: vi.fn(),
  uploadInspectionPhoto: vi.fn(),
  deleteInspectionPhoto: vi.fn(),
  updateInspection: vi.fn(),
}))

vi.mock('@/features/inspections/api/inspections', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/inspections/api/inspections')>(),
  ...api,
}))

const currentUserId = '00000000-0000-4000-8000-000000000001'
const inspectionId = '00000000-0000-4000-8000-000000000501'

function item(overrides: Record<string, unknown>) {
  return {
    id: '00000000-0000-4000-8000-000000000511',
    template_item_id: '00000000-0000-4000-8000-000000000311',
    sort_order: 0,
    inspection_item: '압축기 전류 측정',
    standard: '정격 전류 이내',
    input_template: '{num} ~ {num} A, 상태:{text}',
    input_types: ['num', 'num', 'text'],
    input_values: ['', '', ''],
    previous_values: ['10', '20', '정상'],
    result: null,
    remarks: null,
    saved_at: null,
    photos: [],
    ...overrides,
  }
}

const secondItem = item({
  id: '00000000-0000-4000-8000-000000000512',
  template_item_id: '00000000-0000-4000-8000-000000000312',
  sort_order: 1,
  inspection_item: '필터 상태 확인',
  standard: '오염 없음',
  input_template: '',
  input_types: [],
  input_values: [],
  previous_values: [],
})

function inspection(overrides: Record<string, unknown> = {}) {
  return {
    id: inspectionId,
    equipment_id: '00000000-0000-4000-8000-000000000101',
    equipment: {
      id: '00000000-0000-4000-8000-000000000101',
      name: '항온항습기 1호기',
      equipment_code: 'JY-HVAC-001',
      organization_name: '예시 고객사',
      assigned_user_id: currentUserId,
      assigned_user_name: '테스트 사용자',
    },
    category: 'PRECISION_AIR_CONDITIONER',
    status: 'DRAFT',
    inspected_on: '2026-10-10',
    completed_at: null,
    emailed_at: null,
    created_by: { id: currentUserId, name: '테스트 사용자' },
    can_edit: true,
    items: [item({}), secondItem],
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

describe('inspection input page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getInspection.mockResolvedValue(inspection())
  })

  it('parses text and number tokens in order', () => {
    expect(parseInputTemplate('{num} ~ {text} A')).toEqual([
      { kind: 'field', type: 'num', index: 0 },
      { kind: 'literal', text: ' ~ ' },
      { kind: 'field', type: 'text', index: 1 },
      { kind: 'literal', text: ' A' },
    ])
  })

  it('saves the current item with the next button and moves to the next item', async () => {
    const user = userEvent.setup()
    api.saveInspectionItem.mockImplementation(async (_inspectionId: string, itemId: string, input: Record<string, unknown>) => item({
      id: itemId,
      ...input,
      previous_values: null,
      saved_at: '2026-10-10T01:00:00.000Z',
    }))
    renderRoute(`/inspections/${inspectionId}`, { auth: activeAuth('USER') })

    const first = await screen.findByRole('textbox', { name: '1번 압축기 전류 측정 입력 1' })
    expect(first).toHaveAttribute('inputmode', 'decimal')
    expect(first).toHaveAttribute('placeholder', '10')
    expect(screen.getByRole('textbox', { name: '1번 압축기 전류 측정 입력 3' })).toHaveAttribute('inputmode', 'text')

    await user.type(first, '12.5{Enter}')
    expect(screen.getByRole('textbox', { name: '1번 압축기 전류 측정 입력 2' })).toHaveFocus()
    await user.type(screen.getByRole('textbox', { name: '1번 압축기 전류 측정 입력 2' }), '13')
    await user.type(screen.getByRole('textbox', { name: '1번 압축기 전류 측정 입력 3' }), '정상')
    await user.click(within(screen.getByRole('group', { name: '1번 결과' })).getByRole('button', { name: '양호' }))
    expect(screen.getByText('저장 안 됨')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: '다음' })[0]!)

    expect(api.saveInspectionItem).toHaveBeenCalledWith(inspectionId, '00000000-0000-4000-8000-000000000511', {
      input_values: ['12.5', '13', '정상'],
      result: 'GOOD',
      remarks: null,
    })
    await waitFor(() => expect(within(screen.getByRole('group', { name: '2번 결과' })).getByRole('button', { name: '양호' })).toHaveFocus())
    expect(screen.getByText('저장됨')).toBeInTheDocument()
    expect(screen.getByText('1/2 완료')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '다음' })).not.toBeInTheDocument()
  })

  it('rejects non-numeric values in number fields before saving', async () => {
    const user = userEvent.setup()
    renderRoute(`/inspections/${inspectionId}`, { auth: activeAuth('USER') })

    await user.type(await screen.findByRole('textbox', { name: '1번 압축기 전류 측정 입력 2' }), 'abc')
    await user.click(screen.getAllByRole('button', { name: '다음' })[0]!)

    expect(await screen.findByText('2번째 칸에는 숫자만 입력하세요.')).toBeInTheDocument()
    expect(api.saveInspectionItem).not.toHaveBeenCalled()
  })

  it('completes the inspection after every result is saved', async () => {
    const user = userEvent.setup()
    api.getInspection.mockResolvedValue(inspection({
      items: [item({ input_values: ['1', '2', '정상'], result: 'GOOD', saved_at: '2026-10-10T01:00:00.000Z' }), secondItem],
    }))
    api.saveInspectionItem.mockImplementation(async (_inspectionId: string, itemId: string, input: Record<string, unknown>) => ({
      ...secondItem,
      id: itemId,
      ...input,
      saved_at: '2026-10-10T01:05:00.000Z',
    }))
    api.completeInspection.mockResolvedValue(inspection({ status: 'COMPLETED' }))
    renderRoute(`/inspections/${inspectionId}`, { auth: activeAuth('USER') })

    const complete = await screen.findByRole('button', { name: '점검 완료' })
    expect(complete).toBeDisabled()
    await user.click(within(screen.getByRole('group', { name: '2번 결과' })).getByRole('button', { name: '불량' }))
    await user.type(screen.getByLabelText('메모'), '필터 오염')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(api.saveInspectionItem).toHaveBeenCalledWith(inspectionId, secondItem.id, { input_values: [], result: 'BAD', remarks: '필터 오염' })
    await waitFor(() => expect(screen.getByRole('button', { name: '점검 완료' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: '점검 완료' }))

    expect(api.completeInspection).toHaveBeenCalledWith(inspectionId)
    expect(await screen.findByText(/점검을 완료했습니다/)).toBeInTheDocument()
  })

  it('uploads a photo for an item', async () => {
    const user = userEvent.setup()
    api.uploadInspectionPhoto.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000601',
      mime_type: 'image/png',
      size_bytes: 10,
      url: '/api/inspection-photos/00000000-0000-4000-8000-000000000601',
      created_at: null,
    })
    renderRoute(`/inspections/${inspectionId}`, { auth: activeAuth('USER') })

    const file = new File(['image'], 'site.png', { type: 'image/png' })
    await user.upload(await screen.findByLabelText('1번 항목 사진 추가'), file)

    expect(api.uploadInspectionPhoto).toHaveBeenCalledWith(inspectionId, '00000000-0000-4000-8000-000000000511', file)
    expect(await screen.findByRole('img', { name: '1번 항목 사진 1' })).toHaveAttribute('src', '/api/inspection-photos/00000000-0000-4000-8000-000000000601')
  })

  it('changes the inspection date from the default date', async () => {
    api.updateInspection.mockResolvedValue(inspection({ inspected_on: '2026-10-08' }))
    renderRoute(`/inspections/${inspectionId}`, { auth: activeAuth('USER') })

    const date = await screen.findByLabelText('점검일자')
    expect(date).toHaveValue('2026-10-10')
    fireEvent.change(date, { target: { value: '2026-10-08' } })

    await waitFor(() => expect(api.updateInspection).toHaveBeenCalledWith(inspectionId, { inspected_on: '2026-10-08' }))
    expect(await screen.findByText('점검일자를 변경했습니다.')).toBeInTheDocument()
    expect(screen.getByLabelText('점검일자')).toHaveValue('2026-10-08')
  })

  it('saves overall remarks at the end of the input page', async () => {
    const user = userEvent.setup()
    api.updateInspection.mockResolvedValue(inspection({ remarks: '다음 점검 시 필터 교체' }))
    renderRoute(`/inspections/${inspectionId}`, { auth: activeAuth('USER') })

    const save = await screen.findByRole('button', { name: '기타사항 저장' })
    expect(save).toBeDisabled()
    await user.type(screen.getByLabelText('기타사항'), '다음 점검 시 필터 교체')
    await user.click(save)

    await waitFor(() => expect(api.updateInspection).toHaveBeenCalledWith(inspectionId, { remarks: '다음 점검 시 필터 교체' }))
    expect(await screen.findByText('기타사항을 저장했습니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기타사항 저장' })).toBeDisabled()
  })

  it('is read-only after the report e-mail is sent', async () => {
    api.getInspection.mockResolvedValue(inspection({
      status: 'COMPLETED',
      can_edit: false,
      emailed_at: '2026-10-11T00:00:00.000Z',
      equipment: { ...inspection().equipment, assigned_user_id: '99', assigned_user_name: '다른 직원' },
    }))
    renderRoute(`/inspections/${inspectionId}`, { auth: activeAuth('USER') })

    expect(await screen.findByText('담당자에게 이메일을 보낸 점검은 수정할 수 없습니다.')).toBeInTheDocument()
    expect(screen.getByText(/내 담당 장비가 아닙니다. \(담당: 다른 직원\)/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '1번 압축기 전류 측정 입력 1' })).toBeDisabled()
    expect(screen.getByLabelText('점검일자')).toBeDisabled()
    expect(screen.queryByRole('button', { name: '다음' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('1번 항목 사진 추가')).not.toBeInTheDocument()
  })
})

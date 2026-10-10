import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activeAuth } from '@/test/auth'
import { renderRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  createInspectionTemplate: vi.fn(),
  getInspectionTemplates: vi.fn(),
}))

vi.mock('@/features/inspections/api/templates', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/inspections/api/templates')>(),
  createInspectionTemplate: api.createInspectionTemplate,
  getInspectionTemplates: api.getInspectionTemplates,
}))

describe('inspection template master', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getInspectionTemplates.mockResolvedValue([])
    api.createInspectionTemplate.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      category: 'PRECISION_AIR_CONDITIONER',
      items: [],
    })
  })

  it('submits HVAC input templates and counts each text token as an input', async () => {
    const user = userEvent.setup()
    renderRoute('/inspections/master', { auth: activeAuth('ADMIN') })

    await screen.findByRole('heading', { name: '점검일지 마스터' })
    await user.type(screen.getByLabelText('점검사항'), '압축기 운전 중 전류 측정')
    expect(screen.getByText('불량 · 양호')).toBeInTheDocument()
    const standardInput = screen.getByLabelText('기준치')
    expect(standardInput.tagName).toBe('INPUT')
    await user.type(standardInput, '정상 운전 전류 기준 확인')
    const inputTemplate = '1. {text} ~ {text} A\n2. 저압:{text} ~ {text} Kg/㎠'
    const templateInput = screen.getByLabelText('점검자 입력 템플릿')
    fireEvent.change(templateInput, { target: { value: inputTemplate } })
    expect((templateInput as HTMLTextAreaElement).value.match(/\{text\}/g)).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: '목록 저장' }))

    expect(api.createInspectionTemplate.mock.calls[0]?.[0]).toEqual({
      category: 'PRECISION_AIR_CONDITIONER',
      items: [{
        inspection_item: '압축기 운전 중 전류 측정',
        standard: '정상 운전 전류 기준 확인',
        input_template: inputTemplate,
      }],
    })
  })

  it('saves a separate template for the selected equipment category', async () => {
    const user = userEvent.setup()
    renderRoute('/inspections/master', { auth: activeAuth('ADMIN') })

    await screen.findByRole('heading', { name: '점검일지 마스터' })
    await user.type(screen.getByLabelText('점검사항'), '항온항습기 임시 항목')
    await user.type(screen.getByLabelText('기준치'), '항온항습기 임시 기준')
    await user.selectOptions(screen.getByLabelText('장비 종류'), 'UPS')
    await screen.findByRole('heading', { name: '점검일지 마스터' })
    expect(screen.queryByLabelText('기준치')).not.toBeInTheDocument()
    expect(screen.getByText('불량 · 양호')).toBeInTheDocument()
    await user.type(screen.getByLabelText('점검사항'), '관리자 등록 점검사항')
    const upsCheck = screen.getByLabelText('점검')
    expect(upsCheck).toBeInTheDocument()
    fireEvent.change(upsCheck, { target: { value: '전압:{text} V' } })
    await user.selectOptions(screen.getByLabelText('장비 종류'), 'PRECISION_AIR_CONDITIONER')
    expect(screen.getByLabelText('점검사항')).toHaveValue('항온항습기 임시 항목')
    await user.selectOptions(screen.getByLabelText('장비 종류'), 'UPS')
    await user.click(screen.getByRole('button', { name: '목록 저장' }))

    expect(api.getInspectionTemplates).toHaveBeenCalledWith('UPS')
    expect(api.createInspectionTemplate.mock.calls[0]?.[0]).toEqual({
      category: 'UPS',
      items: [{ inspection_item: '관리자 등록 점검사항', input_template: '전압:{text} V' }],
    })
  })

  it('saves fire inspection item and details without a text template', async () => {
    const user = userEvent.setup()
    renderRoute('/inspections/master', { auth: activeAuth('ADMIN') })

    await screen.findByRole('heading', { name: '점검일지 마스터' })
    await user.selectOptions(screen.getByLabelText('장비 종류'), 'FIRE_SUPPRESSION')
    await screen.findByRole('heading', { name: '점검일지 마스터' })
    await user.type(screen.getByLabelText('점검항목'), '소화기 외관 확인')

    expect(screen.queryByLabelText('점검자 입력 템플릿')).not.toBeInTheDocument()
    expect(screen.getByText('기타사항')).toBeInTheDocument()
    expect(screen.getByText('점검결과')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '목록 저장' }))

    expect(api.createInspectionTemplate.mock.calls[0]?.[0]).toEqual({
      category: 'FIRE_SUPPRESSION',
      items: [{ inspection_item: '소화기 외관 확인' }],
    })
  })

  it('loads the current ordered list and saves a changed order', async () => {
    const user = userEvent.setup()
    api.getInspectionTemplates.mockResolvedValue([{
      id: '00000000-0000-4000-8000-000000000010',
      category: 'PRECISION_AIR_CONDITIONER',
      items: [
        {
          id: '00000000-0000-4000-8000-000000000011',
          inspection_item: '첫 번째 항목',
          standard: '첫 기준',
          input_template: '',
          result_options: ['불량', '양호'],
          sort_order: 0,
        },
        {
          id: '00000000-0000-4000-8000-000000000012',
          inspection_item: '두 번째 항목',
          standard: '둘째 기준',
          input_template: '',
          result_options: ['불량', '양호'],
          sort_order: 1,
        },
      ],
    }])
    renderRoute('/inspections/master', { auth: activeAuth('ADMIN') })

    await screen.findByDisplayValue('첫 번째 항목')
    await screen.findByDisplayValue('두 번째 항목')
    await user.click(screen.getByRole('button', { name: '항목 2 위로' }))
    expect(screen.getAllByLabelText('점검사항').map((input) => (input as HTMLInputElement).value)).toEqual([
      '두 번째 항목',
      '첫 번째 항목',
    ])
    await user.click(screen.getByRole('button', { name: '목록 저장' }))

    expect(api.createInspectionTemplate.mock.calls[0]?.[0]).toEqual({
      category: 'PRECISION_AIR_CONDITIONER',
      items: [
        { inspection_item: '두 번째 항목', standard: '둘째 기준', input_template: '' },
        { inspection_item: '첫 번째 항목', standard: '첫 기준', input_template: '' },
      ],
    })
  })
})
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activeAuth } from '@/test/auth'
import { renderRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  getEquipment: vi.fn(),
  getEquipmentById: vi.fn(),
  getActiveEmployees: vi.fn(),
  getEquipmentMasterFields: vi.fn(),
  saveEquipmentMasterField: vi.fn(),
  deleteEquipmentMasterField: vi.fn(),
  deleteEquipment: vi.fn(),
  createEquipment: vi.fn(),
  updateEquipment: vi.fn(),
  copyEquipment: vi.fn(),
  uploadEquipmentPhoto: vi.fn(),
  deleteEquipmentPhoto: vi.fn(),
}))

vi.mock('./api/equipment', async (importOriginal) => ({
  ...await importOriginal<typeof import('./api/equipment')>(),
  ...api,
}))

vi.mock('@/features/organizations/api/organizations', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/organizations/api/organizations')>(),
  getOrganizations: vi.fn(async () => [
    {
      id: '00000000-0000-4000-8000-000000000001',
      name: '예시 고객사',
      address: null,
      contact_name: null,
      contact_phone: null,
      map_image_url: null,
      created_at: null,
      updated_at: null,
    },
    {
      id: '00000000-0000-4000-8000-000000000004',
      name: '다른 고객사',
      address: null,
      contact_name: null,
      contact_phone: null,
      map_image_url: null,
      created_at: null,
      updated_at: null,
    },
  ]),
}))

const masterField = {
  id: '00000000-0000-4000-8000-000000000002',
  category: 'UPS' as const,
  label: '정격 용량',
  field_type: 'number' as const,
  options: [],
  required: true,
  sort_order: 0,
  active: true,
}

const equipment = {
  id: '00000000-0000-4000-8000-000000000003',
  organization_id: '00000000-0000-4000-8000-000000000001',
  organization_name: '예시 고객사',
  organization_contact_name: '예시 담당자',
  organization_contact_phone: '010-0000-0000',
  organization_address: '서울시 예시구',
  copied_from_id: null,
  equipment_code: 'JY-UPS-001',
  name: 'UPS 1호기',
  category: 'UPS' as const,
  status: 'ACTIVE' as const,
  specifics: null,
  assigned_user_id: '22',
  assigned_user: { id: '22', name: '장비 담당 직원', active: true },
  attributes: [],
  photos: [],
  created_at: null,
  updated_at: null,
}

describe('equipment pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getEquipment.mockResolvedValue([equipment])
    api.getEquipmentById.mockResolvedValue(equipment)
    api.getActiveEmployees.mockResolvedValue([{ id: '22', name: '예시 담당자' }])
    api.getEquipmentMasterFields.mockImplementation(async (category: string | undefined) => category === 'UPS' ? [masterField] : [])
    api.createEquipment.mockResolvedValue(equipment)
    api.updateEquipment.mockResolvedValue(equipment)
    api.updateEquipment.mockResolvedValue(equipment)
    api.saveEquipmentMasterField.mockResolvedValue(masterField)
    api.deleteEquipmentMasterField.mockResolvedValue(undefined)
    api.deleteEquipment.mockResolvedValue(undefined)
    api.copyEquipment.mockResolvedValue(equipment)
    api.uploadEquipmentPhoto.mockResolvedValue(undefined)
    api.deleteEquipmentPhoto.mockResolvedValue(undefined)
  })

  it('shows the requested customer installation columns on the list page', async () => {
    renderRoute('/equipment', { auth: activeAuth('USER') })

    expect((await screen.findAllByText('예시 고객사')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('예시 담당자')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('장비 담당 직원')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('서울시 예시구')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('UPS 1호기')).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('장비명')).not.toBeInTheDocument()
    const historyCardLinks = await screen.findAllByRole('link', { name: 'UPS 1호기 이력카드' })
    expect(historyCardLinks).toHaveLength(2)
    historyCardLinks.forEach((link) => expect(link).toHaveAttribute('href', `/equipment/${equipment.id}/history-card`))
  })

  it('loads master fields for the selected category and submits them with equipment registration', async () => {
    const user = userEvent.setup()
    renderRoute('/equipment/new', { auth: activeAuth('USER') })

    const organizationOption = await screen.findByRole('option', { name: '예시 고객사' })
    await user.selectOptions(screen.getByLabelText('고객사'), organizationOption.getAttribute('value') ?? '')
    await user.selectOptions(await screen.findByLabelText('장비 카테고리'), 'UPS')
    expect(await screen.findByLabelText(/정격 용량/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('장비 코드'), 'JY-UPS-002')
    await user.type(screen.getByLabelText('장비명'), 'UPS 2호기')
    await user.selectOptions(screen.getByLabelText('담당 직원'), '22')
    await user.type(screen.getByLabelText(/정격 용량/), '120')
    await user.type(screen.getByLabelText('특이사항'), '현장 메모')
    const photo = new File(['photo-data'], 'ups.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('장비 사진 (최대 20장, 각 10MB)'), photo)
    await user.click(screen.getByRole('button', { name: '장비 등록' }))

    expect(api.createEquipment.mock.calls[0]?.[0]).toMatchObject({
      organization_id: equipment.organization_id,
      equipment_code: 'JY-UPS-002',
      name: 'UPS 2호기',
      category: 'UPS',
      specifics: '현장 메모',
      assigned_user_id: '22',
      master_values: { [masterField.id]: '120' },
    })
    expect(api.createEquipment.mock.calls[0]?.[1]).toEqual([photo])
  })

  it('lets ADMIN add short-text master fields but not USER', async () => {
    const user = userEvent.setup()
    renderRoute('/equipment/master', { auth: activeAuth('ADMIN') })

    await user.selectOptions(await screen.findByLabelText('카테고리'), 'FIRE_SUPPRESSION')
    await user.type(screen.getByLabelText('항목명'), '약제 용량')
    await user.click(screen.getByRole('button', { name: '항목 추가' }))

    expect(api.saveEquipmentMasterField.mock.calls[0]?.[0]).toMatchObject({
      category: 'FIRE_SUPPRESSION',
      label: '약제 용량',
      field_type: 'text',
      options: [],
    })

    renderRoute('/equipment/master', { auth: activeAuth('USER') })
    expect(await screen.findByRole('alert')).toHaveTextContent('접근 권한이 없습니다.')
    expect(within(screen.getByRole('alert')).queryByLabelText('항목명')).not.toBeInTheDocument()
  })

  it('copies equipment to another customer with a new code', async () => {
    const user = userEvent.setup()
    renderRoute('/equipment', { auth: activeAuth('USER') })

    const copyLinks = await screen.findAllByRole('link', { name: 'UPS 1호기 복제' })
    const copyLink = copyLinks[0]
    if (!copyLink) throw new Error('복제 링크를 찾을 수 없습니다.')
    await user.click(copyLink)
    expect(await screen.findByRole('heading', { name: '고객사에 복제' })).toBeInTheDocument()
    const targetOrganizationId = '00000000-0000-4000-8000-000000000004'
    await user.selectOptions(screen.getByLabelText('고객사'), targetOrganizationId)
    await user.type(screen.getByLabelText('장비 코드'), 'JY-UPS-002')
    await user.click(screen.getByRole('button', { name: '고객사에 복제' }))

    expect(api.copyEquipment.mock.calls[0]?.[0]).toBe(equipment.id)
    expect(api.copyEquipment.mock.calls[0]?.[1]).toEqual({
      organization_id: targetOrganizationId,
      equipment_code: 'JY-UPS-002',
      name: 'UPS 1호기',
    })
  })

  it('opens a separate edit page and saves equipment snapshot values', async () => {
    const user = userEvent.setup()
    const equipmentWithAttributes = {
      ...equipment,
      attributes: [
        {
          id: masterField.id,
          master_field_id: masterField.id,
          label: '정격 용량',
          field_type: 'text' as const,
          options: [],
          value: '100',
          sort_order: 0,
        },
        {
          id: '00000000-0000-4000-8000-000000000005',
          master_field_id: null,
          label: '설치 위치',
          field_type: 'text' as const,
          options: [],
          value: '전산실',
          sort_order: 1,
        },
      ],
    }
    api.getEquipmentById.mockResolvedValue(equipmentWithAttributes)
    renderRoute(`/equipment/${equipment.id}/edit`, { auth: activeAuth('USER') })

    expect(await screen.findByRole('heading', { name: '장비 수정' })).toBeInTheDocument()
    const customLabels = screen.getAllByLabelText('항목명')
    const customValues = screen.getAllByLabelText('값')
    await waitFor(() => expect(customLabels[0]).toHaveValue('설치 위치'))
    await waitFor(() => expect(customValues[0]).toHaveValue('전산실'))
    await user.clear(await screen.findByLabelText('장비명'))
    await user.type(screen.getByLabelText('장비명'), 'UPS 변경명')
    await user.clear(screen.getByLabelText(/정격 용량/))
    await user.type(screen.getByLabelText(/정격 용량/), '120')
    if (!customLabels[0] || !customValues[0]) throw new Error('직접 추가 항목 입력란이 없습니다.')
    await user.clear(customLabels[0])
    await user.type(customLabels[0], '설치 위치')
    await user.clear(customValues[0])
    await user.type(customValues[0], '기계실')
    expect(customValues[0]).toHaveValue('기계실')
    await user.click(screen.getByRole('button', { name: '장비 수정' }))

    expect(api.updateEquipment.mock.calls[0]?.[0]).toBe(equipment.id)
    expect(api.updateEquipment.mock.calls[0]?.[1]).toMatchObject({
      name: 'UPS 변경명',
      attribute_values: { [masterField.id]: '120' },
      custom_fields: [{ id: '00000000-0000-4000-8000-000000000005', label: '설치 위치', value: '기계실' }],
    })
  })

  it('updates an existing equipment from its dedicated edit page', async () => {
    const user = userEvent.setup()
    const equipmentWithField = {
      ...equipment,
      attributes: [{
        id: masterField.id,
        master_field_id: masterField.id,
        label: '정격 용량',
        field_type: 'text' as const,
        options: [],
        value: '100',
        sort_order: 0,
      }],
    }
    api.getEquipmentById.mockResolvedValue(equipmentWithField)
    renderRoute(`/equipment/${equipment.id}/edit`, { auth: activeAuth('USER') })

    expect(await screen.findByRole('heading', { name: '장비 수정' })).toBeInTheDocument()
    const nameInput = await screen.findByLabelText('장비명')
    await user.clear(nameInput)
    await user.type(nameInput, 'UPS 변경명')
    await user.selectOptions(await screen.findByLabelText('담당 직원'), '22')
    await user.clear(screen.getByLabelText('특이사항'))
    await user.type(screen.getByLabelText('특이사항'), '수정 메모')
    await user.clear(screen.getByLabelText('정격 용량'))
    await user.type(screen.getByLabelText('정격 용량'), '120')
    await user.click(screen.getByRole('button', { name: '장비 수정' }))

    expect(api.updateEquipment.mock.calls[0]?.[0]).toBe(equipment.id)
    expect(api.updateEquipment.mock.calls[0]?.[1]).toMatchObject({
      organization_id: equipment.organization_id,
      equipment_code: equipment.equipment_code,
      name: 'UPS 변경명',
      specifics: '수정 메모',
      assigned_user_id: '22',
      attribute_values: { [masterField.id]: '120' },
    })
  })
})
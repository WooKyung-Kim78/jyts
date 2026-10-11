import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activeAuth } from '@/test/auth'
import { renderRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  getOrganizations: vi.fn(),
  saveOrganization: vi.fn(),
  deleteOrganization: vi.fn(),
  uploadOrganizationMap: vi.fn(),
  deleteOrganizationMap: vi.fn(),
}))

const equipmentApi = vi.hoisted(() => ({ getEquipment: vi.fn() }))

const equipmentItem = {
  id: '00000000-0000-4000-8000-000000000010',
  organization_id: '00000000-0000-4000-8000-000000000001',
  organization_name: '예시 고객사',
  organization_contact_name: '예시 담당자',
  organization_contact_phone: '010-0000-0000',
  organization_address: '서울시 예시구',
  copied_from_id: null,
  equipment_code: 'JY-UPS-001',
  name: 'UPS 장비',
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

vi.mock('./api/organizations', async (importOriginal) => ({
  ...await importOriginal<typeof import('./api/organizations')>(),
  ...api,
}))

vi.mock('@/features/equipment/api/equipment', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/equipment/api/equipment')>(),
  ...equipmentApi,
}))
const organization = {
  id: '00000000-0000-4000-8000-000000000001',
  name: '예시 고객사',
  address: '서울시 예시구',
  contact_name: '예시 담당자',
  contact_phone: '010-0000-0000',
  map_image_url: null,
  created_at: null,
  updated_at: null,
}

describe('organization page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getOrganizations.mockResolvedValue([organization])
    equipmentApi.getEquipment.mockResolvedValue([])
    api.saveOrganization.mockResolvedValue(organization)
    api.deleteOrganization.mockResolvedValue(undefined)
    api.uploadOrganizationMap.mockResolvedValue(undefined)
    api.deleteOrganizationMap.mockResolvedValue(undefined)
  })

  it('shows organization data to users without edit controls', async () => {
    renderRoute('/organizations', { auth: activeAuth('USER') })

    expect(await screen.findByText('예시 고객사')).toBeInTheDocument()
    expect(screen.queryByLabelText('고객사명')).not.toBeInTheDocument()
    expect(screen.getByText('연락처')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '예시 고객사 수정' })).not.toBeInTheDocument()
  })

  it('lets administrators create an organization', async () => {
    const user = userEvent.setup()
    renderRoute('/organizations', { auth: activeAuth('ADMIN') })

    await user.click(await screen.findByRole('button', { name: '고객사 등록' }))
    await user.type(await screen.findByLabelText('고객사명'), '새 고객사')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(api.saveOrganization).toHaveBeenCalledWith({
      name: '새 고객사',
      address: null,
      contact_name: null,
      contact_phone: null,
    }, undefined)
    expect(await screen.findByRole('status')).toHaveTextContent('고객사 정보를 저장했습니다.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the customer edit form in a dialog', async () => {
    const user = userEvent.setup()
    renderRoute(`/organizations?selected=${organization.id}`, { auth: activeAuth('ADMIN') })

    await user.click(await screen.findByRole('button', { name: '예시 고객사 수정' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('고객사명')).toHaveValue('예시 고객사')
  })

  it('searches contact and address fields and paginates twelve customer rows', async () => {
    const user = userEvent.setup()
    const organizations = Array.from({ length: 13 }, (_, index) => ({
      ...organization,
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      name: `고객사 ${index + 1}`,
      contact_name: index === 12 ? '검색 담당자' : null,
      contact_phone: null,
      address: index === 12 ? '부산시 테스트구' : null,
    }))
    api.getOrganizations.mockResolvedValue(organizations)
    renderRoute('/organizations', { auth: activeAuth('USER') })

    expect(await screen.findByText('13개 고객사 · 1/2 페이지')).toBeInTheDocument()
    const customerRows = () => within(screen.getByRole('table', { name: '고객사 목록' })).getAllByRole('row').slice(1)
    expect(customerRows()).toHaveLength(12)
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('13개 고객사 · 2/2 페이지')).toBeInTheDocument()
    expect(customerRows()).toHaveLength(1)
    expect(screen.getByText('검색 담당자')).toBeInTheDocument()

    await user.type(screen.getByLabelText('고객사 검색'), '부산시')
    expect(screen.getByText('1개 고객사 · 1/1 페이지')).toBeInTheDocument()
    expect(customerRows()).toHaveLength(1)
    expect(screen.getByText('부산시 테스트구')).toBeInTheDocument()
  })

  it('shows the selected customer equipment and links each device to its detail page', async () => {
    const user = userEvent.setup()
    equipmentApi.getEquipment.mockResolvedValue([equipmentItem])
    renderRoute('/organizations', { auth: activeAuth('USER') })

    expect(await screen.findByText('고객사를 선택하세요.')).toBeInTheDocument()
    await user.click(await screen.findByRole('link', { name: '예시 고객사' }))

    const equipmentTable = await screen.findByRole('table', { name: '예시 고객사 보유 장비' })
    expect(within(equipmentTable).getByRole('link', { name: 'UPS 장비' }))
      .toHaveAttribute('href', `/equipment/${equipmentItem.id}`)
    expect(within(equipmentTable).getByText('정상')).toBeInTheDocument()
  })

  it('shows a history-card icon for the selected customer for every role', async () => {
    renderRoute(`/organizations?selected=${organization.id}`, { auth: activeAuth('USER') })

    expect(await screen.findByRole('link', { name: '예시 고객사 장비이력카드' }))
      .toHaveAttribute('href', `/organizations/${organization.id}/equipment-history-card`)
  })

  it('opens all equipment history cards for a customer together', async () => {
    equipmentApi.getEquipment.mockResolvedValue([equipmentItem, { ...equipmentItem, id: '00000000-0000-4000-8000-000000000013', name: 'UPS 두 번째' }])
    renderRoute(`/organizations/${organization.id}/equipment-history-card`, { auth: activeAuth('USER') })

    expect(await screen.findByRole('heading', { name: '예시 고객사 장비이력카드' })).toBeInTheDocument()
    expect(screen.getByText('UPS 장비')).toBeInTheDocument()
    expect(screen.getByText('UPS 두 번째')).toBeInTheDocument()
    expect(document.querySelectorAll('.history-print-sheet')).toHaveLength(2)
    expect(document.querySelectorAll('.history-card-page-break')).toHaveLength(1)
  })

  it('uploads a selected map image for a customer', async () => {
    const user = userEvent.setup()
    renderRoute('/organizations', { auth: activeAuth('ADMIN') })
    const image = new File(['map-image'], 'map.png', { type: 'image/png' })

    await user.click(await screen.findByRole('button', { name: '고객사 등록' }))
    await user.type(await screen.findByLabelText('고객사명'), '새 고객사')
    await user.upload(screen.getByLabelText('지도 캡처 (PNG/JPG/WebP, 최대 10MB)'), image)
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(api.uploadOrganizationMap).toHaveBeenCalledWith(organization.id, image)
    expect(await screen.findByRole('status')).toHaveTextContent('고객사 정보와 지도 이미지를 저장했습니다.')
  })
})
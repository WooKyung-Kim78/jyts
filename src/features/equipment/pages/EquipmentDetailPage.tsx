import { Link, useParams, useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ClipboardCheck, ClipboardPen, Copy, FileText, ImageOff, Paperclip, Pencil, RefreshCw, Wrench } from 'lucide-react'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { DescriptionList } from '@/components/ui/description-list'
import { Pagination } from '@/components/ui/pagination'
import { Panel } from '@/components/ui/panel'
import { TabPanel, Tabs, type TabItem } from '@/components/ui/tabs'
import { Timeline, type TimelineEntry } from '@/components/ui/timeline'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getInspections, type Inspection } from '@/features/inspections/api/inspections'
import { InspectionStatusBadge } from '@/features/inspections/components/InspectionStatusBadge'
import { inspectionStatusTone } from '@/features/inspections/status'
import { ApiError } from '@/lib/api/client'
import { formatDate } from '@/lib/utils'
import { EQUIPMENT_CATEGORY_LABELS, getEquipmentById, inspectionCycleLabel, type Equipment } from '../api/equipment'
import { EquipmentStatusBadge } from '../components/EquipmentStatusBadge'

const TAB_VALUES = ['info', 'inspections', 'repairs', 'replacements', 'files'] as const
type DetailTab = (typeof TAB_VALUES)[number]
const TAB_ID = 'equipment-detail'

export function EquipmentDetailPage() {
  const { equipmentId = '' } = useParams()
  const auth = useAuth()
  const canWrite = auth.status === 'active' && ['ADMIN', 'USER'].includes(auth.profile.role)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TAB_VALUES.find((value) => value === searchParams.get('tab')) ?? 'info'
  const requestedPage = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const inspectionPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1

  const equipment = useQuery({
    queryKey: ['equipment', 'detail', equipmentId],
    queryFn: () => getEquipmentById(equipmentId),
    enabled: Boolean(equipmentId),
  })
  const inspections = useQuery({
    queryKey: ['inspections', { equipment_id: equipmentId, page: inspectionPage }],
    queryFn: () => getInspections({ equipment_id: equipmentId, page: inspectionPage }),
    enabled: Boolean(equipmentId),
    placeholderData: keepPreviousData,
  })
  const firstInspectionPage = useQuery({
    queryKey: ['inspections', { equipment_id: equipmentId, page: 1 }],
    queryFn: () => getInspections({ equipment_id: equipmentId, page: 1 }),
    enabled: Boolean(equipmentId),
  })

  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  if (equipment.isPending) return <LoadingState message="장비 정보를 불러오는 중입니다…" />
  if (equipment.isError) {
    const status = equipment.error instanceof ApiError ? equipment.error.status : null
    return (
      <ErrorState
        title={status === 403 ? '조회 권한이 없습니다' : '장비 정보를 불러오지 못했습니다'}
        message={status === 404 ? '장비가 삭제되었거나 존재하지 않습니다.' : undefined}
        onRetry={status === 403 || status === 404 ? undefined : () => void equipment.refetch()}
        action={<Button asChild variant="outline"><Link to="/equipment">장비 목록으로</Link></Button>}
      />
    )
  }

  const item = equipment.data
  const latestCompleted = firstInspectionPage.data?.items.find((inspection) => inspection.status === 'COMPLETED')
  const tabs: TabItem<DetailTab>[] = [
    { value: 'info', label: '기본정보' },
    { value: 'inspections', label: '점검이력', count: inspections.data?.meta.total },
    { value: 'repairs', label: '수리이력' },
    { value: 'replacements', label: '교체이력' },
    { value: 'files', label: '첨부파일', count: item.photos.length },
  ]
  const inspectionEntryPath = `/inspections/new?equipment_id=${encodeURIComponent(item.id)}`

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title={item.name}
        badge={<EquipmentStatusBadge status={item.status} />}
        description={<>{EQUIPMENT_CATEGORY_LABELS[item.category]} · <span className="font-mono">{item.equipment_code}</span></>}
        backTo="/equipment"
        backLabel="장비 목록으로 돌아가기"
        actions={<>
          <Button asChild><Link to={inspectionEntryPath}><ClipboardPen aria-hidden="true" />점검 이력 추가</Link></Button>
          <Button type="button" variant="outline" disabled title="A/S(수리) 기능 준비 중입니다."><Wrench aria-hidden="true" />수리 이력 추가</Button>
          <Button asChild variant="outline"><Link to={`/equipment/${item.id}/history-card`}><FileText aria-hidden="true" />이력카드</Link></Button>
          {canWrite && <Button asChild variant="outline"><Link to={`/equipment/${item.id}/edit`}><Pencil aria-hidden="true" />수정</Link></Button>}
          {canWrite && <Button asChild variant="ghost" size="icon" title="다른 고객사에 복제" aria-label={`${item.name} 복제`}><Link to={`/equipment/${item.id}/copy`}><Copy aria-hidden="true" /></Link></Button>}
        </>}
      />

      <div className="overflow-hidden rounded-lg border bg-background">
        <DescriptionList
          columns={3}
          items={[
            { label: '고객사', value: <Link to={`/organizations?selected=${encodeURIComponent(item.organization_id)}`} className="font-medium text-primary underline-offset-4 hover:underline">{item.organization_name ?? '-'}</Link> },
            { label: '장비 담당 직원', value: item.assigned_user ? `${item.assigned_user.name}${item.assigned_user.active ? '' : ' (퇴사)'}` : null },
            { label: '최근 점검일', value: latestCompleted?.inspected_on ?? (firstInspectionPage.isPending ? '불러오는 중' : null) },
            { label: '점검주기', value: inspectionCycleLabel(item.inspection_cycle) },
            { label: '장비 코드', value: <span className="font-mono">{item.equipment_code}</span> },
            { label: '등록일', value: formatDate(item.created_at) },
          ]}
        />
      </div>

      <div className="flex flex-col gap-4">
        <Tabs
          items={tabs}
          value={tab}
          onValueChange={(value) => updateParams({ tab: value === 'info' ? null : value, page: null })}
          label="장비 상세 정보"
          idBase={TAB_ID}
        />

        <TabPanel idBase={TAB_ID} value={tab}>
          {tab === 'info' && <BasicInfoTab equipment={item} />}
          {tab === 'inspections' && (
            <Panel
              title="점검 이력"
              description="최신순으로 표시합니다. 항목을 눌러 점검일지를 확인합니다."
              actions={<Button asChild size="sm"><Link to={inspectionEntryPath}><ClipboardPen aria-hidden="true" />점검 이력 추가</Link></Button>}
              bodyClassName="p-4"
            >
              {inspections.isPending && <p role="status" className="text-sm text-muted-foreground">점검 이력을 불러오는 중입니다.</p>}
              {inspections.isError && <p role="alert" className="text-sm text-destructive">점검 이력을 불러오지 못했습니다.</p>}
              {inspections.data?.items.length === 0 && (
                <EmptyState icon={ClipboardCheck} title="등록된 점검 이력이 없습니다." className="py-6" />
              )}
              {inspections.data && inspections.data.items.length > 0 && (
                <div className="flex flex-col gap-4">
                  <Timeline label="점검 이력" items={inspections.data.items.map(toInspectionTimelineEntry)} />
                  {inspections.data.meta.last_page > 1 && (
                    <Pagination
                      label="점검 이력 페이지"
                      summary={`총 ${inspections.data.meta.total.toLocaleString('ko-KR')}건 · ${inspections.data.meta.current_page}/${inspections.data.meta.last_page} 페이지`}
                      page={inspections.data.meta.current_page}
                      lastPage={inspections.data.meta.last_page}
                      disabled={inspections.isFetching}
                      onChange={(page) => updateParams({ page: page > 1 ? String(page) : null })}
                    />
                  )}
                </div>
              )}
            </Panel>
          )}
          {tab === 'repairs' && (
            <Panel title="수리 이력" bodyClassName="p-4">
              <EmptyState
                icon={Wrench}
                title="등록된 수리 이력이 없습니다."
                description="A/S(수리) 이력 기능은 준비 중입니다. 기능이 제공되면 이 탭에 최신순으로 표시됩니다."
                className="py-6"
              />
            </Panel>
          )}
          {tab === 'replacements' && (
            <Panel title="교체 이력" bodyClassName="p-4">
              <EmptyState
                icon={RefreshCw}
                title="등록된 교체 이력이 없습니다."
                description="부품 교체 이력 기능은 준비 중입니다."
                className="py-6"
              />
            </Panel>
          )}
          {tab === 'files' && <FilesTab equipment={item} canWrite={canWrite} />}
        </TabPanel>
      </div>
    </section>
  )
}

function BasicInfoTab({ equipment }: { equipment: Equipment }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Panel title="장비 사양" description={`${equipment.attributes.length}개 항목`}>
        {equipment.attributes.length ? (
          <DescriptionList
            columns={2}
            items={equipment.attributes.map((attribute) => ({ key: attribute.id, label: attribute.label, value: attribute.value }))}
          />
        ) : <EmptyState title="등록된 사양이 없습니다." className="py-6" />}
      </Panel>
      <div className="flex flex-col gap-4">
        <Panel title="고객사 정보">
          <DescriptionList
            columns={1}
            items={[
              { label: '고객사명', value: equipment.organization_name },
              { label: '담당자', value: equipment.organization_contact_name },
              { label: '연락처', value: equipment.organization_contact_phone },
              { label: '주소', value: equipment.organization_address },
            ]}
          />
        </Panel>
        <Panel title="특이사항" bodyClassName="px-4 py-3">
          <p className="text-sm whitespace-pre-wrap">{equipment.specifics || '-'}</p>
        </Panel>
      </div>
    </div>
  )
}

function FilesTab({ equipment, canWrite }: { equipment: Equipment; canWrite: boolean }) {
  return (
    <Panel
      title="첨부파일"
      description="장비 사진"
      actions={canWrite && <Button asChild variant="outline" size="sm"><Link to={`/equipment/${equipment.id}/edit`}><Paperclip aria-hidden="true" />사진 관리</Link></Button>}
      bodyClassName="p-4"
    >
      {equipment.photos.length ? (
        <ul aria-label="장비 사진" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {equipment.photos.map((photo, index) => (
            <li key={photo.id}>
              <a href={photo.url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-md border focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                <img src={photo.url} alt={`${equipment.name} 장비 사진 ${index + 1}`} className="aspect-square w-full bg-muted object-cover transition-transform group-hover:scale-[1.02]" />
                <span className="flex justify-between gap-2 border-t px-2 py-1.5 text-xs text-muted-foreground">
                  <span>{formatDate(photo.created_at)}</span>
                  <span>{formatBytes(photo.size_bytes)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={ImageOff} title="등록된 첨부파일이 없습니다." className="py-6" />}
    </Panel>
  )
}

function toInspectionTimelineEntry(inspection: Inspection): TimelineEntry {
  const continueDraft = inspection.status === 'DRAFT' && inspection.can_edit
  return {
    id: inspection.id,
    date: inspection.inspected_on,
    title: '정기점검',
    tone: inspectionStatusTone(inspection),
    badge: <InspectionStatusBadge inspection={inspection} />,
    meta: <>점검자 {inspection.created_by.name ?? '-'}{inspection.completed_at && <> · 완료 {formatDate(inspection.completed_at)}</>}</>,
    description: inspection.remarks,
    action: (
      <Button asChild variant="ghost" size="sm">
        <Link to={continueDraft ? `/inspections/${inspection.id}` : `/inspections/${inspection.id}/report`}>
          {continueDraft ? '이어서 작성' : '점검일지 보기'}
        </Link>
      </Button>
    ),
  }
}

function formatBytes(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`
  return `${(size / 1024 / 1024).toFixed(1)}MB`
}

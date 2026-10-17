import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Building2, ClipboardList, FileText, MousePointerClick, Pencil, Plus, Server, Trash2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { z } from 'zod'

import { EmptyState } from '@/components/feedback/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { DescriptionList } from '@/components/ui/description-list'
import { Input, Label } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Panel } from '@/components/ui/panel'
import { SearchInput } from '@/components/ui/search-input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  deleteOrganization,
  deleteOrganizationMap,
  getOrganizations,
  organizationInputSchema,
  saveOrganization,
  uploadOrganizationMap,
  type Organization,
} from '../api/organizations'
import { EQUIPMENT_CATEGORY_LABELS, getEquipment, type Equipment } from '@/features/equipment/api/equipment'
import { EquipmentStatusBadge } from '@/features/equipment/components/EquipmentStatusBadge'

const queryKey = ['organizations'] as const
const pageSize = 12
type FormValues = z.infer<typeof organizationInputSchema>

export function OrganizationsPage() {
  const auth = useAuth()
  const canManage = auth.status === 'active' && auth.profile.role === 'ADMIN'
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('selected') ?? ''
  const [editing, setEditing] = useState<Organization | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const detailRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const organizations = useQuery({ queryKey, queryFn: getOrganizations })
  const equipment = useQuery({ queryKey: ['equipment', ''], queryFn: () => getEquipment() })

  function select(id: string | null) {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('selected', id)
    else next.delete('selected')
    setSearchParams(next, { replace: true })
  }

  const saveMutation = useMutation({
    mutationFn: async ({ values, image, id }: { values: FormValues; image: File | null; id?: string }) => {
      const organization = await saveOrganization({
        ...values,
        address: values.address?.trim() || null,
        contact_name: values.contact_name?.trim() || null,
        contact_phone: values.contact_phone?.trim() || null,
        contact_email: values.contact_email?.trim() || null,
      }, id)
      if (image) await uploadOrganizationMap(organization.id, image)
      return organization
    },
    onSuccess: async (organization, variables) => {
      setModalOpen(false)
      setEditing(null)
      setNotice(variables.image ? '고객사 정보와 지도 이미지를 저장했습니다.' : '고객사 정보를 저장했습니다.')
      select(organization.id)
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => setNotice(getMutationMessage(error)),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteOrganization,
    onSuccess: async () => {
      setModalOpen(false)
      setEditing(null)
      setNotice('고객사를 삭제했습니다.')
      select(null)
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => setNotice(getMutationMessage(error)),
  })
  const deleteMapMutation = useMutation({
    mutationFn: deleteOrganizationMap,
    onSuccess: async (_, id) => {
      setEditing((current) => current?.id === id ? { ...current, map_image_url: null } : current)
      setNotice('지도 이미지를 삭제했습니다.')
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => setNotice(getMutationMessage(error)),
  })

  const equipmentByOrganization = useMemo(() => {
    const grouped = new Map<string, Equipment[]>()
    for (const item of equipment.data ?? []) {
      grouped.set(item.organization_id, [...(grouped.get(item.organization_id) ?? []), item])
    }
    return grouped
  }, [equipment.data])
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return (organizations.data ?? []).filter((organization) => !query || [
      organization.name,
      organization.address ?? '',
      organization.contact_name ?? '',
      organization.contact_phone ?? '',
    ].some((value) => value.toLocaleLowerCase().includes(query)))
  }, [organizations.data, search])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleOrganizations = filtered.slice((page - 1) * pageSize, page * pageSize)
  const selected = organizations.data?.find((organization) => organization.id === selectedId) ?? null

  function startCreate() {
    setEditing(null)
    setNotice(null)
    setModalOpen(true)
  }

  function startEdit(organization: Organization) {
    setEditing(organization)
    setNotice(null)
    setModalOpen(true)
  }

  function remove(organization: Organization) {
    if (window.confirm(`'${organization.name}' 고객사를 삭제할까요?`)) {
      setNotice(null)
      deleteMutation.mutate(organization.id)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title="고객사"
        description="고객사를 선택하면 보유 장비와 상태를 바로 확인할 수 있습니다."
        actions={canManage && <Button type="button" onClick={startCreate}><Plus aria-hidden="true" />고객사 등록</Button>}
      />

      {notice && <p role="status" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">{notice}</p>}
      {organizations.isPending && <p role="status" className="text-sm text-muted-foreground">고객사 목록을 불러오는 중입니다.</p>}
      {organizations.isError && <p role="alert" className="text-sm text-destructive">고객사 목록을 불러오지 못했습니다.</p>}
      {equipment.isError && <p role="alert" className="text-sm text-destructive">연결 장비 목록을 불러오지 못했습니다.</p>}

      {organizations.data && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Panel title="고객사 목록" description={`${organizations.data.length.toLocaleString('ko-KR')}개 고객사`} bodyClassName="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="organization-search">고객사 검색</Label>
              <SearchInput id="organization-search" value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1) }} placeholder="고객사, 담당자, 연락처, 주소" />
            </div>

            {organizations.data.length === 0 && <EmptyState icon={Building2} title="등록된 고객사가 없습니다." className="py-6" />}
            {organizations.data.length > 0 && filtered.length === 0 && <EmptyState title="검색 결과가 없습니다." className="py-6" />}

            {visibleOrganizations.length > 0 && (
              <>
                <Table aria-label="고객사 목록">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>고객사명</TableHead>
                      <TableHead>담당자</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead className="text-right">장비</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleOrganizations.map((organization) => {
                      const isSelected = organization.id === selectedId
                      return (
                        <TableRow key={organization.id} data-state={isSelected ? 'selected' : undefined} className="cursor-pointer" onClick={() => select(organization.id)}>
                          <TableCell className="max-w-56">
                            <Link
                              to={`?selected=${encodeURIComponent(organization.id)}`}
                              replace
                              aria-current={isSelected ? 'true' : undefined}
                              onClick={(event) => {
                                event.stopPropagation()
                                if (window.innerWidth < 1024) detailRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
                              }}
                              className={cn('block truncate font-medium underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', isSelected && 'text-primary')}
                            >
                              {organization.name}
                            </Link>
                            <span className="block truncate text-xs text-muted-foreground">{organization.address || '-'}</span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{organization.contact_name || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{organization.contact_phone || '-'}</TableCell>
                          <TableCell className="text-right tabular-nums">{equipmentByOrganization.get(organization.id)?.length ?? 0}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <Pagination
                  label="고객사 목록 페이지"
                  summary={`${filtered.length}개 고객사 · ${page}/${totalPages} 페이지`}
                  page={page}
                  lastPage={totalPages}
                  onChange={setPage}
                />
              </>
            )}
          </Panel>

          <div ref={detailRef} className="scroll-mt-20 lg:sticky lg:top-20">
            {selected ? (
              <OrganizationDetail
                organization={selected}
                equipment={equipmentByOrganization.get(selected.id) ?? []}
                equipmentLoading={equipment.isPending}
                canManage={canManage}
                onEdit={() => startEdit(selected)}
              />
            ) : (
              <div className="rounded-lg border border-dashed bg-background">
                <EmptyState icon={MousePointerClick} title="고객사를 선택하세요." description="목록에서 고객사를 선택하면 연락처와 보유 장비가 여기에 표시됩니다." />
              </div>
            )}
          </div>
        </div>
      )}

      {canManage && <OrganizationDialog
        key={editing?.id ?? 'new'}
        open={modalOpen}
        organization={editing}
        saving={saveMutation.isPending}
        deletingMap={deleteMapMutation.isPending}
        onOpenChange={setModalOpen}
        onSubmit={(values, image) => saveMutation.mutate({ values, image, id: editing?.id })}
        onDeleteMap={() => editing && deleteMapMutation.mutate(editing.id)}
        onDelete={() => editing && remove(editing)}
      />}
    </section>
  )
}

function OrganizationDetail({ organization, equipment, equipmentLoading, canManage, onEdit }: {
  organization: Organization
  equipment: Equipment[]
  equipmentLoading: boolean
  canManage: boolean
  onEdit: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={organization.name}
        description="고객사 정보"
        actions={<>
          <Button asChild variant="ghost" size="icon" title="고객사 장비이력카드 일괄 인쇄" aria-label={`${organization.name} 장비이력카드`}>
            <Link to={`/organizations/${organization.id}/equipment-history-card`}><ClipboardList aria-hidden="true" /></Link>
          </Button>
          {canManage && <Button type="button" variant="ghost" size="icon" title="고객사 수정" aria-label={`${organization.name} 수정`} onClick={onEdit}>
            <Pencil aria-hidden="true" />
          </Button>}
        </>}
      >
        <div className="grid sm:grid-cols-[minmax(0,1fr)_auto]">
          <DescriptionList
            columns={1}
            items={[
              { label: '담당자', value: organization.contact_name },
              { label: '연락처', value: organization.contact_phone },
              { label: '이메일', value: organization.contact_email },
              { label: '주소', value: organization.address },
            ]}
          />
          {organization.map_image_url && (
            <a href={organization.map_image_url} target="_blank" rel="noreferrer" className="block border-t p-2 sm:border-t-0 sm:border-l">
              <img src={organization.map_image_url} alt={`${organization.name} 지도 캡처`} className="h-28 w-full max-w-48 rounded object-contain" />
            </a>
          )}
        </div>
      </Panel>

      <Panel
        title="보유 장비"
        description={`${equipment.length}대`}
        actions={equipment.length > 0 && <Button asChild variant="ghost" size="sm"><Link to={`/equipment?organization_id=${encodeURIComponent(organization.id)}`}>장비 목록에서 보기</Link></Button>}
      >
        {equipmentLoading ? <p role="status" className="p-4 text-sm text-muted-foreground">장비 목록을 불러오는 중입니다.</p> : equipment.length === 0 ? (
          <EmptyState icon={Server} title="연결된 장비가 없습니다." className="py-6" />
        ) : (
          <Table aria-label={`${organization.name} 보유 장비`} containerClassName="rounded-none border-0">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24">상태</TableHead>
                <TableHead>장비명 / 코드</TableHead>
                <TableHead>종류</TableHead>
                <TableHead>담당 직원</TableHead>
                <TableHead className="text-right"><span className="sr-only">이력카드</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><EquipmentStatusBadge status={item.status} /></TableCell>
                  <TableCell>
                    <Link to={`/equipment/${item.id}`} className="font-medium underline-offset-4 hover:text-primary hover:underline">{item.name}</Link>
                    <span className="block font-mono text-xs text-muted-foreground">{item.equipment_code}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{EQUIPMENT_CATEGORY_LABELS[item.category]}</TableCell>
                  <TableCell className="whitespace-nowrap">{item.assigned_user?.name || '-'}</TableCell>
                  <TableCell className="py-1 text-right">
                    <Button asChild variant="ghost" size="icon" title="장비이력카드" aria-label={`${item.name} 이력카드`}>
                      <Link to={`/equipment/${item.id}/history-card`}><FileText aria-hidden="true" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  )
}

function OrganizationDialog({
  open,
  organization,
  saving,
  deletingMap,
  onOpenChange,
  onSubmit,
  onDeleteMap,
  onDelete,
}: {
  open: boolean
  organization: Organization | null
  saving: boolean
  deletingMap: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: FormValues, image: File | null) => void
  onDeleteMap: () => void
  onDelete: () => void
}) {
  const [mapFile, setMapFile] = useState<File | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(organizationInputSchema),
    defaultValues: {
      name: organization?.name ?? '',
      address: organization?.address ?? '',
      contact_name: organization?.contact_name ?? '',
      contact_phone: organization?.contact_phone ?? '',
      contact_email: organization?.contact_email ?? '',
    },
  })

  return <Dialog.Root open={open} onOpenChange={(nextOpen) => {
    if (!nextOpen) setMapFile(null)
    onOpenChange(nextOpen)
  }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border bg-background shadow-lg">
        <div className="border-b px-5 py-4">
          <Dialog.Title className="text-lg font-semibold">{organization ? '고객사 수정' : '고객사 등록'}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">고객사 정보와 지도 캡처를 관리합니다.</Dialog.Description>
        </div>
        <form noValidate className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(event) => void handleSubmit((values) => onSubmit(values, mapFile))(event)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="organization-name">고객사명</Label>
            <Input id="organization-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">고객사명을 입력하세요.</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="organization-contact-name">담당자</Label>
            <Input id="organization-contact-name" autoComplete="name" {...register('contact_name')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="organization-contact-phone">연락처</Label>
            <Input id="organization-contact-phone" type="tel" autoComplete="tel" {...register('contact_phone')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="organization-contact-email">담당자 이메일</Label>
            <Input id="organization-contact-email" type="email" autoComplete="email" aria-invalid={Boolean(errors.contact_email)} {...register('contact_email')} />
            {errors.contact_email && <p className="text-sm text-destructive">이메일 형식을 확인하세요.</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="organization-address">주소</Label>
            <Input id="organization-address" autoComplete="street-address" {...register('address')} />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="organization-map">지도 캡처 (PNG/JPG/WebP, 최대 10MB)</Label>
            <Input id="organization-map" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setMapFile(event.currentTarget.files?.[0] ?? null)} />
            {mapFile && <p className="text-xs text-muted-foreground">새 이미지: {mapFile.name}</p>}
            {organization?.map_image_url && <div className="flex items-center gap-3">
              <img src={organization.map_image_url} alt={`${organization.name} 지도 캡처`} className="max-h-36 max-w-full rounded border object-contain" />
              <Button type="button" variant="ghost" size="icon" title="지도 캡처 삭제" aria-label="지도 캡처 삭제" disabled={deletingMap} onClick={onDeleteMap}><Trash2 aria-hidden="true" /></Button>
            </div>}
          </div>

          <div className="flex flex-wrap justify-between gap-2 border-t pt-4 sm:col-span-2">
            <div>{organization && <Button type="button" variant="destructive" onClick={onDelete}>고객사 삭제</Button>}</div>
            <div className="flex gap-2">
              <Dialog.Close asChild><Button type="button" variant="outline">취소</Button></Dialog.Close>
              <Button type="submit" disabled={saving}><Plus aria-hidden="true" />{saving ? '저장 중' : '저장'}</Button>
            </div>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}

function getMutationMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) return '변경 권한이 없습니다.'
  if (error instanceof ApiError && error.status === 422) return '입력값을 확인해 주세요. 지도 이미지는 PNG, JPG, WebP 형식이어야 하며 10MB 이하여야 합니다.'
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

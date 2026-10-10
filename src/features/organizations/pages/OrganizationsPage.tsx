import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Building2, ChevronLeft, ChevronRight, ClipboardList, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { ApiError } from '@/lib/api/client'
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
import { getEquipment } from '@/features/equipment/api/equipment'

const queryKey = ['organizations'] as const
const pageSize = 12
type FormValues = z.infer<typeof organizationInputSchema>

export function OrganizationsPage() {
  const auth = useAuth()
  const canManage = auth.status === 'active' && auth.profile.role === 'ADMIN'
  const [editing, setEditing] = useState<Organization | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const organizations = useQuery({ queryKey, queryFn: getOrganizations })
  const equipment = useQuery({ queryKey: ['equipment'], queryFn: () => getEquipment() })

  const saveMutation = useMutation({
    mutationFn: async ({ values, image, id }: { values: FormValues; image: File | null; id?: string }) => {
      const organization = await saveOrganization({
        ...values,
        address: values.address?.trim() || null,
        contact_name: values.contact_name?.trim() || null,
        contact_phone: values.contact_phone?.trim() || null,
      }, id)
      if (image) await uploadOrganizationMap(organization.id, image)
      return organization
    },
    onSuccess: async (_organization, variables) => {
      setModalOpen(false)
      setEditing(null)
      setNotice(variables.image ? '고객사 정보와 지도 이미지를 저장했습니다.' : '고객사 정보를 저장했습니다.')
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => setNotice(getMutationMessage(error)),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteOrganization,
    onSuccess: async () => {
      setNotice('고객사를 삭제했습니다.')
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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">고객사</h1>
          <p className="mt-1 text-sm text-muted-foreground">고객사와 설치 장비 정보를 관리합니다.</p>
        </div>
        {canManage && <Button type="button" onClick={startCreate}><Plus aria-hidden="true" />고객사 등록</Button>}
      </header>

      <div className="flex flex-col gap-2 sm:max-w-md">
        <Label htmlFor="organization-search">고객사 검색</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="organization-search" value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1) }} className="pl-9" placeholder="고객사, 담당자, 연락처, 주소" />
        </div>
      </div>

      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      {organizations.isPending && <p role="status">고객사 목록을 불러오는 중입니다.</p>}
      {organizations.isError && <p role="alert" className="text-sm text-destructive">고객사 목록을 불러오지 못했습니다.</p>}
      {equipment.isError && <p role="alert" className="text-sm text-destructive">연결 장비 목록을 불러오지 못했습니다.</p>}

      {organizations.data?.length === 0 && (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Building2 className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">등록된 고객사가 없습니다.</p>
        </CardContent></Card>
      )}
      {organizations.data && organizations.data.length > 0 && filtered.length === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</CardContent></Card>
      )}

      {visibleOrganizations.length > 0 && (
        <>
          <ul aria-label="고객사 목록" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {visibleOrganizations.map((organization) => {
              const linkedEquipment = (equipment.data ?? []).filter((item) => item.organization_id === organization.id)
              return <li key={organization.id}>
                <Card className="flex h-full min-h-56 flex-col overflow-hidden rounded-md">
                  <div className="flex min-h-12 items-center justify-between gap-2 border-b px-4 py-2">
                    <h2 className="min-w-0 truncate text-sm font-semibold" title={organization.name}>{organization.name}</h2>
                    <div className="flex shrink-0 items-center">
                      <Button asChild variant="ghost" size="icon" title="고객사 장비이력카드" aria-label={`${organization.name} 장비이력카드`}>
                        <Link to={`/organizations/${organization.id}/equipment-history-card`}><ClipboardList aria-hidden="true" /></Link>
                      </Button>
                      {canManage && <Button type="button" variant="ghost" size="icon" title="고객사 수정" aria-label={`${organization.name} 수정`} onClick={() => startEdit(organization)}>
                        <Pencil aria-hidden="true" />
                      </Button>}
                    </div>
                  </div>
                  <CardContent className="flex flex-1 flex-col gap-2 p-4 text-sm">
                    <p className="truncate"><span className="text-muted-foreground">담당자 </span>{organization.contact_name || '-'}</p>
                    <p className="truncate"><span className="text-muted-foreground">연락처 </span>{organization.contact_phone || '-'}</p>
                    <p className="line-clamp-2 min-h-10 break-words"><span className="text-muted-foreground">주소 </span>{organization.address || '-'}</p>
                    <div className="mt-auto border-t pt-2">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">연결 장비 ({linkedEquipment.length})</p>
                      {linkedEquipment.length ? <ul className="max-h-20 space-y-1 overflow-y-auto">
                        {linkedEquipment.map((item) => <li key={item.id}>
                          <Link to={`/equipment/${item.id}/edit`} className="block truncate text-xs underline underline-offset-2">
                            {item.name} · {item.equipment_code}
                          </Link>
                        </li>)}
                      </ul> : <p className="text-xs text-muted-foreground">연결된 장비 없음</p>}
                    </div>
                  </CardContent>
                </Card>
              </li>
            })}
          </ul>

          <footer className="flex items-center justify-between gap-3 border-t pt-3">
            <p className="text-sm text-muted-foreground">{filtered.length}개 고객사 · {page} / {totalPages} 페이지</p>
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="icon" aria-label="이전 페이지" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft aria-hidden="true" /></Button>
              <Button type="button" variant="outline" size="icon" aria-label="다음 페이지" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight aria-hidden="true" /></Button>
            </div>
          </footer>
        </>
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
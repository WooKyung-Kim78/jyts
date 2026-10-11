import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Copy, FileText, Pencil, Plus, Server } from 'lucide-react'

import { EmptyState } from '@/components/feedback/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { SearchInput } from '@/components/ui/search-input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getOrganizations } from '@/features/organizations/api/organizations'
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_LABELS,
  getEquipment,
  inspectionCycleLabel,
  type Equipment,
  type EquipmentCategory,
  type EquipmentStatus,
} from '../api/equipment'
import { EquipmentStatusBadge } from '../components/EquipmentStatusBadge'

const queryKey = ['equipment'] as const

function parseOption<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return allowed.find((item) => item === value) ?? ''
}

export function EquipmentPage() {
  const auth = useAuth()
  const canWrite = auth.status === 'active' && ['ADMIN', 'USER'].includes(auth.profile.role)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const organizationId = searchParams.get('organization_id') ?? ''
  const category = parseOption<EquipmentCategory>(searchParams.get('category'), EQUIPMENT_CATEGORIES)
  const status = parseOption<EquipmentStatus>(searchParams.get('status'), EQUIPMENT_STATUSES)
  const search = searchParams.get('q') ?? ''
  const organizations = useQuery({ queryKey: ['organizations'], queryFn: getOrganizations })
  const equipment = useQuery({ queryKey: [...queryKey, organizationId], queryFn: () => getEquipment(organizationId) })
  const hasFilters = Boolean(organizationId || category || status || search)

  const statusCounts = useMemo(() => {
    const counts: Record<EquipmentStatus, number> = { ACTIVE: 0, INSPECTION_REQUIRED: 0, OUT_OF_SERVICE: 0, DISPOSED: 0 }
    for (const item of equipment.data ?? []) counts[item.status] += 1
    return counts
  }, [equipment.data])

  const filteredEquipment = useMemo(() => (equipment.data ?? []).filter((item) => {
    if (category && item.category !== category) return false
    if (status && item.status !== status) return false
    const searchText = search.trim().toLocaleLowerCase()
    return !searchText || [item.equipment_code, item.name, item.organization_name ?? '', item.assigned_user?.name ?? '']
      .some((value) => value.toLocaleLowerCase().includes(searchText))
  }), [equipment.data, category, status, search])

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title="장비"
        description="고객사에 설치된 장비를 검색하고 상태와 이력을 확인합니다."
        actions={canWrite && <Button asChild><Link to="/equipment/new"><Plus aria-hidden="true" />장비 등록</Link></Button>}
      />

      <div role="search" aria-label="장비 검색 및 필터" className="grid gap-3 rounded-lg border bg-background p-4 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="equipment-search">검색</Label>
          <SearchInput id="equipment-search" value={search} onChange={(event) => updateParam('q', event.currentTarget.value)} placeholder="장비명, 장비 코드, 고객사, 담당 직원" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="equipment-customer-filter">고객사</Label>
          <NativeSelect id="equipment-customer-filter" value={organizationId} onChange={(event) => updateParam('organization_id', event.currentTarget.value)}>
            <option value="">전체 고객사</option>
            {(organizations.data ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="equipment-category-filter">장비 종류</Label>
          <NativeSelect id="equipment-category-filter" value={category} onChange={(event) => updateParam('category', event.currentTarget.value)}>
            <option value="">전체 종류</option>
            {EQUIPMENT_CATEGORIES.map((value) => <option key={value} value={value}>{EQUIPMENT_CATEGORY_LABELS[value]}</option>)}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="equipment-status-filter">상태</Label>
          <NativeSelect id="equipment-status-filter" value={status} onChange={(event) => updateParam('status', event.currentTarget.value)}>
            <option value="">전체 상태</option>
            {EQUIPMENT_STATUSES.map((value) => <option key={value} value={value}>{EQUIPMENT_STATUS_LABELS[value]} ({statusCounts[value]})</option>)}
          </NativeSelect>
        </div>
      </div>

      {equipment.isPending && <p role="status" className="text-sm text-muted-foreground">장비 목록을 불러오는 중입니다.</p>}
      {equipment.isError && <p role="alert" className="text-sm text-destructive">장비 목록을 불러오지 못했습니다.</p>}

      {equipment.data && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="font-semibold text-foreground tabular-nums">{filteredEquipment.length.toLocaleString('ko-KR')}</span>대
            {hasFilters && <> / 전체 {equipment.data.length.toLocaleString('ko-KR')}대</>}
          </p>
          {hasFilters && <Button type="button" variant="ghost" size="sm" onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}>필터 초기화</Button>}
        </div>
      )}

      {equipment.data && filteredEquipment.length === 0 && (
        <div className="rounded-lg border bg-background">
          <EmptyState
            icon={Server}
            title={equipment.data.length ? '검색 조건에 맞는 장비가 없습니다.' : '등록된 장비가 없습니다.'}
            action={canWrite && !equipment.data.length && <Button asChild variant="outline"><Link to="/equipment/new"><Plus aria-hidden="true" />장비 등록</Link></Button>}
          />
        </div>
      )}

      {filteredEquipment.length > 0 && (
        <>
          <Table containerClassName="hidden md:block" className="min-w-[1040px]" aria-label="장비 목록">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24">상태</TableHead>
                <TableHead>장비명 / 코드</TableHead>
                <TableHead>장비 종류</TableHead>
                <TableHead>점검주기</TableHead>
                <TableHead>고객사</TableHead>
                <TableHead>장비 담당 직원</TableHead>
                <TableHead>고객사 담당자</TableHead>
                <TableHead>주소</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipment.map((item) => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/equipment/${item.id}`)}>
                  <TableCell><EquipmentStatusBadge status={item.status} /></TableCell>
                  <TableCell>
                    <Link to={`/equipment/${item.id}`} onClick={(event) => event.stopPropagation()} className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                      {item.name}
                    </Link>
                    <span className="block font-mono text-xs text-muted-foreground">{item.equipment_code}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{EQUIPMENT_CATEGORY_LABELS[item.category]}</TableCell>
                  <TableCell className="whitespace-nowrap">{inspectionCycleLabel(item.inspection_cycle)}</TableCell>
                  <TableCell className="max-w-48 truncate">{item.organization_name}</TableCell>
                  <TableCell className="whitespace-nowrap">{item.assigned_user?.name || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap">{item.organization_contact_name || '-'}</TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">{item.organization_address || '-'}</TableCell>
                  <TableCell className="py-1.5" onClick={(event) => event.stopPropagation()}>
                    <EquipmentRowActions item={item} canWrite={canWrite} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <ul aria-label="장비 목록" className="divide-y rounded-lg border bg-background md:hidden">
            {filteredEquipment.map((item) => <li key={item.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/equipment/${item.id}`} className="block truncate font-medium underline-offset-4 hover:underline">{item.name}</Link>
                  <p className="text-sm text-muted-foreground">{item.organization_name} · {EQUIPMENT_CATEGORY_LABELS[item.category]}</p>
                </div>
                <EquipmentStatusBadge status={item.status} className="shrink-0" />
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">점검주기</dt><dd>{inspectionCycleLabel(item.inspection_cycle)}</dd>
                <dt className="text-muted-foreground">장비 담당 직원</dt><dd>{item.assigned_user?.name || '-'}</dd>
                <dt className="text-muted-foreground">고객사 담당자</dt><dd>{item.organization_contact_name || '-'}</dd>
                <dt className="text-muted-foreground">주소</dt><dd className="break-words">{item.organization_address || '-'}</dd>
              </dl>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs text-muted-foreground">{item.equipment_code}</p>
                <EquipmentRowActions item={item} canWrite={canWrite} />
              </div>
            </li>)}
          </ul>
        </>
      )}
    </section>
  )
}

function EquipmentRowActions({ item, canWrite }: { item: Equipment; canWrite: boolean }) {
  return (
    <div className="flex justify-end gap-0.5">
      {canWrite && <Button asChild variant="ghost" size="icon" title="장비 수정" aria-label={`${item.name} 수정`}><Link to={`/equipment/${item.id}/edit`}><Pencil aria-hidden="true" /></Link></Button>}
      {canWrite && <Button asChild variant="ghost" size="icon" title="다른 고객사에 복제" aria-label={`${item.name} 복제`}><Link to={`/equipment/${item.id}/copy`}><Copy aria-hidden="true" /></Link></Button>}
      <Button asChild variant="ghost" size="icon" title="장비이력카드" aria-label={`${item.name} 이력카드`}><Link to={`/equipment/${item.id}/history-card`}><FileText aria-hidden="true" /></Link></Button>
    </div>
  )
}

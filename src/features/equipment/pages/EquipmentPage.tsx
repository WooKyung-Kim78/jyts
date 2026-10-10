import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Copy, FileText, Pencil, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getOrganizations } from '@/features/organizations/api/organizations'
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_LABELS,
  getEquipment,
  type EquipmentCategory,
} from '../api/equipment'

const queryKey = ['equipment'] as const

export function EquipmentPage() {
  const auth = useAuth()
  const canWrite = auth.status === 'active' && ['ADMIN', 'USER'].includes(auth.profile.role)
  const [searchParams, setSearchParams] = useSearchParams()
  const organizationId = searchParams.get('organization_id') ?? ''
  const [category, setCategory] = useState<EquipmentCategory | ''>('')
  const [search, setSearch] = useState('')
  const organizations = useQuery({ queryKey: ['organizations'], queryFn: getOrganizations })
  const equipment = useQuery({ queryKey: [...queryKey, organizationId], queryFn: () => getEquipment(organizationId) })

  const filteredEquipment = useMemo(() => (equipment.data ?? []).filter((item) => {
    if (category && item.category !== category) return false
    const searchText = search.trim().toLocaleLowerCase()
    return !searchText || [item.equipment_code, item.name, item.organization_name ?? '']
      .some((value) => value.toLocaleLowerCase().includes(searchText))
  }), [equipment.data, category, search])

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">장비</h1>
          <p className="mt-1 text-sm text-muted-foreground">고객사에 설치된 장비 목록입니다.</p>
        </div>
        {canWrite && <Button asChild><Link to="/equipment/new"><Plus aria-hidden="true" />장비 등록</Link></Button>}
      </header>

      <div className="grid gap-3 rounded-md border bg-background p-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="equipment-customer-filter">고객사</Label>
          <select id="equipment-customer-filter" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={organizationId} onChange={(event) => {
            const next = new URLSearchParams(searchParams)
            if (event.currentTarget.value) next.set('organization_id', event.currentTarget.value)
            else next.delete('organization_id')
            setSearchParams(next, { replace: true })
          }}>
            <option value="">전체 고객사</option>
            {(organizations.data ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="equipment-category-filter">장비 카테고리</Label>
          <select id="equipment-category-filter" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={category} onChange={(event) => setCategory(event.currentTarget.value as EquipmentCategory | '')}>
            <option value="">전체 카테고리</option>
            {EQUIPMENT_CATEGORIES.map((value) => <option key={value} value={value}>{EQUIPMENT_CATEGORY_LABELS[value]}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="equipment-search">검색</Label>
          <Input id="equipment-search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="장비명, 코드, 고객사" />
        </div>
      </div>

      {equipment.isPending && <p role="status">장비 목록을 불러오는 중입니다.</p>}
      {equipment.isError && <p role="alert" className="text-sm text-destructive">장비 목록을 불러오지 못했습니다.</p>}
      {equipment.data && filteredEquipment.length === 0 && (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <ClipboardList className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{equipment.data.length ? '검색 조건에 맞는 장비가 없습니다.' : '등록된 장비가 없습니다.'}</p>
          {canWrite && <Button asChild variant="outline"><Link to="/equipment/new"><Plus aria-hidden="true" />장비 등록</Link></Button>}
        </CardContent></Card>
      )}

      {filteredEquipment.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-md border bg-background md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">고객사</th>
                  <th className="px-4 py-3 font-medium">카테고리 / 장비명</th>
                  <th className="px-4 py-3 font-medium">고객사 담당자</th>
                  <th className="px-4 py-3 font-medium">장비 담당 직원</th>
                  <th className="px-4 py-3 font-medium">주소</th>
                  <th className="px-4 py-3 font-medium">장비 코드</th>
                  <th className="px-4 py-3 text-right font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEquipment.map((item) => <tr key={item.id}>
                  <td className="max-w-48 truncate px-4 py-3 font-medium">{item.organization_name}</td>
                  <td className="px-4 py-3"><span className="text-muted-foreground">{EQUIPMENT_CATEGORY_LABELS[item.category]}</span><span className="mx-2 text-muted-foreground">/</span>{item.name}</td>
                  <td className="px-4 py-3">{item.organization_contact_name || '-'}</td>
                  <td className="px-4 py-3">{item.assigned_user?.name || '-'}</td>
                  <td className="max-w-64 truncate px-4 py-3">{item.organization_address || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{item.equipment_code}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      {canWrite && <Button asChild variant="ghost" size="icon" title="장비 수정" aria-label={`${item.name} 수정`}><Link to={`/equipment/${item.id}/edit`}><Pencil aria-hidden="true" /></Link></Button>}
                      {canWrite && <Button asChild variant="ghost" size="icon" title="다른 고객사에 복제" aria-label={`${item.name} 복제`}><Link to={`/equipment/${item.id}/copy`}><Copy aria-hidden="true" /></Link></Button>}
                      <Button asChild variant="ghost" size="icon" title="장비이력카드" aria-label={`${item.name} 이력카드`}><Link to={`/equipment/${item.id}/history-card`}><FileText aria-hidden="true" /></Link></Button>
                    </div>
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>

          <ul className="divide-y rounded-md border bg-background md:hidden">
            {filteredEquipment.map((item) => <li key={item.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.organization_name} · {EQUIPMENT_CATEGORY_LABELS[item.category]}</p>
                </div>
                {canWrite && <div className="flex shrink-0">
                  <Button asChild variant="ghost" size="icon" aria-label={`${item.name} 수정`}><Link to={`/equipment/${item.id}/edit`}><Pencil aria-hidden="true" /></Link></Button>
                  <Button asChild variant="ghost" size="icon" aria-label={`${item.name} 복제`}><Link to={`/equipment/${item.id}/copy`}><Copy aria-hidden="true" /></Link></Button>
                  <Button asChild variant="ghost" size="icon" aria-label={`${item.name} 이력카드`}><Link to={`/equipment/${item.id}/history-card`}><FileText aria-hidden="true" /></Link></Button>
                </div>}
              </div>
              <p className="text-sm">고객사 담당자: {item.organization_contact_name || '-'}</p>
              <p className="text-sm">장비 담당 직원: {item.assigned_user?.name || '-'}</p>
              <p className="text-sm text-muted-foreground">주소: {item.organization_address || '-'}</p>
              <p className="font-mono text-xs text-muted-foreground">{item.equipment_code}</p>
            </li>)}
          </ul>
        </>
      )}
    </section>
  )
}
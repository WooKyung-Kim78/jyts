import { Link, useNavigate, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardPen } from 'lucide-react'

import { EmptyState } from '@/components/feedback/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EQUIPMENT_CATEGORY_LABELS, getEquipment, inspectionCycleLabel } from '@/features/equipment/api/equipment'
import { getAllInspections, inspectionStatusLabel } from '@/features/inspections/api/inspections'
import { InspectionStatusBadge } from '@/features/inspections/components/InspectionStatusBadge'
import { buildMonthlyRows, currentMonth, parseMonth, shiftMonth, splitMonth, type MonthlyInspectionRow } from '../monthly-inspections'

const NOT_INSPECTED = '미점검'
const PAGE_SIZE = 30

function inspectionEntryPath({ equipment, inspection }: MonthlyInspectionRow): string {
  return inspection
    ? `/inspections/${inspection.id}/report`
    : `/inspections/new?equipment_id=${encodeURIComponent(equipment.id)}`
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const month = parseMonth(searchParams.get('month')) ?? currentMonth()
  const search = searchParams.get('q') ?? ''
  const requestedPage = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const [year, monthNumber] = splitMonth(month)

  const equipment = useQuery({ queryKey: ['equipment', ''], queryFn: () => getEquipment() })
  const inspections = useQuery({
    queryKey: ['inspections', 'year', year],
    queryFn: () => getAllInspections({ inspected_from: `${year}-01-01`, inspected_to: `${year}-12-31` }),
  })

  const rows = equipment.data && inspections.data ? buildMonthlyRows(equipment.data, inspections.data, month) : []
  const query = search.trim().toLocaleLowerCase()
  const filteredRows = query ? rows.filter((row) => searchText(row).toLocaleLowerCase().includes(query)) : rows
  const lastPage = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, lastPage) : 1
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const counts = {
    total: rows.length,
    completed: rows.filter(({ inspection }) => inspection?.status === 'COMPLETED').length,
    draft: rows.filter(({ inspection }) => inspection?.status === 'DRAFT').length,
    pending: rows.filter(({ inspection }) => !inspection).length,
    bad: rows.filter(({ inspection }) => inspection?.has_bad_result).length,
  }
  const loading = equipment.isPending || inspections.isPending
  const failed = equipment.isError || inspections.isError

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="대시보드"
        description="월별 정기점검 대상 장비와 점검 상태를 확인합니다."
        actions={<Button asChild><Link to="/inspections/new"><ClipboardPen aria-hidden="true" />정기점검 입력</Link></Button>}
      />

      <div role="search" aria-label="정기점검 월 및 검색" className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dashboard-month">점검 월</Label>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon" aria-label="이전 달" onClick={() => updateParam('month', shiftMonth(month, -1))}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Input
              id="dashboard-month"
              type="month"
              value={month}
              className="w-40 bg-background"
              onChange={(event) => {
                const value = parseMonth(event.currentTarget.value)
                if (value) updateParam('month', value)
              }}
            />
            <Button type="button" variant="outline" size="icon" aria-label="다음 달" onClick={() => updateParam('month', shiftMonth(month, 1))}>
              <ChevronRight aria-hidden="true" />
            </Button>
            {month !== currentMonth() && <Button type="button" variant="ghost" size="sm" onClick={() => updateParam('month', null)}>이번 달</Button>}
          </div>
        </div>
        <div className="flex min-w-60 flex-1 flex-col gap-1.5">
          <Label htmlFor="dashboard-search">검색</Label>
          <SearchInput
            id="dashboard-search"
            value={search}
            onChange={(event) => updateParam('q', event.currentTarget.value)}
            placeholder="고객사, 장비 종류, 장비명, 점검자, 점검 상태, 점검주기"
          />
        </div>
      </div>

      {failed && <p role="alert" className="text-sm text-destructive">정기점검 현황을 불러오지 못했습니다.</p>}

      <section aria-labelledby="monthly-inspection-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="monthly-inspection-heading" className="text-base font-semibold">{year}년 {monthNumber}월 정기점검</h2>
          {!loading && !failed && (
            <ul aria-label="점검 현황 요약" className="flex flex-wrap items-center gap-1.5 text-xs">
              <li><Badge tone="info">대상 {counts.total}</Badge></li>
              <li><Badge tone="success">완료 {counts.completed}</Badge></li>
              <li><Badge tone="warning">작성 중 {counts.draft}</Badge></li>
              <li><Badge tone="neutral">{NOT_INSPECTED} {counts.pending}</Badge></li>
              <li><Badge tone="danger">불량 {counts.bad}</Badge></li>
            </ul>
          )}
        </div>

        {loading && <p className="text-sm text-muted-foreground">정기점검 현황을 불러오는 중입니다.</p>}
        {!loading && !failed && filteredRows.length === 0 && (
          <div className="rounded-lg border bg-background">
            <EmptyState icon={ClipboardCheck} title={rows.length ? '검색 조건에 맞는 장비가 없습니다.' : '이 달의 정기점검 대상 장비가 없습니다.'} />
          </div>
        )}
        {filteredRows.length > 0 && (
          <>
            <Table aria-label={`${year}년 ${monthNumber}월 정기점검`} className="min-w-[920px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>고객사</TableHead>
                  <TableHead>장비 종류</TableHead>
                  <TableHead>장비명</TableHead>
                  <TableHead>점검자</TableHead>
                  <TableHead>점검 상태</TableHead>
                  <TableHead>점검 일시</TableHead>
                  <TableHead>불량</TableHead>
                  <TableHead>점검주기</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => <MonthlyRow key={row.equipment.id} row={row} onOpen={() => navigate(inspectionEntryPath(row))} />)}
              </TableBody>
            </Table>
            <Pagination
              label="정기점검 목록 페이지"
              summary={`총 ${filteredRows.length.toLocaleString('ko-KR')}건 · ${page}/${lastPage} 페이지`}
              page={page}
              lastPage={lastPage}
              onChange={(nextPage) => updateParam('page', nextPage > 1 ? String(nextPage) : null)}
            />
          </>
        )}
      </section>
    </div>
  )
}

function MonthlyRow({ row, onOpen }: { row: MonthlyInspectionRow; onOpen: () => void }) {
  const { equipment, inspection, period } = row
  const cycle = equipment.inspection_cycle
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="max-w-48 truncate">{equipment.organization_name ?? '-'}</TableCell>
      <TableCell className="whitespace-nowrap">{EQUIPMENT_CATEGORY_LABELS[equipment.category]}</TableCell>
      <TableCell>
        <Link
          to={inspectionEntryPath(row)}
          onClick={(event) => event.stopPropagation()}
          className="font-medium underline-offset-4 hover:text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {equipment.name}
        </Link>
        <span className="block font-mono text-xs text-muted-foreground">{equipment.equipment_code}</span>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {inspection
          ? inspection.created_by.name ?? '-'
          : <span className="text-muted-foreground">{equipment.assigned_user ? `담당 ${equipment.assigned_user.name}` : '-'}</span>}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {inspection ? <InspectionStatusBadge inspection={inspection} /> : <Badge tone="neutral">{NOT_INSPECTED}</Badge>}
      </TableCell>
      <TableCell className="whitespace-nowrap tabular-nums">{inspection?.inspected_on ?? '-'}</TableCell>
      <TableCell>
        {inspection?.has_bad_result
          ? <Badge tone="danger"><AlertTriangle className="size-3" aria-hidden="true" />불량</Badge>
          : <span className="text-muted-foreground">-</span>}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {inspectionCycleLabel(cycle)}
        {(cycle === 'QUARTERLY' || cycle === 'YEARLY') && <span className="block text-xs text-muted-foreground">{period.label}</span>}
      </TableCell>
    </TableRow>
  )
}

function searchText({ equipment, inspection }: MonthlyInspectionRow): string {
  return [
    equipment.organization_name ?? '',
    EQUIPMENT_CATEGORY_LABELS[equipment.category],
    equipment.name,
    equipment.equipment_code,
    inspection?.created_by.name ?? equipment.assigned_user?.name ?? '',
    inspection ? inspectionStatusLabel(inspection) : NOT_INSPECTED,
    inspection?.has_bad_result ? '불량' : '',
    inspectionCycleLabel(equipment.inspection_cycle),
  ].join(' ')
}

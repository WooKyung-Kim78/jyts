import { Link, useNavigate, useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ClipboardList, ClipboardPen } from 'lucide-react'

import { EmptyState } from '@/components/feedback/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getInspections } from '../api/inspections'
import { InspectionStatusBadge } from '../components/InspectionStatusBadge'

export function InspectionListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedPage = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const inspections = useQuery({
    queryKey: ['inspections', 'list', page],
    queryFn: () => getInspections({ page }),
    placeholderData: keepPreviousData,
    staleTime: 0,
  })
  const items = inspections.data?.items
  const meta = inspections.data?.meta

  function goTo(nextPage: number) {
    const next = new URLSearchParams(searchParams)
    if (nextPage > 1) next.set('page', String(nextPage))
    else next.delete('page')
    setSearchParams(next)
    document.getElementById('main-content')?.scrollIntoView?.({ block: 'start' })
  }

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title="정기점검 리스트"
        description="행을 누르면 점검 리포트를 볼 수 있습니다."
        actions={<Button asChild><Link to="/inspections/new"><ClipboardPen aria-hidden="true" />정기점검 입력</Link></Button>}
      />

      {inspections.isPending && <p role="status" className="text-sm text-muted-foreground">점검 목록을 불러오는 중입니다.</p>}
      {inspections.isError && <p role="alert" className="text-sm text-destructive">점검 목록을 불러오지 못했습니다.</p>}
      {items?.length === 0 && (
        <div className="rounded-lg border bg-background">
          <EmptyState
            icon={ClipboardList}
            title={meta?.total ? '이 페이지에 표시할 점검이 없습니다.' : '등록된 정기점검이 없습니다.'}
            action={meta && meta.total > 0 && <Button variant="outline" onClick={() => goTo(1)}>첫 페이지로</Button>}
          />
        </div>
      )}

      {items && items.length > 0 && (
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>점검일자</TableHead>
              <TableHead>고객사</TableHead>
              <TableHead>장비</TableHead>
              <TableHead>점검자</TableHead>
              <TableHead>점검일지 상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((inspection) => (
              <TableRow
                key={inspection.id}
                className="cursor-pointer"
                onClick={() => navigate(`/inspections/${inspection.id}/report`)}
              >
                <TableCell className="whitespace-nowrap">
                  <Link
                    to={`/inspections/${inspection.id}/report`}
                    className="font-medium tabular-nums underline-offset-4 hover:text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {inspection.inspected_on ?? '-'}
                  </Link>
                </TableCell>
                <TableCell className="max-w-48 truncate">{inspection.equipment?.organization_name ?? '-'}</TableCell>
                <TableCell>
                  <span className="block">{inspection.equipment?.name ?? '-'}</span>
                  <span className="font-mono text-xs text-muted-foreground">{inspection.equipment?.equipment_code}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap">{inspection.created_by.name ?? '-'}</TableCell>
                <TableCell className="whitespace-nowrap"><InspectionStatusBadge inspection={inspection} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {meta && meta.total > 0 && (
        <Pagination
          label="점검 목록 페이지"
          summary={`총 ${meta.total.toLocaleString('ko-KR')}건 · ${meta.current_page}/${meta.last_page} 페이지`}
          page={meta.current_page}
          lastPage={meta.last_page}
          disabled={inspections.isFetching}
          onChange={goTo}
        />
      )}
    </section>
  )
}


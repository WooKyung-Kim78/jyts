import { Link, useNavigate, useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ClipboardList, ClipboardPen } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getInspections, inspectionStatusLabel, type Inspection } from '../api/inspections'

function statusClassName(inspection: Inspection): string {
  if (inspection.emailed_at) return 'border-slate-300 bg-slate-100 text-slate-700'
  if (inspection.status === 'COMPLETED') return 'border-emerald-300 bg-emerald-50 text-emerald-800'
  if (inspection.status === 'DRAFT') return 'border-amber-300 bg-amber-50 text-amber-800'
  return 'border-slate-300 bg-background text-muted-foreground'
}

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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">정기점검</h1>
          <p className="mt-1 text-sm text-muted-foreground">행을 누르면 점검 리포트를 볼 수 있습니다.</p>
        </div>
        <Button asChild><Link to="/inspections/new"><ClipboardPen aria-hidden="true" />정기점검 입력</Link></Button>
      </header>

      {inspections.isPending && <p role="status">점검 목록을 불러오는 중입니다.</p>}
      {inspections.isError && <p role="alert" className="text-sm text-destructive">점검 목록을 불러오지 못했습니다.</p>}
      {items?.length === 0 && (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <ClipboardList className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{meta?.total ? '이 페이지에 표시할 점검이 없습니다.' : '등록된 정기점검이 없습니다.'}</p>
          {meta && meta.total > 0 && <Button variant="outline" onClick={() => goTo(1)}>첫 페이지로</Button>}
        </CardContent></Card>
      )}

      {items && items.length > 0 && (
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">점검일자</th>
                <th scope="col" className="px-4 py-3 font-medium">고객사</th>
                <th scope="col" className="px-4 py-3 font-medium">장비</th>
                <th scope="col" className="px-4 py-3 font-medium">점검자</th>
                <th scope="col" className="px-4 py-3 font-medium">점검일지 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((inspection) => (
                <tr
                  key={inspection.id}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => navigate(`/inspections/${inspection.id}/report`)}
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      to={`/inspections/${inspection.id}/report`}
                      className="font-medium underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {inspection.inspected_on ?? '-'}
                    </Link>
                  </td>
                  <td className="max-w-48 truncate px-4 py-3">{inspection.equipment?.organization_name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className="block">{inspection.equipment?.name ?? '-'}</span>
                    <span className="font-mono text-xs text-muted-foreground">{inspection.equipment?.equipment_code}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{inspection.created_by.name ?? '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-medium', statusClassName(inspection))}>
                      {inspectionStatusLabel(inspection)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {meta && meta.total > 0 && (
        <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} disabled={inspections.isFetching} onChange={goTo} />
      )}
    </section>
  )
}

function Pagination({ page, lastPage, total, disabled, onChange }: {
  page: number
  lastPage: number
  total: number
  disabled: boolean
  onChange: (page: number) => void
}) {
  const first = Math.max(1, Math.min(page - 2, lastPage - 4))
  const pages = Array.from({ length: Math.min(5, lastPage) }, (_, index) => first + index)

  return (
    <nav aria-label="점검 목록 페이지" className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">총 {total.toLocaleString('ko-KR')}건 · {page}/{lastPage} 페이지</p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>이전</Button>
        {pages.map((number) => (
          <Button
            key={number}
            variant={number === page ? 'default' : 'outline'}
            size="sm"
            aria-label={`${number} 페이지`}
            aria-current={number === page ? 'page' : undefined}
            disabled={disabled}
            onClick={() => onChange(number)}
          >
            {number}
          </Button>
        ))}
        <Button variant="outline" size="sm" disabled={disabled || page >= lastPage} onClick={() => onChange(page + 1)}>다음</Button>
      </div>
    </nav>
  )
}

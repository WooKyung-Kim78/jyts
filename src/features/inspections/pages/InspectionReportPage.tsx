import { useEffect, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Info, Pencil, Save, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/input'
import { getEquipmentById } from '@/features/equipment/api/equipment'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import {
  deleteInspection,
  getInspection,
  INSPECTION_RESULT_LABELS,
  inspectionStatusLabel,
  updateInspectionRemarks,
  type Inspection,
  type InspectionItem,
} from '../api/inspections'
import { EQUIPMENT_CATEGORY_LABELS, parseInputTemplate } from '../api/templates'

function columnLabels(category: Inspection['category']) {
  const isFire = category === 'FIRE_SUPPRESSION'
  return {
    item: isFire ? '점검항목' : '점검사항',
    standard: isFire ? '점검사항' : category === 'UPS' ? null : '기준치',
    content: isFire ? null : category === 'UPS' ? '점검' : '점검 내용',
    result: isFire ? '점검결과' : '결과',
    remarks: isFire ? '기타사항' : '메모',
  }
}

export function InspectionReportPage() {
  const { inspectionId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const queryKey = ['inspections', inspectionId] as const
  const inspection = useQuery({ queryKey, queryFn: () => getInspection(inspectionId) })
  const [remarksDraft, setRemarksDraft] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const savedRemarks = inspection.data?.remarks ?? ''
  const remarks = remarksDraft ?? savedRemarks
  const dirty = remarksDraft !== null && remarksDraft.trim() !== savedRemarks
  const blocker = useBlocker(dirty)

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const saveRemarks = useMutation({
    mutationFn: () => updateInspectionRemarks(inspectionId, remarks.trim() || null),
    onSuccess: (updated) => {
      queryClient.setQueryData<Inspection>(queryKey, (current) => current && { ...updated, items: current.items })
      setRemarksDraft(null)
      setNotice({ tone: 'success', text: '기타사항을 저장했습니다.' })
    },
    onError: (error) => setNotice({
      tone: 'error',
      text: error instanceof ApiError && error.status === 403 ? '수정 권한이 없습니다.' : '기타사항을 저장하지 못했습니다. 다시 시도하세요.',
    }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteInspection(inspectionId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey })
      await queryClient.invalidateQueries({ queryKey: ['inspections', 'list'] })
      navigate('/inspections', { replace: true })
    },
    onError: () => setNotice({ tone: 'error', text: '점검일지를 삭제하지 못했습니다. 다시 시도하세요.' }),
  })

  if (inspection.isPending) return <p role="status">점검 리포트를 불러오는 중입니다.</p>
  if (inspection.isError || !inspection.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-destructive">
          {inspection.error instanceof ApiError && inspection.error.status === 404 ? '점검을 찾을 수 없습니다.' : '점검 리포트를 불러오지 못했습니다.'}
        </p>
        <Button asChild variant="outline"><Link to="/inspections"><ArrowLeft aria-hidden="true" />목록으로</Link></Button>
      </div>
    )
  }

  const data = inspection.data
  const summary = data.equipment
  const labels = columnLabels(data.category)
  const items = data.items ?? []

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline"><Link to="/inspections"><ArrowLeft aria-hidden="true" />목록으로</Link></Button>
        <div className="flex flex-wrap gap-2">
          {data.can_edit && (
            <Button asChild><Link to={`/inspections/${data.id}`}><Pencil aria-hidden="true" />점검일지 수정</Link></Button>
          )}
          {data.can_delete && (
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm('이 점검일지를 삭제할까요? 삭제하면 목록에서 보이지 않습니다.')) deleteMutation.mutate()
              }}
            >
              <Trash2 aria-hidden="true" />{deleteMutation.isPending ? '삭제 중…' : '점검일지 삭제'}
            </Button>
          )}
        </div>
      </div>

      {blocker.state === 'blocked' && (
        <div role="alertdialog" aria-label="저장하지 않은 기타사항" className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-background p-4">
          <p className="text-sm">저장하지 않은 기타사항이 있습니다. 저장하지 않고 이동할까요?</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => blocker.reset()}>계속 작성</Button>
            <Button variant="destructive" onClick={() => blocker.proceed()}>저장하지 않고 이동</Button>
          </div>
        </div>
      )}

      <article className="overflow-hidden rounded-md border bg-background">
        <header className="flex flex-col gap-3 border-b p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold">정기점검 리포트</h1>
              <p className="text-sm text-muted-foreground">점검일자 {data.inspected_on ?? '-'} · 점검자 {data.created_by.name ?? '-'}</p>
            </div>
            <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{inspectionStatusLabel(data)}</span>
          </div>
          <dl aria-label="장비 기본 사양" className="grid grid-cols-1 border-t border-l text-sm sm:grid-cols-2 lg:grid-cols-3">
            <SpecCell label="점검일자" value={data.inspected_on} />
            <SpecCell label="고객사" value={summary?.organization_name} />
            <SpecCell label="장비명" value={summary?.name} />
            <SpecCell label="장비 코드" value={summary?.equipment_code} />
            <SpecCell label="장비 종류" value={EQUIPMENT_CATEGORY_LABELS[data.category]} />
            <SpecCell label="장비 담당 직원" value={summary?.assigned_user_name} />
          </dl>
          <EquipmentSpecDialog equipmentId={data.equipment_id} equipmentName={summary?.name ?? '장비'} />
        </header>

        <div className="overflow-x-auto p-4">
          <table aria-label="점검 내용" className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="w-10 border px-2 py-2 text-center font-medium">No</th>
                <th scope="col" className="border px-2 py-2 font-medium">{labels.item}</th>
                {labels.standard && <th scope="col" className="border px-2 py-2 font-medium">{labels.standard}</th>}
                {labels.content && <th scope="col" className="border px-2 py-2 font-medium">{labels.content}</th>}
                <th scope="col" className="w-20 border px-2 py-2 text-center font-medium">{labels.result}</th>
                <th scope="col" className="border px-2 py-2 font-medium">{labels.remarks}</th>
                <th scope="col" className="w-28 border px-2 py-2 font-medium">사진</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="align-top">
                  <td className="border px-2 py-2 text-center">{index + 1}</td>
                  <td className="border px-2 py-2 font-medium">{item.inspection_item}</td>
                  {labels.standard && <td className="border px-2 py-2 whitespace-pre-wrap">{item.standard || '-'}</td>}
                  {labels.content && <td className="border px-2 py-2"><FilledTemplate item={item} /></td>}
                  <td className={cn(
                    'border px-2 py-2 text-center font-semibold',
                    item.result === 'GOOD' && 'text-emerald-700',
                    item.result === 'BAD' && 'text-destructive',
                  )}>
                    {item.result ? INSPECTION_RESULT_LABELS[item.result] : '-'}
                  </td>
                  <td className="border px-2 py-2 whitespace-pre-wrap">{item.remarks || '-'}</td>
                  <td className="border px-2 py-2">
                    {item.photos.length ? (
                      <div className="flex flex-wrap gap-1">
                        {item.photos.map((photo, photoIndex) => (
                          <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer">
                            <img src={photo.url} alt={`${index + 1}번 항목 사진 ${photoIndex + 1}`} className="size-12 rounded border object-cover" />
                          </a>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-2 border-t p-4">
          <Label htmlFor="inspection-remarks">기타사항</Label>
          <textarea
            id="inspection-remarks"
            rows={4}
            maxLength={5000}
            readOnly={!data.can_edit}
            value={remarks}
            placeholder={data.can_edit ? '점검 전체에 대한 기타사항을 입력하세요.' : ''}
            className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-base read-only:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            onChange={(event) => {
              setRemarksDraft(event.currentTarget.value)
              setNotice(null)
            }}
          />
          {notice && (
            <p role={notice.tone === 'error' ? 'alert' : 'status'} className={cn('text-sm', notice.tone === 'error' && 'text-destructive')}>
              {notice.text}
            </p>
          )}
          {data.can_edit && (
            <Button className="self-end" disabled={!dirty || saveRemarks.isPending} onClick={() => saveRemarks.mutate()}>
              <Save aria-hidden="true" />{saveRemarks.isPending ? '저장 중…' : '기타사항 저장'}
            </Button>
          )}
        </footer>
      </article>
    </section>
  )
}

function EquipmentSpecDialog({ equipmentId, equipmentName }: { equipmentId: string; equipmentName: string }) {
  const [open, setOpen] = useState(false)
  const equipment = useQuery({
    queryKey: ['equipment', 'detail', equipmentId],
    queryFn: () => getEquipmentById(equipmentId),
    enabled: open,
    retry: false,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="self-start"><Info aria-hidden="true" />자세히</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>장비 상세 사양</DialogTitle>
          <DialogDescription>{equipmentName}의 현재 등록 사양입니다.</DialogDescription>
        </DialogHeader>
        {equipment.isPending && <p role="status" className="text-sm">장비 사양을 불러오는 중입니다.</p>}
        {equipment.isError && <p role="alert" className="text-sm text-destructive">장비 사양을 불러오지 못했습니다.</p>}
        {equipment.data && (
          equipment.data.attributes.length || equipment.data.specifics ? (
            <dl aria-label="장비 상세 사양" className="grid grid-cols-1 border-t border-l text-sm sm:grid-cols-2">
              {equipment.data.attributes.map((attribute) => <SpecCell key={attribute.id} label={attribute.label} value={attribute.value} />)}
              {equipment.data.specifics && <SpecCell label="특이사항" value={equipment.data.specifics} />}
            </dl>
          ) : <p className="text-sm text-muted-foreground">등록된 사양이 없습니다.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SpecCell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[112px_1fr] border-r border-b">
      <dt className="bg-muted/50 px-2 py-1.5 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words whitespace-pre-wrap px-2 py-1.5">{value || '-'}</dd>
    </div>
  )
}

function FilledTemplate({ item }: { item: InspectionItem }) {
  if (!item.input_template) return <span>-</span>
  return (
    <span className="whitespace-pre-wrap">
      {parseInputTemplate(item.input_template).map((part, index) => part.kind === 'literal'
        ? <span key={index}>{part.text}</span>
        : <strong key={index} className="mx-0.5 font-semibold underline underline-offset-4">{item.input_values[part.index] || '＿＿'}</strong>)}
    </span>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, ChevronDown, FileText, Save, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import {
  completeInspection,
  deleteInspectionPhoto,
  getInspection,
  INSPECTION_NUMBER_PATTERN,
  INSPECTION_RESULT_LABELS,
  INSPECTION_RESULTS,
  inspectionStatusLabel,
  saveInspectionItem,
  updateInspection,
  uploadInspectionPhoto,
  type Inspection,
  type InspectionItem,
  type InspectionResult,
} from '../api/inspections'
import { EQUIPMENT_CATEGORY_LABELS, parseInputTemplate } from '../api/templates'

type ItemDraft = { input_values: string[]; result: InspectionResult | null; remarks: string }

const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function toDraft(item: InspectionItem): ItemDraft {
  return { input_values: item.input_values, result: item.result, remarks: item.remarks ?? '' }
}

function isDirty(draft: ItemDraft | undefined, item: InspectionItem): boolean {
  if (!draft) return false
  return draft.result !== item.result
    || draft.remarks.trim() !== (item.remarks ?? '')
    || draft.input_values.some((value, index) => value.trim() !== (item.input_values[index] ?? ''))
}

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return '수정 권한이 없습니다.'
    if (error.status === 422) return '입력값을 확인해 주세요.'
  }
  return '저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도하세요.'
}

function itemElementId(itemId: string) {
  return `inspection-item-${itemId}`
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record }
  delete next[key]
  return next
}

function focusItem(itemId: string | undefined) {
  if (!itemId) {
    const remarks = document.getElementById('inspection-remarks')
    remarks?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    remarks?.focus({ preventScroll: true })
    return
  }
  const card = document.getElementById(itemElementId(itemId))
  if (!card) return
  card.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  card.querySelector<HTMLElement>('[data-inspection-field], [data-result-button]')?.focus({ preventScroll: true })
}

export function InspectionFormPage() {
  const { inspectionId = '' } = useParams()
  const auth = useAuth()
  const currentUserId = auth.status === 'active' ? auth.profile.id : null
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const queryKey = ['inspections', inspectionId] as const
  const inspection = useQuery({ queryKey, queryFn: () => getInspection(inspectionId) })
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({})
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [remarksDraft, setRemarksDraft] = useState<string | null>(null)
  const [finishError, setFinishError] = useState<string | null>(null)
  // Lets the post-completion redirect pass before the cleared drafts re-render.
  const leavingRef = useRef(false)

  const items = inspection.data?.items ?? []
  const canEdit = inspection.data?.can_edit ?? false
  const remarksDirty = remarksDraft !== null && remarksDraft.trim() !== (inspection.data?.remarks ?? '')
  const dirtyCount = items.filter((item) => isDirty(drafts[item.id], item)).length + (remarksDirty ? 1 : 0)
  const doneCount = items.filter((item) => item.result !== null).length
  const blocker = useBlocker(() => !leavingRef.current && dirtyCount > 0)

  useEffect(() => {
    if (dirtyCount === 0) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirtyCount])

  function updateCachedItem(saved: InspectionItem) {
    queryClient.setQueryData<Inspection>(queryKey, (current) => current && {
      ...current,
      items: current.items?.map((item) => item.id === saved.id ? { ...saved, previous_values: item.previous_values } : item),
    })
  }

  const saveMutation = useMutation({
    mutationFn: ({ item, draft }: { item: InspectionItem; draft: ItemDraft; nextId: string | undefined }) => saveInspectionItem(inspectionId, item.id, {
      input_values: draft.input_values.map((value) => value.trim()),
      result: draft.result,
      remarks: draft.remarks.trim() || null,
    }),
    onSuccess: (saved, { nextId }) => {
      updateCachedItem(saved)
      setDrafts((current) => omitKey(current, saved.id))
      setItemErrors((current) => omitKey(current, saved.id))
      focusItem(nextId)
    },
    onError: (error, { item }) => setItemErrors((current) => ({ ...current, [item.id]: saveErrorMessage(error) })),
  })

  const remarksMutation = useMutation({
    mutationFn: (remarks: string) => updateInspection(inspectionId, { remarks: remarks.trim() || null }),
    onSuccess: (updated) => {
      queryClient.setQueryData<Inspection>(queryKey, (current) => current && { ...current, remarks: updated.remarks })
      setRemarksDraft(null)
      setNotice('기타사항을 저장했습니다.')
    },
    onError: () => setNotice('기타사항을 저장하지 못했습니다. 다시 시도하세요.'),
  })

  const dateMutation = useMutation({
    mutationFn: (inspectedOn: string) => updateInspection(inspectionId, { inspected_on: inspectedOn }),
    onSuccess: (updated) => {
      queryClient.setQueryData<Inspection>(queryKey, (current) => current && { ...current, inspected_on: updated.inspected_on })
      setNotice('점검일자를 변경했습니다.')
    },
    onError: () => setNotice('점검일자를 변경하지 못했습니다. 다시 시도하세요.'),
  })

  const finishMutation = useMutation({
    mutationFn: async ({ remarks, complete }: { remarks: string | null; complete: boolean }) => {
      if (remarks !== null) await updateInspection(inspectionId, { remarks: remarks.trim() || null })
      return complete ? completeInspection(inspectionId) : null
    },
    onSuccess: async (completed) => {
      if (completed) queryClient.setQueryData(queryKey, completed)
      else await queryClient.invalidateQueries({ queryKey })
      void queryClient.invalidateQueries({ queryKey: ['inspections', 'list'] })
      setRemarksDraft(null)
      leavingRef.current = true
      navigate(`/inspections/${inspectionId}/report`)
    },
    onError: (error) => setFinishError(error instanceof ApiError && error.status === 422
      ? '결과를 선택하지 않은 항목이 있습니다.'
      : '저장하거나 점검을 완료하지 못했습니다. 다시 시도하세요.'),
  })

  if (inspection.isPending) return <p role="status">점검 내용을 불러오는 중입니다.</p>
  if (inspection.isError || !inspection.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-destructive">
          {inspection.error instanceof ApiError && inspection.error.status === 404 ? '점검을 찾을 수 없습니다.' : '점검 내용을 불러오지 못했습니다.'}
        </p>
        <Button asChild variant="outline"><Link to="/inspections/new"><ArrowLeft aria-hidden="true" />장비 선택으로</Link></Button>
      </div>
    )
  }

  const data = inspection.data
  const equipment = data.equipment
  const isMine = equipment?.assigned_user_id != null && equipment.assigned_user_id === currentUserId

  function next(item: InspectionItem, index: number) {
    const draft = drafts[item.id] ?? toDraft(item)
    const nextId = items[index + 1]?.id
    const invalidIndex = item.input_types.findIndex((type, fieldIndex) => {
      const value = draft.input_values[fieldIndex]?.trim() ?? ''
      return type === 'num' && value !== '' && !INSPECTION_NUMBER_PATTERN.test(value)
    })
    if (invalidIndex >= 0) {
      setItemErrors((current) => ({ ...current, [item.id]: `${invalidIndex + 1}번째 칸에는 숫자만 입력하세요.` }))
      return
    }
    if (data.status === 'COMPLETED' && draft.result === null) {
      setItemErrors((current) => ({ ...current, [item.id]: '완료된 점검은 결과를 선택해야 합니다.' }))
      return
    }
    if (!isDirty(drafts[item.id], item) && item.saved_at) {
      focusItem(nextId)
      return
    }
    saveMutation.mutate({ item, draft, nextId })
  }

  function finish() {
    setFinishError(null)
    const unsaved = items.find((item) => isDirty(drafts[item.id], item))
    if (unsaved) {
      setFinishError('저장하지 않은 점검항목이 있습니다. 항목의 다음 버튼으로 먼저 저장하세요.')
      focusItem(unsaved.id)
      return
    }
    const missing = items.find((item) => item.result === null)
    if (data.status === 'DRAFT' && missing) {
      setFinishError('결과를 선택하지 않은 항목이 있습니다.')
      focusItem(missing.id)
      return
    }
    finishMutation.mutate({ remarks: remarksDirty ? remarksDraft : null, complete: data.status === 'DRAFT' })
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 border-b pb-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="장비 선택으로">
            <Link to="/inspections/new"><ArrowLeft aria-hidden="true" /></Link>
          </Button>
          <h1 className="text-2xl font-bold">정기점검 입력</h1>
        </div>
        {equipment && (
          <div>
            <p className="font-semibold">{equipment.name}</p>
            <p className="text-sm text-muted-foreground">
              {equipment.organization_name} · {EQUIPMENT_CATEGORY_LABELS[data.category]} · {equipment.equipment_code}
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="inspection-date">점검일자</Label>
          <input
            id="inspection-date"
            type="date"
            required
            disabled={!canEdit || dateMutation.isPending}
            value={data.inspected_on ?? ''}
            className="h-11 rounded-md border border-input bg-background px-3 text-base focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-70"
            onChange={(event) => {
              const value = event.currentTarget.value
              if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value !== data.inspected_on) dateMutation.mutate(value)
            }}
          />
          {dateMutation.isPending && <span className="text-xs text-muted-foreground">저장 중…</span>}
        </div>
        <p className="text-sm text-muted-foreground">
          작성자 {data.created_by.name ?? '-'} · 상태 {inspectionStatusLabel(data)}
        </p>
        <Button asChild variant="outline" size="sm" className="self-start">
          <Link to={`/inspections/${data.id}/report`}><FileText aria-hidden="true" />리포트 보기</Link>
        </Button>
        {!isMine && (
          <p className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            내 담당 장비가 아닙니다. ({equipment?.assigned_user_name ? `담당: ${equipment.assigned_user_name}` : '담당자 없음'})
          </p>
        )}
        {!canEdit && (
          <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">
            {data.emailed_at ? '담당자에게 이메일을 보낸 점검은 수정할 수 없습니다.' : '작성자 또는 관리자만 수정할 수 있습니다.'}
          </p>
        )}
      </header>

      {blocker.state === 'blocked' && (
        <div role="alertdialog" aria-label="저장하지 않은 입력" className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-background p-4">
          <p className="text-sm">저장하지 않은 입력이 있습니다. 저장하지 않고 이동할까요?</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => blocker.reset()}>계속 작성</Button>
            <Button variant="destructive" onClick={() => blocker.proceed()}>저장하지 않고 이동</Button>
          </div>
        </div>
      )}

      <ol aria-label="점검항목 입력" className="flex flex-col gap-3">
        {items.map((item, index) => (
          <InspectionItemCard
            key={item.id}
            inspection={data}
            item={item}
            number={index + 1}
            draft={drafts[item.id] ?? toDraft(item)}
            dirty={isDirty(drafts[item.id], item)}
            error={itemErrors[item.id] ?? null}
            canEdit={canEdit}
            saving={saveMutation.isPending && saveMutation.variables?.item.id === item.id}
            onChange={(draft) => setDrafts((current) => ({ ...current, [item.id]: draft }))}
            onNext={() => next(item, index)}
            onPhotosChange={(photos) => updateCachedItem({ ...item, photos })}
          />
        ))}
      </ol>

      <section className="flex flex-col gap-2 rounded-md border bg-background p-4">
        <Label htmlFor="inspection-remarks">기타사항</Label>
        <textarea
          id="inspection-remarks"
          rows={4}
          maxLength={5000}
          disabled={!canEdit}
          value={remarksDraft ?? data.remarks ?? ''}
          placeholder={canEdit ? '점검 전체에 대한 기타사항을 입력하세요.' : ''}
          className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-70"
          onChange={(event) => setRemarksDraft(event.currentTarget.value)}
        />
        {canEdit && (
          <div className="flex flex-col gap-2">
            {finishError && <p role="alert" className="text-sm text-destructive">{finishError}</p>}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 text-base"
                disabled={!remarksDirty || remarksMutation.isPending || finishMutation.isPending}
                onClick={() => remarksMutation.mutate(remarksDraft ?? '')}
              >
                <Save aria-hidden="true" />{remarksMutation.isPending ? '저장 중…' : '저장'}
              </Button>
              <Button
                type="button"
                className="min-h-12 text-base"
                disabled={remarksMutation.isPending || finishMutation.isPending}
                onClick={finish}
              >
                <CheckCircle2 aria-hidden="true" />{finishMutation.isPending ? '처리 중…' : '저장&점검완료'}
              </Button>
            </div>
          </div>
        )}
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-background p-3 md:-mx-6 md:px-6">
        {notice && <p role="status" className="text-sm">{notice}</p>}
        <div className="flex items-center gap-2">
          <p className="mr-auto text-sm font-medium" aria-live="polite">
            {doneCount}/{items.length} 완료{dirtyCount > 0 && ` · 저장 안 됨 ${dirtyCount}`}
          </p>
          {doneCount < items.length && (
            <Button variant="outline" size="sm" onClick={() => focusItem(items.find((item) => item.result === null)?.id)}>
              <ChevronDown aria-hidden="true" />미입력 항목
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

function InspectionItemCard({ inspection, item, number, draft, dirty, error, canEdit, saving, onChange, onNext, onPhotosChange }: {
  inspection: Inspection
  item: InspectionItem
  number: number
  draft: ItemDraft
  dirty: boolean
  error: string | null
  canEdit: boolean
  saving: boolean
  onChange: (draft: ItemDraft) => void
  onNext: () => void
  onPhotosChange: (photos: InspectionItem['photos']) => void
}) {
  const isFire = inspection.category === 'FIRE_SUPPRESSION'
  const standardLabel = isFire ? '점검사항' : inspection.category === 'UPS' ? null : '기준치'
  const [memoOpen, setMemoOpen] = useState(false)
  const showRemarks = isFire || memoOpen || draft.result === 'BAD' || draft.remarks !== ''
  const hasPrevious = item.previous_values?.some((value) => value !== '') ?? false
  const status = dirty ? '저장 안 됨' : item.saved_at ? '저장됨' : '미입력'

  function handleFieldKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const card = event.currentTarget.closest('li')
    const targets = Array.from(card?.querySelectorAll<HTMLElement>('[data-inspection-field], [data-result-button]') ?? [])
    targets[targets.indexOf(event.currentTarget) + 1]?.focus()
  }

  return (
    <li id={itemElementId(item.id)} className="flex scroll-mt-20 flex-col gap-3 rounded-md border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">{number}. {item.inspection_item}</h2>
        <span className={cn('shrink-0 text-xs font-medium', dirty ? 'text-amber-700' : item.saved_at ? 'text-emerald-700' : 'text-muted-foreground')}>
          {status}
        </span>
      </div>
      {standardLabel && item.standard && (
        <p className="text-sm"><span className="text-muted-foreground">{standardLabel}: </span>{item.standard}</p>
      )}

      {item.input_template && (
        <div className="whitespace-pre-wrap text-base leading-[3rem]">
          {parseInputTemplate(item.input_template).map((part, partIndex) => part.kind === 'literal' ? (
            <span key={partIndex}>{part.text}</span>
          ) : (
            <input
              key={partIndex}
              data-inspection-field
              aria-label={`${number}번 ${item.inspection_item} 입력 ${part.index + 1}`}
              className="mx-1 h-11 w-24 rounded-md border border-input bg-background px-2 align-middle text-base placeholder:text-muted-foreground/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-70"
              inputMode={part.type === 'num' ? 'decimal' : 'text'}
              enterKeyHint="next"
              maxLength={100}
              disabled={!canEdit}
              value={draft.input_values[part.index] ?? ''}
              placeholder={item.previous_values?.[part.index] ?? ''}
              onKeyDown={handleFieldKeyDown}
              onChange={(event) => {
                const inputValues = [...draft.input_values]
                inputValues[part.index] = event.currentTarget.value
                onChange({ ...draft, input_values: inputValues })
              }}
            />
          ))}
        </div>
      )}
      {hasPrevious && <p className="text-xs text-muted-foreground">입력칸의 흐린 값은 지난 점검값입니다.</p>}

      <div role="group" aria-label={`${number}번 ${isFire ? '점검결과' : '결과'}`} className="grid grid-cols-2 gap-2">
        {INSPECTION_RESULTS.map((result) => (
          <button
            key={result}
            type="button"
            data-result-button
            aria-pressed={draft.result === result}
            disabled={!canEdit}
            className={cn(
              'min-h-12 rounded-md border text-base font-semibold focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-70',
              draft.result === result && result === 'GOOD' && 'border-emerald-600 bg-emerald-50 text-emerald-800',
              draft.result === result && result === 'BAD' && 'border-destructive bg-red-50 text-destructive',
            )}
            onClick={() => onChange({ ...draft, result })}
          >
            {draft.result === result && '✓ '}{INSPECTION_RESULT_LABELS[result]}
          </button>
        ))}
      </div>

      {showRemarks ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`remarks-${item.id}`}>{isFire ? '기타사항' : '메모'}</Label>
          <textarea
            id={`remarks-${item.id}`}
            rows={2}
            maxLength={2000}
            disabled={!canEdit}
            value={draft.remarks}
            className="min-h-16 rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-70"
            onChange={(event) => onChange({ ...draft, remarks: event.currentTarget.value })}
          />
        </div>
      ) : canEdit && (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setMemoOpen(true)}>메모 추가</Button>
      )}

      <ItemPhotos inspectionId={inspection.id} item={item} number={number} canEdit={canEdit} onChange={onPhotosChange} />

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {canEdit && (
        <Button type="button" className="min-h-12 text-base" disabled={saving} onClick={onNext}>
          {saving ? '저장 중…' : item.saved_at ? '수정' : '다음'}
        </Button>
      )}
    </li>
  )
}

function ItemPhotos({ inspectionId, item, number, canEdit, onChange }: {
  inspectionId: string
  item: InspectionItem
  number: number
  canEdit: boolean
  onChange: (photos: InspectionItem['photos']) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const upload = useMutation({
    mutationFn: (file: File) => uploadInspectionPhoto(inspectionId, item.id, file),
    onSuccess: (photo) => {
      setError(null)
      onChange([...item.photos, photo])
    },
    onError: () => setError('사진을 올리지 못했습니다. 다시 시도하세요.'),
  })
  const remove = useMutation({
    mutationFn: deleteInspectionPhoto,
    onSuccess: (_result, photoId) => onChange(item.photos.filter((photo) => photo.id !== photoId)),
    onError: () => setError('사진을 삭제하지 못했습니다.'),
  })

  if (!canEdit && item.photos.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {item.photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-label={`${number}번 항목 사진`}>
          {item.photos.map((photo, index) => (
            <li key={photo.id} className="relative">
              <img src={photo.url} alt={`${number}번 항목 사진 ${index + 1}`} className="aspect-square w-full rounded-md border object-cover" />
              {canEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 size-8"
                  aria-label={`${number}번 항목 사진 ${index + 1} 삭제`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm('사진을 삭제할까요?')) remove.mutate(photo.id)
                  }}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <label className={cn(
          'inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-md border px-3 text-sm font-medium focus-within:ring-[3px] focus-within:ring-ring/50',
          upload.isPending && 'pointer-events-none opacity-60',
        )}>
          <Camera className="size-4" aria-hidden="true" />
          {upload.isPending ? '사진 올리는 중…' : '사진 추가'}
          <input
            type="file"
            accept={PHOTO_TYPES.join(',')}
            className="sr-only"
            aria-label={`${number}번 항목 사진 추가`}
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (!file) return
              if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
                setError('JPG, PNG, WEBP 형식의 10MB 이하 사진만 올릴 수 있습니다.')
                return
              }
              upload.mutate(file)
            }}
          />
        </label>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, ChevronRight, ClipboardList } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getEquipment, type Equipment } from '@/features/equipment/api/equipment'
import { cn } from '@/lib/utils'
import { EQUIPMENT_CATEGORY_LABELS, getInspectionTemplates, INSPECTION_RESULT_OPTIONS, parseInputTemplate } from '../api/templates'
import { getInspections, startInspection } from '../api/inspections'

type EquipmentScope = 'mine' | 'all'

export function InspectionEntryPage() {
  const auth = useAuth()
  const currentUserId = auth.status === 'active' ? auth.profile.id : null
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('equipment_id') ?? ''
  const equipment = useQuery({ queryKey: ['equipment', ''], queryFn: () => getEquipment() })
  const selected = equipment.data?.find((item) => item.id === selectedId)

  function select(id: string | null) {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('equipment_id', id)
    else next.delete('equipment_id')
    setSearchParams(next)
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold">정기점검 입력</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedId ? '선택한 장비의 점검항목을 확인합니다.' : '점검할 장비를 선택하세요.'}
        </p>
      </header>

      {equipment.isPending && <p role="status">장비 목록을 불러오는 중입니다.</p>}
      {equipment.isError && <p role="alert" className="text-sm text-destructive">장비 목록을 불러오지 못했습니다.</p>}

      {equipment.data && !selectedId && (
        <EquipmentPicker equipment={equipment.data} currentUserId={currentUserId} onSelect={select} />
      )}

      {equipment.data && selectedId && !selected && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-destructive">선택한 장비를 찾을 수 없습니다.</p>
          <Button variant="outline" onClick={() => select(null)}><ArrowLeft aria-hidden="true" />장비 다시 선택</Button>
        </div>
      )}

      {selected && (
        <SelectedEquipment equipment={selected} isMine={selected.assigned_user_id === currentUserId} currentUserId={currentUserId} onReset={() => select(null)} />
      )}
    </section>
  )
}

function EquipmentPicker({ equipment, currentUserId, onSelect }: {
  equipment: Equipment[]
  currentUserId: string | null
  onSelect: (id: string) => void
}) {
  const myEquipment = useMemo(
    () => equipment.filter((item) => item.assigned_user_id === currentUserId),
    [equipment, currentUserId],
  )
  const [scope, setScope] = useState<EquipmentScope>(myEquipment.length ? 'mine' : 'all')
  const [search, setSearch] = useState('')

  const visible = useMemo(() => {
    const searchText = search.trim().toLocaleLowerCase()
    return (scope === 'mine' ? myEquipment : equipment)
      .filter((item) => !searchText || [item.name, item.equipment_code, item.organization_name ?? '']
        .some((value) => value.toLocaleLowerCase().includes(searchText)))
      .sort((left, right) => Number(right.assigned_user_id === currentUserId) - Number(left.assigned_user_id === currentUserId))
  }, [scope, search, equipment, myEquipment, currentUserId])

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="장비 범위" className="grid grid-cols-2 gap-1 rounded-md border bg-muted p-1">
        {([['mine', `내 장비 (${myEquipment.length})`], ['all', `전체 장비 (${equipment.length})`]] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={scope === value}
            className={cn(
              'min-h-11 rounded-sm text-sm font-medium text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
              scope === value && 'bg-background text-foreground shadow-sm',
            )}
            onClick={() => setScope(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="inspection-equipment-search">장비 검색</Label>
        <Input id="inspection-equipment-search" type="search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="장비명, 코드, 고객사" />
      </div>

      {visible.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <ClipboardList className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {search.trim() ? '검색 조건에 맞는 장비가 없습니다.' : scope === 'mine' ? '나에게 지정된 장비가 없습니다. 전체 장비에서 선택하세요.' : '등록된 장비가 없습니다.'}
          </p>
        </CardContent></Card>
      ) : (
        <ul className="divide-y rounded-md border bg-background">
          {visible.map((item) => {
            const isMine = item.assigned_user_id === currentUserId
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  onClick={() => onSelect(item.id)}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="truncate text-sm text-muted-foreground">
                      {item.organization_name} · {EQUIPMENT_CATEGORY_LABELS[item.category]} · {item.equipment_code}
                    </span>
                    {!isMine && <NotMineNotice assignee={item.assigned_user?.name ?? null} />}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function NotMineNotice({ assignee }: { assignee: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
      내 담당 장비 아님 · {assignee ? `담당: ${assignee}` : '담당자 없음'}
    </span>
  )
}

function SelectedEquipment({ equipment, isMine, currentUserId, onReset }: {
  equipment: Equipment
  isMine: boolean
  currentUserId: string | null
  onReset: () => void
}) {
  const navigate = useNavigate()
  const category = equipment.category
  const templates = useQuery({ queryKey: ['inspection-templates', category], queryFn: () => getInspectionTemplates(category) })
  const drafts = useQuery({
    queryKey: ['inspections', { equipment_id: equipment.id, status: 'DRAFT' }],
    queryFn: () => getInspections({ equipment_id: equipment.id, status: 'DRAFT' }),
  })
  const start = useMutation({
    mutationFn: () => startInspection(equipment.id),
    onSuccess: (inspection) => navigate(`/inspections/${inspection.id}`),
  })
  const items = templates.data?.[0]?.items ?? []
  const standardLabel = category === 'FIRE_SUPPRESSION' ? '점검사항' : category === 'UPS' ? null : '기준치'
  const hasOwnDraft = drafts.data?.items.some((draft) => draft.created_by.id === currentUserId) ?? false

  return (
    <div className="flex flex-col gap-4">
      <Card><CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{equipment.name}</h2>
            <p className="text-sm text-muted-foreground">
              {equipment.organization_name} · {EQUIPMENT_CATEGORY_LABELS[category]} · {equipment.equipment_code}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>장비 변경</Button>
        </div>
        {!isMine && (
          <p role="status" className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            내 담당 장비가 아닙니다. ({equipment.assigned_user ? `담당: ${equipment.assigned_user.name}` : '담당자 없음'})
          </p>
        )}
      </CardContent></Card>

      {drafts.data?.items.map((draft) => draft.can_edit ? (
        <Button key={draft.id} asChild variant={draft.created_by.id === currentUserId ? 'default' : 'outline'} className="min-h-12 text-base">
          <Link to={`/inspections/${draft.id}`}>
            이어서 작성 ({draft.inspected_on}{draft.created_by.id === currentUserId ? '' : ` · ${draft.created_by.name ?? '-'}`})
          </Link>
        </Button>
      ) : (
        <p key={draft.id} className="text-sm text-muted-foreground">
          {draft.created_by.name ?? '다른 직원'}님이 작성 중인 점검이 있습니다. ({draft.inspected_on})
        </p>
      ))}
      {drafts.isError && <p role="alert" className="text-sm text-destructive">작성 중인 점검을 확인하지 못했습니다.</p>}
      {drafts.data && !hasOwnDraft && items.length > 0 && (
        <Button className="min-h-12 text-base" disabled={start.isPending} onClick={() => start.mutate()}>
          {start.isPending ? '점검 준비 중…' : '점검 시작'}
        </Button>
      )}
      {start.isError && <p role="alert" className="text-sm text-destructive">점검을 시작하지 못했습니다. 다시 시도하세요.</p>}

      <h2 className="text-lg font-semibold">점검항목</h2>
      {templates.isPending && <p role="status">점검항목을 불러오는 중입니다.</p>}
      {templates.isError && <p role="alert" className="text-sm text-destructive">점검항목을 불러오지 못했습니다.</p>}
      {templates.data && items.length === 0 && (
        <p className="text-sm text-muted-foreground">이 장비 종류의 점검일지 마스터가 없습니다. 관리자에게 등록을 요청하세요.</p>
      )}
      {items.length > 0 && (
        <ol aria-label="점검항목 목록" className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={item.id} className="flex flex-col gap-2 rounded-md border bg-background p-4">
              <p className="font-medium">{index + 1}. {item.inspection_item}</p>
              {standardLabel && item.standard && (
                <p className="text-sm"><span className="text-muted-foreground">{standardLabel}: </span>{item.standard}</p>
              )}
              {item.input_template && <TemplatePreview template={item.input_template} />}
              <p className="text-sm text-muted-foreground">
                {category === 'FIRE_SUPPRESSION' ? '점검결과' : '결과'}: {INSPECTION_RESULT_OPTIONS.join(' · ')}
                {category === 'FIRE_SUPPRESSION' && ' / 기타사항 직접 입력'}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function TemplatePreview({ template }: { template: string }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-7">
      {parseInputTemplate(template).map((part, index) => part.kind === 'literal' ? (
        <span key={index}>{part.text}</span>
      ) : (
        <span key={index} className="mx-1 inline-block h-5 w-16 border-b border-dashed border-muted-foreground align-middle">
          <span className="sr-only">{part.type === 'num' ? '숫자 입력칸' : '입력칸'}</span>
        </span>
      ))}
    </p>
  )
}

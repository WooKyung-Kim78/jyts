import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  countInputFields,
  createInspectionTemplate,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_LABELS,
  getInspectionTemplates,
  INSPECTION_RESULT_OPTIONS,
  inspectionTemplateInputSchema,
  type InspectionTemplateItemInput,
} from '../api/templates'
import { type EquipmentCategory } from '@/features/equipment/api/equipment'

function emptyItem(): InspectionTemplateItemInput {
  return { inspection_item: '', standard: '', input_template: '' }
}

export function InspectionTemplateMasterPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [category, setCategory] = useState<EquipmentCategory>('PRECISION_AIR_CONDITIONER')
  const [drafts, setDrafts] = useState<Partial<Record<EquipmentCategory, InspectionTemplateItemInput[]>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const isUps = category === 'UPS'
  const isFireSuppression = category === 'FIRE_SUPPRESSION'
  const templatesQueryKey = ['inspection-templates', category] as const
  const templates = useQuery({ queryKey: templatesQueryKey, queryFn: () => getInspectionTemplates(category) })
  const items = drafts[category] ?? templates.data?.[0]?.items.map(({ inspection_item, standard, input_template }) => ({
    inspection_item,
    standard,
    input_template,
  })) ?? [emptyItem()]

  const saveMutation = useMutation({
    mutationFn: createInspectionTemplate,
    onSuccess: async (savedList) => {
      setDrafts((current) => ({
        ...current,
        [savedList.category]: savedList.items.map(({ inspection_item, standard, input_template }) => ({
          inspection_item,
          standard,
          input_template,
        })),
      }))
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: templatesQueryKey })
    },
    onError: () => setFormError('점검일지 마스터를 저장하지 못했습니다. 입력값을 확인해 주세요.'),
  })

  if (auth.status !== 'active' || auth.profile.role !== 'ADMIN') {
    return <p role="alert">접근 권한이 없습니다.</p>
  }

  function updateItem(index: number, update: Partial<InspectionTemplateItemInput>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item))
  }

  function setItems(nextItems: InspectionTemplateItemInput[] | ((current: InspectionTemplateItemInput[]) => InspectionTemplateItemInput[])) {
    setDrafts((current) => ({
      ...current,
      [category]: typeof nextItems === 'function' ? nextItems(current[category] ?? items) : nextItems,
    }))
  }

  function moveItem(index: number, offset: -1 | 1) {
    setItems((current) => {
      const targetIndex = index + offset
      if (targetIndex < 0 || targetIndex >= current.length) return current
      const reordered = [...current]
      const [movedItem] = reordered.splice(index, 1)
      if (!movedItem) return current
      reordered.splice(targetIndex, 0, movedItem)
      return reordered
    })
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = inspectionTemplateInputSchema.safeParse({ category, items })
    if (!parsed.success) {
      setFormError(parsed.error instanceof z.ZodError ? '점검사항과 필수 항목을 확인해 주세요.' : '입력값을 확인해 주세요.')
      return
    }
    const input = isUps
      ? {
          ...parsed.data,
          items: parsed.data.items.map((item) => ({
            inspection_item: item.inspection_item,
            input_template: item.input_template,
          })),
        }
      : isFireSuppression
        ? {
            ...parsed.data,
            items: parsed.data.items.map(({ inspection_item, standard }) => ({
              inspection_item,
              ...(standard ? { standard } : {}),
            })),
          }
      : parsed.data
    saveMutation.mutate(input)
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold">점검일지 마스터</h1>
        <p className="mt-1 text-sm text-muted-foreground">장비 종류별 점검사항, 점검 템플릿과 기준치를 정의합니다.</p>
      </header>

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="inspection-category">장비 종류</Label>
        <select id="inspection-category" className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={category} onChange={(event) => {
          setCategory(event.currentTarget.value as EquipmentCategory)
          setFormError(null)
        }}>
          {EQUIPMENT_CATEGORIES.map((value) => <option key={value} value={value}>{EQUIPMENT_CATEGORY_LABELS[value]}</option>)}
        </select>
      </div>

      <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">점검항목 목록</h2>
          <Button type="button" variant="outline" onClick={() => setItems((current) => [...current, emptyItem()])}>
            <Plus aria-hidden="true" />항목 추가
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">현재 목록이며, 위에서 아래 순서대로 정기점검 일지에 표시됩니다.</p>

        {items.map((item, itemIndex) => (
          <article key={itemIndex} className="flex flex-col gap-4 border-y py-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">항목 {itemIndex + 1}</h3>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label={`항목 ${itemIndex + 1} 위로`} title="위로 이동" disabled={itemIndex === 0} onClick={() => moveItem(itemIndex, -1)}>
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`항목 ${itemIndex + 1} 아래로`} title="아래로 이동" disabled={itemIndex === items.length - 1} onClick={() => moveItem(itemIndex, 1)}>
                  <ArrowDown aria-hidden="true" />
                </Button>
                {items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" aria-label={`점검사항 ${itemIndex + 1} 삭제`} onClick={() => {
                  setItems((current) => current.filter((_, index) => index !== itemIndex))
                }}>
                  <Trash2 aria-hidden="true" />
                </Button>
                )}
              </div>
            </div>
            <div className={`grid gap-4${isUps ? '' : ' md:grid-cols-2'}`}>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`inspection-item-${itemIndex}`}>{isFireSuppression ? '점검항목' : '점검사항'}</Label>
                <Input id={`inspection-item-${itemIndex}`} value={item.inspection_item} maxLength={255} onChange={(event) => updateItem(itemIndex, { inspection_item: event.currentTarget.value })} />
              </div>
              {!isUps && <div className="flex flex-col gap-2">
                <Label htmlFor={`inspection-standard-${itemIndex}`}>{isFireSuppression ? '점검사항' : '기준치'}</Label>
                <Input id={`inspection-standard-${itemIndex}`} value={item.standard} maxLength={2000} onChange={(event) => updateItem(itemIndex, { standard: event.currentTarget.value })} />
              </div>}
            </div>

            {isFireSuppression ? (
              <div className="flex flex-col gap-2 sm:max-w-sm">
                <Label>기타사항</Label>
                <p className="text-sm text-muted-foreground">점검자가 점검일지 작성 시 직접 입력합니다.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`input-template-${itemIndex}`}>{isUps ? '점검' : '점검자 입력 템플릿'}</Label>
                <textarea id={`input-template-${itemIndex}`} value={item.input_template} maxLength={2000} rows={3} placeholder={'예:\n1. {num} ~ {num} A\n2. 상태:{text}'} className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" onChange={(event) => updateItem(itemIndex, { input_template: event.currentTarget.value })} />
                <p className="text-xs text-muted-foreground">&#123;text&#125;는 글자 입력칸, &#123;num&#125;은 숫자 입력칸(숫자 키패드)입니다. 현재 입력칸 {countInputFields(item.input_template)}개</p>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:max-w-sm">
              <Label>{isFireSuppression ? '점검결과' : '결과'}</Label>
              <p className="text-sm text-muted-foreground">{INSPECTION_RESULT_OPTIONS.join(' · ')}</p>
            </div>
          </article>
        ))}

        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        <div>
          <Button type="submit" disabled={saveMutation.isPending}>
            <Save aria-hidden="true" />{saveMutation.isPending ? '저장 중…' : '목록 저장'}
          </Button>
        </div>
      </form>
      {templates.isPending && <p role="status">현재 점검항목 목록을 불러오는 중입니다.</p>}
      {templates.isError && <p role="alert" className="text-sm text-destructive">현재 점검항목 목록을 불러오지 못했습니다.</p>}
    </section>
  )
}

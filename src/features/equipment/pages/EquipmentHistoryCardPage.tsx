import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/feedback/LoadingState'
import { ApiError } from '@/lib/api/client'
import { EQUIPMENT_CATEGORY_LABELS, getEquipmentById, type Equipment, type EquipmentAttribute } from '../api/equipment'
import './equipment-history-card.css'

const breakerSlots = ['Main', 'Blower', 'Comp', 'Heater', 'Humi']
const magnetSlots = ['Blower', 'Comp', 'Fan', 'Heater', 'Humi']
const eocrSlots = ['Blower', 'Comp', 'Fan']

export function EquipmentHistoryCardPage() {
  const { equipmentId } = useParams()
  const query = useQuery({
    queryKey: ['equipment', 'detail', equipmentId],
    queryFn: () => getEquipmentById(equipmentId ?? ''),
    enabled: Boolean(equipmentId),
  })

  if (query.isPending) return <LoadingState message="장비이력카드를 불러오는 중입니다…" />
  if (query.isError || !query.data) {
    return <p role="alert" className="text-sm text-destructive">{query.error instanceof ApiError && query.error.status === 403 ? '조회 권한이 없습니다.' : '장비이력카드를 불러오지 못했습니다.'}</p>
  }

  const equipment = query.data

  return (
    <main className="history-print-page equipment-history-card mx-auto flex w-full max-w-5xl flex-col gap-3 text-slate-900">
      <div className="history-screen-only flex items-center justify-between gap-2">
        <Button asChild variant="outline"><Link to={`/equipment/${equipment.id}/edit`}><ArrowLeft aria-hidden="true" />장비로 돌아가기</Link></Button>
        <Button type="button" onClick={() => window.print()}><Printer aria-hidden="true" />장비이력카드 인쇄</Button>
      </div>
      <EquipmentHistoryCardDocument equipment={equipment} />
    </main>
  )
}

export function EquipmentHistoryCardDocument({ equipment, pageBreakBefore = false }: { equipment: Equipment; pageBreakBefore?: boolean }) {
  return (
      <article className={`history-print-sheet overflow-hidden border border-slate-300 bg-white${pageBreakBefore ? ' history-card-page-break' : ''}`}>
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b-2 border-slate-800 bg-slate-900 px-4 py-3 text-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-200">Equipment record</p>
            <h1 className="mt-1 text-xl font-bold">장비이력카드</h1>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">{equipment.equipment_code}</p>
            <p className="mt-1 text-slate-200">{EQUIPMENT_CATEGORY_LABELS[equipment.category]}</p>
          </div>
        </header>

        <section aria-labelledby="history-customer-heading" className="history-section border-b border-slate-300">
          <SectionHeading id="history-customer-heading" title="고객사 정보" />
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.6fr_1.3fr]">
            <InfoCell label="고객사명" value={equipment.organization_name} />
            <InfoCell label="담당자" value={equipment.organization_contact_name} />
            <InfoCell label="전화번호" value={equipment.organization_contact_phone} />
            <InfoCell label="주소" value={equipment.organization_address} />
          </div>
          <div className="grid grid-cols-1 border-t border-slate-200 sm:grid-cols-[1.3fr_1fr]">
            <InfoCell label="장비명" value={equipment.name} />
            <InfoCell label="설치 상태" value={getStatusLabel(equipment.status)} />
          </div>
          <div className="grid grid-cols-[78px_1fr] border-t border-slate-200">
            <div className="history-info-label">지도</div>
            <div className="flex min-h-24 items-center justify-center border-b border-slate-200 p-2 sm:min-h-28">
              {equipment.organization_map_image_url ? (
                <img src={equipment.organization_map_image_url} alt={`${equipment.organization_name ?? '고객사'} 지도`} className="history-map-image max-h-36 max-w-full object-contain" />
              ) : <span className="history-empty">-</span>}
            </div>
          </div>
        </section>

        <section aria-labelledby="history-equipment-heading" className="history-section border-b border-slate-300">
          <SectionHeading id="history-equipment-heading" title="장비 상세 사양" />
          {equipment.category === 'PRECISION_AIR_CONDITIONER'
            ? <PrecisionSpecifications attributes={equipment.attributes} />
            : <CompactSpecifications attributes={equipment.attributes} />}
          <div className="mt-2 grid grid-cols-[105px_1fr] border border-slate-200">
            <div className="history-info-label">특이사항</div>
            <div className="min-h-10 whitespace-pre-wrap p-2 text-xs">{equipment.specifics || '-'}</div>
          </div>
        </section>

        <section aria-labelledby="history-photos-heading" className="history-section border-b border-slate-300">
          <SectionHeading id="history-photos-heading" title="장비 사진" />
          {equipment.photos.length ? <div className="grid grid-cols-3 gap-2 p-2 sm:grid-cols-5">
            {equipment.photos.map((photo) => <img key={photo.id} src={photo.url} alt={`${equipment.name} 장비 사진`} className="history-photo aspect-square w-full object-cover" />)}
          </div> : <p className="px-3 py-2 text-xs text-slate-500">등록된 사진이 없습니다.</p>}
        </section>

        <section aria-labelledby="history-maintenance-heading" className="history-section">
          <SectionHeading id="history-maintenance-heading" title="유지보수 이력" />
          <table aria-label="유지보수 이력" className="history-maintenance-table w-full border-collapse text-left text-[10px]">
            <thead>
              <tr>
                <th>작업일자</th><th>작업구분</th><th>작업내용</th><th>작업자</th><th>교체부품</th><th>비고</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={6} className="py-3 text-center text-slate-500">등록된 유지보수 이력이 없습니다.</td></tr>
            </tbody>
          </table>
        </section>

        <footer className="border-t border-slate-300 px-3 py-2 text-right text-[9px] text-slate-500">
          출력일 {new Intl.DateTimeFormat('ko-KR').format(new Date())}
        </footer>
      </article>
  )
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return <h2 id={id} className="border-b border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800">{title}</h2>
}

function InfoCell({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="grid min-h-9 grid-cols-[78px_1fr] border-b border-r border-slate-200 last:border-r-0 sm:border-b-0">
    <div className="history-info-label">{label}</div>
    <div className="break-words p-2 text-[11px]">{value || '-'}</div>
  </div>
}

function PrecisionSpecifications({ attributes }: { attributes: EquipmentAttribute[] }) {
  const groupedLabels = new Set([
    ...breakerSlots.map((slot) => `차단기-${slot}`),
    ...magnetSlots.map((slot) => `마그네트-${slot}`),
    ...eocrSlots.map((slot) => `EOCR-${slot}`),
  ])
  const general = attributes.filter((attribute) => !groupedLabels.has(attribute.label))
  const groups = [
    { title: '차단기', prefix: '차단기-', slots: breakerSlots },
    { title: '마그네트', prefix: '마그네트-', slots: magnetSlots },
    { title: 'EOCR', prefix: 'EOCR-', slots: eocrSlots },
  ]

  return <div className="flex flex-col gap-2 p-2">
    {general.length > 0 && <div className="grid grid-cols-1 overflow-hidden border border-slate-200 sm:grid-cols-2 lg:grid-cols-3">
      {general.map((attribute) => <div key={attribute.id} className="grid min-h-8 grid-cols-[112px_1fr] border-b border-r border-slate-200">
        <div className="history-info-label">{attribute.label}</div>
        <div className="break-words p-1.5 text-[10px]">{attribute.value || '-'}</div>
      </div>)}
    </div>}
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {groups.map(({ title, prefix, slots }) => <table key={title} aria-label={`${title} 사양`} className="history-matrix w-full border-collapse text-left text-[10px]">
        <thead><tr><th colSpan={2}>{title}</th></tr></thead>
        <tbody>{slots.map((slot) => {
          const attribute = attributes.find((item) => item.label === `${prefix}${slot}`)
          return <tr key={slot}><th>{slot}</th><td>{attribute?.value || '-'}</td></tr>
        })}</tbody>
      </table>)}
    </div>
  </div>
}

function CompactSpecifications({ attributes }: { attributes: EquipmentAttribute[] }) {
  if (!attributes.length) return <p className="p-3 text-xs text-slate-500">등록된 사양이 없습니다.</p>
  return <dl className="grid grid-cols-1 p-2 sm:grid-cols-2 lg:grid-cols-3">
    {attributes.map((attribute) => <div key={attribute.id} className="grid min-h-8 grid-cols-[112px_1fr] border-b border-r border-slate-200">
      <dt className="history-info-label">{attribute.label}</dt>
      <dd className="break-words p-1.5 text-[10px]">{attribute.value || '-'}</dd>
    </div>)}
  </dl>
}

function getStatusLabel(status: Equipment['status']): string {
  return {
    ACTIVE: '사용 중',
    INSPECTION_REQUIRED: '점검 필요',
    OUT_OF_SERVICE: '사용 중지',
    DISPOSED: '폐기',
  }[status]
}
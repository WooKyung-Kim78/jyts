import type { Equipment } from '@/features/equipment/api/equipment'
import type { Inspection } from '@/features/inspections/api/inspections'

export type InspectionPeriod = { from: string; to: string; label: string }

export type MonthlyInspectionRow = {
  equipment: Equipment
  inspection: Inspection | null
  period: InspectionPeriod
}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

const pad = (value: number) => String(value).padStart(2, '0')

export function currentMonth(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function parseMonth(value: string | null): string | null {
  return value && MONTH_PATTERN.test(value) ? value : null
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = splitMonth(month)
  const date = new Date(year, monthNumber - 1 + delta, 1)
  return currentMonth(date)
}

export function splitMonth(month: string): [number, number] {
  const [, year = '1970', monthNumber = '01'] = MONTH_PATTERN.exec(month) ?? []
  return [Number(year), Number(monthNumber)]
}

function range(year: number, startMonth: number, endMonth: number): Pick<InspectionPeriod, 'from' | 'to'> {
  const lastDay = new Date(year, endMonth, 0).getDate()
  return { from: `${year}-${pad(startMonth)}-01`, to: `${year}-${pad(endMonth)}-${pad(lastDay)}` }
}

// Quarter and year periods follow the calendar (1~3월 분기, 1~12월 연간).
export function inspectionPeriod(cycle: Equipment['inspection_cycle'] | undefined, month: string): InspectionPeriod {
  const [year, monthNumber] = splitMonth(month)
  if (cycle === 'QUARTERLY') {
    const quarter = Math.ceil(monthNumber / 3)
    const start = (quarter - 1) * 3 + 1
    return { ...range(year, start, start + 2), label: `${quarter}분기 (${start}~${start + 2}월)` }
  }
  if (cycle === 'YEARLY') return { ...range(year, 1, 12), label: `${year}년` }
  return { ...range(year, monthNumber, monthNumber), label: `${monthNumber}월` }
}

function pickInspection(candidates: Inspection[]): Inspection | null {
  const byLatest = [...candidates].sort((a, b) => (b.inspected_on ?? '').localeCompare(a.inspected_on ?? ''))
  return byLatest.find((inspection) => inspection.status === 'COMPLETED') ?? byLatest[0] ?? null
}

export function buildMonthlyRows(equipment: Equipment[], inspections: Inspection[], month: string): MonthlyInspectionRow[] {
  const byEquipment = new Map<string, Inspection[]>()
  for (const inspection of inspections) {
    if (inspection.status === 'CANCELLED' || !inspection.inspected_on) continue
    byEquipment.set(inspection.equipment_id, [...(byEquipment.get(inspection.equipment_id) ?? []), inspection])
  }

  return equipment
    .filter((item) => item.status !== 'DISPOSED')
    .flatMap((item) => {
      const period = inspectionPeriod(item.inspection_cycle, month)
      const inspection = pickInspection((byEquipment.get(item.id) ?? [])
        .filter(({ inspected_on }) => inspected_on !== null && inspected_on >= period.from && inspected_on <= period.to))
      if (item.inspection_cycle === 'ON_REQUEST' && !inspection) return []
      return [{ equipment: item, inspection, period }]
    })
    .sort((a, b) => (a.equipment.organization_name ?? '').localeCompare(b.equipment.organization_name ?? '', 'ko')
      || a.equipment.category.localeCompare(b.equipment.category)
      || a.equipment.name.localeCompare(b.equipment.name, 'ko'))
}

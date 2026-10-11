import type { BadgeTone } from '@/components/ui/badge'
import type { Inspection } from './api/inspections'

export function inspectionStatusTone(inspection: Pick<Inspection, 'status' | 'emailed_at'>): BadgeTone {
  if (inspection.emailed_at) return 'info'
  if (inspection.status === 'COMPLETED') return 'success'
  if (inspection.status === 'DRAFT') return 'warning'
  return 'neutral'
}

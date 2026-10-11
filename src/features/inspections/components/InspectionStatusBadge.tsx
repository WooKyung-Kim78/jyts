import { Badge } from '@/components/ui/badge'
import { inspectionStatusLabel, type Inspection } from '../api/inspections'
import { inspectionStatusTone } from '../status'

export function InspectionStatusBadge({ inspection }: { inspection: Pick<Inspection, 'status' | 'emailed_at'> }) {
  return <Badge tone={inspectionStatusTone(inspection)}>{inspectionStatusLabel(inspection)}</Badge>
}
